# Model and system card

## Intended use

Assist a support analyst in finding and reading relevant demonstration runbook sections. The analyst reviews the source and follows approved procedures. The system is not an authority on an employer's policies, a live incident responder or an account recovery service.

## Components

| Component | Implementation | Training in this project |
| --- | --- | --- |
| Lexical retrieval | Word and character TF-IDF fitted on supplied corpus | Corpus statistics only |
| Neural retrieval | `paraphrase-multilingual-MiniLM-L12-v2`, 384-dimensional embeddings, CPU | Uses pretrained weights; no fine-tuning |
| Fusion | Reciprocal rank fusion with rank constant 60 | Fixed design |
| Evidence gate | Similarity and term-coverage thresholds | Heuristic; not calibrated |
| Default response | Exact source extract | No generative model |
| Optional draft | Ollama chat endpoint, default `qwen2.5:3b` | External pretrained model; not fine-tuned or benchmarked here |

Embedding revision: `e8f8c211226b894fcb81acc59f3b34ba3efd5f42`. The checkpoint's tokenizer and sequence length govern truncation; long custom chunks may lose trailing content during encoding. Character/word lexical retrieval still considers the full chunk. Model code loading disables `trust_remote_code`. Do not load an unreviewed model directory or change model/revision without a new evaluation.

## Data and evaluation

16 original runbooks, eight topics in two languages, 32 sections. Evaluation has 20 development cases, 24 held-out cases and four separate cross-language stress cases. Cases identify relevant documents, not gold answer sentences. The same author supplied sources and labels. There is no independent real-world validation. See `evaluation/DATASET.md` and `docs/EVALUATION.md`.

## Known failures

Both pipelines accepted two of six out-of-scope test questions. Returning a source is not sufficient proof that it answers the question. A default-administrator-password request can retrieve password-reset guidance; laptop-battery replacement can retrieve software/device request guidance. Neither source actually answers the question asked. These examples are retained as failures, not relabelled as successes.

The lexical pipeline fails the separate English-to-German stress set. Neural retrieval improves ranking but still misses intended top sources and often escalates. No claim of general bilingual parity is made. Questions mixing multiple issues, negation, product-specific error codes, outdated procedures and crafted source injection remain untested.

## Operational boundaries

One shared API key protects all API data in production. No per-user, per-document or tenant permissions exist. Do not index confidential or differently permissioned documents without adding authorization-aware retrieval. Hashes are pseudonymous and susceptible to dictionary guessing; they are not anonymization. Set a retention policy and protect database access.

Neither citation-ID validation nor the basic injection regex is an entailment or security guarantee. No automatic actions are available. A support analyst should check each source before making changes. Thresholds need calibration on independently labelled data before using output operationally.
