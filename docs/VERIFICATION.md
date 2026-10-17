# Verification record

Recorded 17 October 2026. These checks were executed locally. CI configuration is included, but no GitHub Actions run or Docker deployment is claimed.

| Check | Observed result |
| --- | --- |
| Python 3.12 behavioral suite with real pretrained weights enabled | 20 passed |
| Clean Python 3.11 environment with pinned baseline runtime | 19 passed; neural test skipped by design |
| Ruff lint and format checks | Passed |
| Wheel and source distribution build | Passed |
| Wheel resource inspection | All 16 runbooks and all three frontend files present |
| Clean installed-wheel production startup | Passed from site-packages, outside source checkout |
| Installed-wheel auth and VPN query | Missing key rejected; authenticated source-cited answer returned |
| Real browser smoke checks | Query, escalation, feedback, corpus/activity views and 390 px mobile overflow check passed |
| Visual review | Desktop workspace and mobile result inspected |
| Baseline evaluation | Executed; aggregate and individual results included |
| Neural evaluation | Executed with actual 384-dimensional pretrained embeddings on CPU |
| Post hoc source-filter diagnostic | Executed separately; failures retained |
| Compose and workflow YAML parsing | Passed syntax parsing; not Docker semantic validation |
| Docker build/run | Not executed: Docker is unavailable in this environment |
| Real Ollama drafting | Not executed: no Ollama service was available; HTTP contract and failure paths tested with mocks |
| External hosting / GitHub Actions | Not executed; no deployment URL or CI success badge claimed |

The test client emits a dependency deprecation warning about a future HTTP client transition. It does not fail the current checked versions. Optional model dependencies and the model cache require validation on the deployment host. The baseline runtime is pinned in `requirements.lock`; optional neural dependencies are version-ranged and the actual evaluated versions are recorded in the neural JSON artifact.

Source extraction does not establish relevance. Evaluation shows unsupported answer decisions and limited cross-language performance; see `EVALUATION.md`. A configured deployment package is not evidence of production accuracy, scale or live operation.
