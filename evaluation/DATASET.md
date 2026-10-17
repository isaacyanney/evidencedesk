# Evaluation dataset

48 hand-authored queries against 16 original demonstration runbooks (32 sections), in English and German. The runbooks and questions are authored for this repository and released under its MIT license. No customer tickets, personal records or proprietary company procedures are included.

`dev`: 20 cases for selecting gates. `test`: 24 held-out cases, including 16 answerable questions, six out-of-scope questions and two obvious injection attempts. `cross_language`: four English questions restricted to German sources, reported separately. Labels identify relevant documents, not paragraph-level relevance or answer correctness.

The author wrote the runbooks and labels. This is a small curated engineering smoke test, not an independent industry benchmark. Test cases must not be used to tune thresholds. Scores do not establish production accuracy, multilingual parity or robustness against sophisticated attacks. Add independently labelled real data before operational use.
