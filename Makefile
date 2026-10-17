.PHONY: install run test lint evaluate
install:
	python -m pip install -e ".[dev]"
run:
	python -m uvicorn evidencedesk.main:app --host 127.0.0.1 --port 8000
test:
	python -m pytest -q
lint:
	python -m ruff check src tests
	python -m ruff format --check src tests
evaluate:
	python -m evidencedesk.evaluate --require-baseline
