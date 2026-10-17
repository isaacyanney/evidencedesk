# Engineering walkthrough

## Five-minute demonstration

1. Start the baseline and open the workspace. Explain that TF-IDF is the reproducible reference and that no LLM is active.
2. Ask the VPN example. Open the cited section and point to the exact extract, file hash and request ID.
3. Ask the cake-recipe question. Show escalation because the corpus contains technical runbooks. Then inspect the payroll failure in the filter-sensitivity report.
4. Ask the German MFA example with German sources. The cited source stays in German.
5. Mark one answer useful and inspect Activity. Show the trace endpoint: metadata and a query hash, without raw question text.
6. Restart with hybrid retrieval. Explain pretrained multilingual embeddings, cosine similarity and reciprocal rank fusion. Run the evaluation command and compare the cross-language set.
7. Open the failure rows. Explain why a high similarity or existing citation can still accompany a wrong answer decision.

## Code worth explaining

- `corpus.py`: deterministic source identity and bounded section ingestion.
- `retrieval.py`: vectorizer fitting, normalized embeddings, ranking fusion and the gate.
- `generation.py`: prompt structure, response validation, timeout and extractive fallback.
- `main.py`: lifespan startup, request body middleware, auth, limits and concurrency.
- `storage.py`: per-operation connections, WAL, transactions and feedback upserts.
- `evaluate.py`: split separation, document ranking, unsupported-answer rate and per-case output.
- `tests/`: failure paths, auth, audit privacy, concurrency and a real pretrained-model check.

## Questions to prepare for

**Why no vector database?** The sample corpus has 32 chunks. Exact normalized matrix multiplication is simple and adequate at this size. A vector database would be appropriate after measuring corpus growth, filtering requirements and latency.

**Did you train the neural model?** No. This project uses pretrained multilingual weights and evaluates an engineered retrieval pipeline. TF-IDF learns corpus statistics; no fine-tuning was performed.

**Does a citation prove the answer is correct?** No. In extractive mode it proves where the returned text came from. In model mode the validator checks that referenced IDs exist. Relevance and entailment need separate evaluation.

**Why not describe the score as confidence?** Cosine similarity and fusion rank are retrieval signals. Neither is a calibrated probability that an answer is correct.

**What failed?** Out-of-scope questions can retrieve plausible but insufficient sections. Lexical retrieval struggles across languages. Hybrid fusion improves the small cross-language sample but does not solve it. Those failures remain visible.

**What would change for an employer?** Collect permissioned real sources, define access policy, independently label queries and expected evidence, calibrate refusal thresholds, evaluate generated claims, add user identity/retention, measure target-host resources and pass deployment checks. Do not claim these are already completed.

## Accurate portfolio description

“Built an evidence-first IT support retrieval service with a FastAPI backend, a browser interface, multilingual pretrained embeddings, lexical baselines, citation tracing, SQLite feedback, automated tests and container configuration. Evaluated retrieval and abstention on a documented demonstration dataset.”

Only claim live deployment or production use after those events actually occur. Be ready to run the project and explain every design decision.
