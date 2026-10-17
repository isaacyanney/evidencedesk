# Evaluation report

These are observed local results, not estimates or production performance claims. The baseline runtime and neural runtime package versions are embedded in their respective JSON artifacts. No threshold was adjusted after viewing the held-out outcomes.

## Held-out same-language test

24 cases: 16 answerable, six out of scope and two obvious injection patterns. Ranking metrics use relevant document IDs and the top five distinct documents, after ranking all corpus chunks. Decision accuracy includes escalation and blocking. It does not test whether generated answers are factually correct.

| Pipeline | Top-1 document | Recall@5 | MRR@5 | Decision accuracy | Unsupported answers | Median retrieval |
| --- | --- | --- | --- | --- | --- | --- |
| Word TF-IDF | 100.0% | 1.000 | 1.000 | 83.3% | 33.3% (2/6) | 1.49 ms |
| Word + character TF-IDF | 100.0% | 1.000 | 1.000 | 91.7% | 33.3% (2/6) | 1.64 ms |
| Neural + lexical RRF | 100.0% | 1.000 | 1.000 | 91.7% | 33.3% (2/6) | 11.98 ms |

The small corpus makes same-language retrieval easy. A perfect document ranking on 16 authored examples does not establish real support accuracy. Lexical and hybrid decision accuracy is 22/24 because both incorrectly answer two out-of-scope questions. The word-only gate also rejects two answerable questions. Timing excludes model loading, initial corpus encoding, drafting, HTTP overhead and database writes. It is a local measurement, not a service-level latency target.

## Separate cross-language stress set

Four English queries restricted to German sources. No threshold tuning uses this set.

| Pipeline | Top-1 document | Recall@5 | MRR@5 | Answers instead of escalation |
| --- | --- | --- | --- | --- |
| Lexical | 25.0% | 0.500 | 0.375 | 0.0% |
| Neural + lexical RRF | 50.0% | 1.000 | 0.708 | 25.0% |

Neural retrieval improves this tiny ranking sample but the fused top result and gate still miss most intended answers. No broad multilingual accuracy claim is justified.

## Failure analysis

- A laptop-battery replacement question retrieves a software request procedure. The source is genuine but insufficient.
- A default administrator password question retrieves password-reset guidance. The source does not supply or establish a default password.
- Browser verification found that the unsupported payroll-date question escalates with all sources but passes the gate when filtered to English. Corpus filtering changes both ranking and the selected hit. This observation did not lead to threshold tuning.

The last finding prompted a post hoc diagnostic dataset, `filter-stress.jsonl`: three known unsupported questions under all/English/German filters. It is separate from the held-out set and is not an independent benchmark. Its per-case results are saved in `filter-results.json`.

The diagnostic lexical run accepts 4/9 unsupported combinations (44.4%). This is a concrete reason to calibrate a stronger evidence policy on independent data before operational use.

## Reproduce

```bash
python -m evidencedesk.evaluate --require-baseline
OMP_NUM_THREADS=2 python -m evidencedesk.evaluate --neural --output evaluation/neural-results.json
python -m evidencedesk.evaluate --cases evaluation/filter-stress.jsonl --output evaluation/filter-results.json
```

The baseline CI gate is a regression floor: same-language test Top-1 must stay at least 0.75 and unsupported-answer rate must not exceed 0.34. That gate tolerates the known initial failures and must not be interpreted as a production acceptance criterion. Neural results are deliberately not claimed to outperform lexical retrieval on this easy same-language sample.

Corpus SHA-256: `145bfeed5f079cf6053fe25bf0ce901f96cbb0c96c939922c2b1d7fd9e8d5b06`.
Embedding revision: `e8f8c211226b894fcb81acc59f3b34ba3efd5f42`.

Full per-case results: `evaluation/results.json`, `evaluation/neural-results.json`, `evaluation/filter-results.json`.
