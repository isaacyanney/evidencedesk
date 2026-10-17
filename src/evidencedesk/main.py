import hmac
import logging
import threading
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from . import __version__
from .config import ROOT, Settings
from .schemas import QueryResult
from .service import EvidenceService
from .storage import Store

log = logging.getLogger("evidencedesk")
MAX_BODY = 16384


class BodyLimit:
    """Bound actual streamed bytes, including requests without Content-Length."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        try:
            declared = int(headers.get(b"content-length", b"0"))
        except ValueError:
            return await JSONResponse({"detail": "Invalid Content-Length"}, 400)(
                scope, receive, send
            )
        if declared < 0 or declared > MAX_BODY:
            return await JSONResponse({"detail": "Request body too large"}, 413)(
                scope, receive, send
            )
        # Buffer a bounded body before handing control to the application.
        messages, total = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            total += len(message.get("body", b""))
            if total > MAX_BODY:
                return await JSONResponse({"detail": "Request body too large"}, 413)(
                    scope, receive, send
                )
            messages.append(message)
            if not message.get("more_body", False):
                break

        async def replay():
            return messages.pop(0) if messages else await receive()

        await self.app(scope, replay, send)


class Query(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    language: Literal["en", "de"] = "en"
    source_language: Literal["all", "en", "de"] = "all"

    @field_validator("question")
    @classmethod
    def clean(cls, value):
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Enter a question of at least three characters")
        return value


class Feedback(BaseModel):
    request_id: str = Field(pattern=r"^[0-9a-f-]{36}$")
    helpful: bool
    reason: Literal["useful", "wrong_source", "incomplete", "unnecessary_escalation", "other"] = (
        "other"
    )


class RateLimiter:
    def __init__(self, limit):
        self.limit = limit
        self.windows = defaultdict(deque)
        self.lock = threading.Lock()

    def allow(self, key):
        now = time.monotonic()
        with self.lock:
            # Bound memory even if the server sees many distinct clients.
            if len(self.windows) >= 10000:
                self.windows = defaultdict(
                    deque, {k: v for k, v in self.windows.items() if v and v[-1] > now - 60}
                )
                if key not in self.windows and len(self.windows) >= 10000:
                    return False
            window = self.windows[key]
            while window and window[0] <= now - 60:
                window.popleft()
            if len(window) >= self.limit:
                return False
            window.append(now)
            return True


def create_app(settings: Settings | None = None):
    settings = settings or Settings.from_env()
    settings.validate()
    limiter = RateLimiter(settings.rate_limit)
    slots = threading.BoundedSemaphore(settings.max_concurrent)

    @asynccontextmanager
    async def lifespan(app):
        app.state.service = EvidenceService(settings)
        app.state.store = Store(settings.database)
        yield

    app = FastAPI(
        title="EvidenceDesk",
        version=__version__,
        lifespan=lifespan,
        docs_url="/docs" if settings.environment == "development" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.environment == "development" else None,
    )
    app.add_middleware(BodyLimit)

    @app.middleware("http")
    async def headers(request, call_next):
        response = await call_next(request)
        response.headers.update(
            {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
                "Referrer-Policy": "no-referrer",
                "Cache-Control": "no-store",
                "Content-Security-Policy": (
                    "default-src 'self'; script-src 'self'; style-src 'self'; "
                    "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; "
                    "base-uri 'none'; form-action 'self'"
                ),
            }
        )
        return response

    def authorized(request: Request):
        supplied = request.headers.get("X-API-Key", "")
        if settings.api_key and not hmac.compare_digest(
            supplied.encode(), settings.api_key.encode()
        ):
            raise HTTPException(401, "Valid X-API-Key required")
        # The peer address is authoritative. Forwarded headers require an explicitly trusted proxy.
        peer = request.client.host if request.client else "local"
        if not limiter.allow(peer):
            raise HTTPException(429, "Rate limit reached", headers={"Retry-After": "60"})

    @app.get("/health/live")
    def live():
        return {"status": "alive", "version": __version__}

    @app.get("/health/ready")
    def ready(request: Request):
        try:
            with request.app.state.store.connect() as db:
                db.execute("SELECT 1")
        except Exception:
            return JSONResponse({"status": "not_ready"}, 503)
        return {
            "status": "ready",
            "backend": settings.backend,
            "generator": settings.generator,
            "chunks": len(request.app.state.service.retriever.chunks),
            "corpus_version": request.app.state.service.retriever.version,
        }

    @app.post("/api/query", dependencies=[Depends(authorized)], response_model=QueryResult)
    def query(body: Query, request: Request):
        if not slots.acquire(blocking=False):
            raise HTTPException(503, "Inference capacity reached", headers={"Retry-After": "2"})
        try:
            result = request.app.state.service.answer(
                body.question, body.language, body.source_language
            )
            request.app.state.store.record(result, body.question)
            log.info(
                "query_completed id=%s decision=%s latency_ms=%s",
                result["request_id"],
                result["decision"],
                result["latency_ms"],
            )
            return result
        finally:
            slots.release()

    @app.get("/api/corpus", dependencies=[Depends(authorized)])
    def corpus(request: Request):
        retriever = request.app.state.service.retriever
        docs = {}
        for c in retriever.chunks:
            docs.setdefault(
                c.document,
                {
                    "document": c.document,
                    "title": c.title,
                    "language": c.language,
                    "source_hash": c.source_hash,
                    "sections": 0,
                },
            )
            docs[c.document]["sections"] += 1
        return {
            "version": retriever.version,
            "documents": list(docs.values()),
            "chunks": len(retriever.chunks),
        }

    @app.get("/api/traces/{request_id}", dependencies=[Depends(authorized)])
    def trace(request_id: str, request: Request):
        result = request.app.state.store.trace(request_id)
        if result is None:
            raise HTTPException(404, "Trace not found")
        return result

    @app.get("/api/stats", dependencies=[Depends(authorized)])
    def stats(request: Request):
        return request.app.state.store.stats()

    @app.post("/api/feedback", dependencies=[Depends(authorized)])
    def feedback(body: Feedback, request: Request):
        if not request.app.state.store.feedback(body.request_id, body.helpful, body.reason):
            raise HTTPException(404, "Trace not found")
        return {"status": "recorded"}

    app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")

    @app.get("/", include_in_schema=False)
    def index():
        return FileResponse(ROOT / "static" / "index.html")

    return app


app = create_app()
