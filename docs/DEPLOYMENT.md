# Deployment guide

## Supported scope

One small Linux host, one Uvicorn worker, CPU inference and a persistent local SQLite volume. The baseline is designed for roughly 1 GiB RAM and the neural overlay budgets 3 GiB; these are Compose limits, not measured capacity guarantees. Latency, model startup time and host requirements must be checked on the target machine. Docker execution was not available during development.

## Local container

1. Install Docker Engine and the Compose plugin on the target.
2. Copy `.env.example` to `.env` and set a random `API_KEY` of at least 32 characters. Keep `.env` out of git.
3. Run `docker compose up --build -d`.
4. Check `docker compose ps` and `docker compose logs --tail=50`.
5. Check `curl -f http://127.0.0.1:8000/health/ready`.
6. Open the workspace, enter the key and query the example VPN question. Confirm that a source is cited and a trace is recorded.

The runtime is non-root, capabilities are dropped, the root filesystem is read-only and only `/app/var` and a small temporary filesystem are writable. The named audit volume persists through container replacement. A startup failure for a missing/short production key is intentional.

## Neural overlay

Set `EMBEDDING_REVISION=e8f8c211226b894fcb81acc59f3b34ba3efd5f42` in `.env`, then:

```bash
docker compose -f compose.yaml -f compose.neural.yaml up --build -d
```

The neural target installs CPU-only PyTorch, then Sentence Transformers. It needs outbound access for the first checkpoint download. The model cache volume must be writable by UID 10001. If the container runtime creates a root-owned cache volume, initialize it with ownership UID/GID 10001 before startup. Check model readiness before accepting requests; allow up to five minutes on first boot. To run without network afterward, set `MODEL_LOCAL_ONLY=true` once the cache is populated.

The baseline runtime is pinned in `requirements.lock`; optional neural transitive dependencies are not fully locked. Record `pip freeze`, the resolved model revision and evaluation artifact for a release. The manual neural workflow publishes an evaluation artifact and tests actual weights.

## Optional Ollama

The host needs enough memory for its chosen model in addition to EvidenceDesk. Never expose an unauthenticated Ollama port to the internet. Container loopback refers to the container, not the host: configure `OLLAMA_URL` to a trusted internal Ollama service and allow that service to accept the container's connection. The supplied Compose file intentionally has no generative backend and no model-server exposure. Ollama connection and generation errors fall back to an extract. This optional integration has contract tests, not a locally measured generation benchmark.

## Public access

Keep port 8000 on loopback. Put an HTTPS reverse proxy and organization access control in front of it; use the service key as an additional boundary. Do not paste a key into a publicly visible demo. The browser keeps the key only in tab memory. This is not a replacement for SSO or user sessions. Serve only the public demonstration corpus unless all authorized users may access every indexed section and trace.

Uvicorn starts with `--no-proxy-headers`: rate limiting uses the actual TCP peer. Behind a reverse proxy all requests may share that peer and quota. Add proxy-level rate limiting, or configure forwarded headers with an explicit trusted proxy allowlist. Do not trust arbitrary `X-Forwarded-For` headers. Add proxy body/connection/time limits and TLS/HSTS at the edge. Multiple app workers or hosts require shared rate limiting, state storage and index release coordination.

## Environment

| Name | Default | Purpose |
| --- | --- | --- |
| `APP_ENV` | `development` locally; `production` in Docker | Production requires a long key and disables API docs |
| `API_KEY` | Empty locally | Shared `X-API-Key` secret |
| `CORPUS_DIR` | Packaged runbooks | Trusted local Markdown directory |
| `DATABASE_PATH` | `var/evidencedesk.sqlite3` | Persistent audit store |
| `RETRIEVAL_BACKEND` | `lexical` | `lexical` or `hybrid` |
| `EMBEDDING_MODEL` | Multilingual MiniLM above | Model name or trusted local directory |
| `EMBEDDING_REVISION` | Pinned model commit above | Update with model ID when switching checkpoints |
| `MODEL_LOCAL_ONLY` | `false` | Disallow model download |
| `GENERATOR` | `extractive` | `extractive` or `ollama` |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Trusted local drafting server |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Drafting model |
| `LEXICAL_THRESHOLD` | `0.12` | Heuristic lexical gate |
| `NEURAL_THRESHOLD` | `0.48` | Heuristic semantic gate |
| `RATE_LIMIT_PER_MINUTE` | `30` | Protected calls per peer per process |
| `MAX_CONCURRENT` | `4` | Concurrent in-flight inference requests |

Changing a threshold changes the decision policy. Re-evaluate, save results and version the release before deploying.

## Corpus updates, backup and rollback

Validate a new corpus with `CORPUS_DIR=/path/to/runbooks python -m evidencedesk.cli`. Run the full evaluation against it. Include the matching snapshot and source files in the release, then restart. Old traces retain the previous snapshot hash but not old source text, so archive each source release if historical reconstruction is needed.

Back up SQLite with its online backup API rather than copying a live database without its WAL:

```bash
docker compose exec evidencedesk python -c "import sqlite3; s=sqlite3.connect('/app/var/evidencedesk.sqlite3'); d=sqlite3.connect('/app/var/backup.sqlite3'); s.backup(d); d.close(); s.close()"
```

Copy the backup out of the audit volume and protect it with host-level permissions/encryption. Set and test an audit retention schedule; no automated expiry is implemented. Rotate `API_KEY` by updating `.env` and recreating the service. Roll back by restoring the prior image and corpus snapshot; the current schema has no migrations. Take a verified backup before any future schema change.

## Release gate

Before calling a public release deployed: pass CI (including the Docker job), smoke-test the target URL with authentication, verify HTTPS and edge access controls, test volume persistence over restart, inspect resource use, confirm the model cache, and record an actual deployment URL. The repository does not claim these checks have happened without evidence.
