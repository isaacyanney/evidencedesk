import time
import uuid

from .config import Settings
from .generation import draft, obvious_injection
from .retrieval import Retriever


class EvidenceService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.retriever = Retriever(settings)

    def answer(self, question: str, language: str = "en", source_language: str = "all"):
        start = time.perf_counter()
        blocked = obvious_injection(question)
        hits = [] if blocked else self.retriever.search(question, language=source_language)
        sufficient = bool(hits) and self.retriever.sufficient(hits[0])
        fallback = None
        citations = []
        generator = "none"
        if blocked:
            decision = "blocked"
            answer = (
                "Diese Anfrage kann nicht verarbeitet werden."
                if language == "de"
                else "This request cannot be processed."
            )
        elif not sufficient:
            decision = "escalate"
            answer = (
                (
                    "Die Runbooks enthalten dafür keine ausreichenden Belege. "
                    "Bitte an den zuständigen IT-Support weitergeben."
                )
                if language == "de"
                else (
                    "The runbooks do not provide enough evidence. "
                    "Escalate this question to the responsible IT support team."
                )
            )
        else:
            # Only individually supported chunks can be sent to the drafting model.
            supported = [h for h in hits if self.retriever.sufficient(h)]
            answer, citations, generator, fallback = draft(
                self.settings, question, supported, language
            )
            decision = "answer"
        return {
            "request_id": str(uuid.uuid4()),
            "decision": decision,
            "answer": answer,
            "citations": citations,
            "evidence": [h.public() for h in hits],
            "backend": self.settings.backend,
            "generator": generator,
            "fallback": fallback,
            "corpus_version": self.retriever.version,
            "latency_ms": round((time.perf_counter() - start) * 1000, 2),
            "score_note": (
                "Retrieval scores are similarity signals, not probabilities of correctness."
            ),
        }
