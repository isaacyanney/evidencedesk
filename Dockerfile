FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --create-home app
COPY requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock
COPY pyproject.toml README.md LICENSE ./
COPY src ./src
RUN pip install --no-deps . && mkdir -p /app/var && chown -R app:app /app/var
USER app
ENV DATABASE_PATH=/app/var/evidencedesk.sqlite3 APP_ENV=production
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready', timeout=3)"]
CMD ["python", "-m", "uvicorn", "evidencedesk.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-proxy-headers", "--timeout-keep-alive", "5", "--limit-concurrency", "32"]

FROM base AS neural
USER root
# Install CPU-only PyTorch first to avoid shipping GPU runtime libraries.
RUN pip install --no-cache-dir torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir 'sentence-transformers>=6.1,<7'
RUN mkdir -p /home/app/.cache/huggingface && chown -R app:app /home/app/.cache
USER app
ENV RETRIEVAL_BACKEND=hybrid HF_HOME=/home/app/.cache/huggingface
