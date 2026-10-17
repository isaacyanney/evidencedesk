# EvidenceDesk

**A bilingual IT support assistant that makes its evidence inspectable.**

EvidenceDesk retrieves technical runbook sections, checks whether the match clears a configurable evidence gate, and returns a source extract or an optional locally generated draft. When it finds too little support, it asks for escalation. Every completed query gets a request ID and a source snapshot hash.

This is an independent AI engineering portfolio project by Isaac Yanney. It combines language AI with a practical support workflow: VPN, MFA recovery, printers, phishing, meeting rooms, Wi-Fi, passwords and software requests. It has no access to live corporate systems and performs no administrative actions.

## What is implemented

- **Real pretrained neural retrieval:** a multilingual Sentence Transformer produces 384-dimensional CPU embeddings. Reciprocal rank fusion combines semantic and lexical rankings. Weights are loaded from a pinned Hugging Face revision; the neural integration test uses the actual model.
- **Offline baseline:** weighted word and character TF-IDF retrieval runs without model downloads or API credentials. The interface labels this mode explicitly.
- **Evidence-first responses:** extractive mode quotes the retrieved text exactly. Optional Ollama drafting receives supported sections and must return valid source IDs; invalid or unavailable output falls back to an extract.
- **Usable web interface:** source inspection, English/German filters, API-key access, knowledge library, feedback and activity counters. Served by the API with no frontend build step.
- **Evaluation:** 48 authored queries with separate development, held-out and cross-language sets; word-only, lexical and neural comparisons; individual failures are saved with aggregate metrics.
- **API engineering:** lifespan model loading, bounded inference concurrency, input and streaming body limits, API-key protection, rate limiting, health checks and structured logs.
- **Persistence:** SQLite WAL stores completed-query traces and current feedback votes. Raw questions and answers are not stored in the audit database.
- **Packaging:** installable wheel, pinned baseline runtime dependencies, non-root Docker targets, Compose persistence and GitHub Actions workflows.

## Start locally

Requires Python 3.11 or 3.12. The default mode needs no model or paid service.

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.lock
python -m pip install -e ".[dev]"
python -m uvicorn evidencedesk.main:app --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000** for the workspace or **http://127.0.0.1:8000/docs** for the development API. On Windows, activate with `.venv\Scripts\activate` and use the same Python commands. Local development is unauthenticated unless `API_KEY` is set; bind to loopback.

Try “My VPN will not connect but websites load”, “Ich habe mein MFA Handy verloren”, or “Write me a chocolate cake recipe”. The last question should escalate.

## Enable neural retrieval

```bash
# Optional: install CPU-only PyTorch before the neural extra on Linux.
python -m pip install torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu
python -m pip install -e ".[neural]"
RETRIEVAL_BACKEND=hybrid OMP_NUM_THREADS=2 TOKENIZERS_PARALLELISM=false \
  python -m uvicorn evidencedesk.main:app --host 127.0.0.1 --port 8000
```

The default model is `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, pinned to revision `e8f8c211226b894fcb81acc59f3b34ba3efd5f42`. First startup downloads pretrained weights; subsequent starts can use `MODEL_LOCAL_ONLY=true`. Hybrid mode fails startup if weights or dependencies are missing. It never silently switches to the lexical baseline. On Apple Silicon, use the normal PyTorch installation supported by your platform; retrieval deliberately uses CPU.

## Optional local language-model drafting

Install and run [Ollama](https://docs.ollama.com/quickstart), pull a suitable model, then start the API with:

```bash
ollama pull qwen2.5:3b
GENERATOR=ollama OLLAMA_MODEL=qwen2.5:3b \
  python -m uvicorn evidencedesk.main:app --host 127.0.0.1 --port 8000
```

`OLLAMA_URL` defaults to `http://127.0.0.1:11434`. Questions and retrieved excerpts are sent to this configured service. Allow 45 seconds for generation; failures return a labelled source extract. Citation validation checks that IDs exist in the supplied evidence, **not that generated claims are entailed**. Real Ollama inference was not available in the development environment; adapter behavior is covered with HTTP mocks. Extractive and real neural retrieval were executed locally.

## Verify

```bash
python -m pytest -q
python -m ruff check src tests
python -m ruff format --check src tests
python -m evidencedesk.evaluate --require-baseline
OMP_NUM_THREADS=2 python -m evidencedesk.evaluate --neural --output evaluation/neural-results.json
RUN_NEURAL_TESTS=1 OMP_NUM_THREADS=2 python -m pytest tests/test_neural.py -q
python -m build
```

The default suite has 19 tests plus one opt-in neural integration test. Browser checks cover a real query, escalation, feedback, knowledge/activity views and mobile overflow:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
# Run while the API is running; screenshots go to docs/.
node scripts/browser-test.cjs
```

See [the verification record](docs/VERIFICATION.md) for checks actually executed and [evaluation results](docs/EVALUATION.md) for measured outcomes. The small curated test set is not evidence of production accuracy. Both evaluated pipelines answered two of six out-of-scope test questions; this failure is preserved in the report.

## Deploy

```bash
cp .env.example .env
# Generate a random key and put it in .env as API_KEY=...
python -c "import secrets; print(secrets.token_urlsafe(32))"
docker compose up --build -d
```

Open `http://127.0.0.1:8000` and enter the key in Workspace access. Compose binds only to loopback. Before exposing it, place it behind HTTPS and organization access control. This is a single-instance deployment with one shared service key, not a multitenant identity system. Docker was not available for local execution; CI includes the pending container build and authenticated smoke test.

Full configuration, neural deployment, backups and rollback: [deployment guide](docs/DEPLOYMENT.md).

## API

| Endpoint | Purpose | API key when configured |
| --- | --- | --- |
| `GET /health/live` | Process liveness | No |
| `GET /health/ready` | Loaded corpus and database check | No |
| `POST /api/query` | Retrieve and answer or escalate | Yes |
| `GET /api/corpus` | Runbook manifest and hashes | Yes |
| `GET /api/traces/{request_id}` | Completed request metadata | Yes |
| `POST /api/feedback` | Create/update a request feedback vote | Yes |
| `GET /api/stats` | Aggregate local activity | Yes |

```bash
curl -s http://127.0.0.1:8000/api/query \
  -H 'Content-Type: application/json' \
  -d '{"question":"Printer offline and print job stuck","source_language":"en","language":"en"}'
```

For protected instances add `-H "X-API-Key: $API_KEY"`. `language` selects model-draft or escalation language; extractive answers keep their source language. `source_language` filters retrieved documents. All-sources search can therefore return an extract in either language.

## Repository map

| Path | Contents |
| --- | --- |
| `src/evidencedesk/` | API, ingestion, retrieval, generation, persistence, evaluation CLI |
| `src/evidencedesk/static/` | Browser workspace |
| `src/evidencedesk/data/runbooks/` | 16 original demonstration runbooks |
| `evaluation/` | Dataset, per-case and aggregate results |
| `tests/` | Behavioral and integration checks |
| `docs/` | Architecture, evaluation, model card, deployment and verification |
| `.github/workflows/` | Baseline CI, container smoke test, opt-in neural evaluation |

Read [architecture](docs/ARCHITECTURE.md), [model card](docs/MODEL_CARD.md), [security boundaries](SECURITY.md), and [engineering walkthrough](docs/WALKTHROUGH.md).

## Current boundaries

Similarity gates are heuristics, not calibrated confidence estimates. The obvious-injection pattern catches a few forms only. There is no semantic entailment verifier, user-level authorization, live document upload, automated remediation, enterprise-scale vector store or production deployment claim. The corpus fits in memory and rebuilds at startup. Neural and LLM dependencies require their own platform checks. A useful next step is independently labelled support data, followed by evidence-gate calibration and sentence-level relevance labels.

## References and licensing

Original code, runbooks and evaluation questions: MIT. Pretrained model weights retain their own license; see the [model card](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2). Retrieval uses the documented [query/document encoding API](https://www.sbert.net/examples/sentence_transformer/applications/semantic-search/README.html). FastAPI [deployment guidance](https://fastapi.tiangolo.com/deployment/docker/) informs the single-process container design. No credentials, personal documents or employer records are included.
