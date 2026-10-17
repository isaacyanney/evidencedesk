import argparse
import hashlib
import importlib.metadata
import json
import platform
import statistics
import time
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path

from .config import Settings
from .generation import obvious_injection
from .retrieval import Retriever


def evaluate(cases, retriever, mode):
    rows = []
    for case in cases:
        start = time.perf_counter()
        blocked = obvious_injection(case["question"])
        hits = (
            []
            if blocked
            else retriever.search(
                case["question"],
                k=len(retriever.chunks),
                language=case["source_language"],
                mode=mode,
            )
        )
        decision = (
            "blocked"
            if blocked
            else ("answer" if hits and retriever.sufficient(hits[0]) else "escalate")
        )
        relevant = set(case["relevant_documents"])
        # Deduplicate chunks from the same document for document-level ranking.
        ranked = list(dict.fromkeys(h.chunk.document for h in hits))
        rank = next((i for i, d in enumerate(ranked, 1) if d in relevant), None)
        rows.append(
            {
                "id": case["id"],
                "split": case["split"],
                "expected": case["expected_decision"],
                "actual": decision,
                "decision_correct": decision == case["expected_decision"],
                "top1_relevant": bool(ranked and ranked[0] in relevant),
                "recall_at_5": len(relevant & set(ranked[:5])) / len(relevant)
                if relevant
                else None,
                "reciprocal_rank": 1 / rank if rank and rank <= 5 else 0,
                "ranked_documents": ranked,
                "latency_ms": (time.perf_counter() - start) * 1000,
            }
        )
    report = {}
    for split in sorted({r["split"] for r in rows}):
        subset = [r for r in rows if r["split"] == split]
        answerable = [r for r in subset if r["expected"] == "answer"]
        oos = [r for r in subset if r["expected"] == "escalate"]
        latencies = sorted(r["latency_ms"] for r in subset)
        report[split] = {
            "cases": len(subset),
            "answerable_cases": len(answerable),
            "top1_document_accuracy": statistics.mean(r["top1_relevant"] for r in answerable)
            if answerable
            else None,
            "recall_at_5": statistics.mean(r["recall_at_5"] for r in answerable)
            if answerable
            else None,
            "mrr_at_5": statistics.mean(r["reciprocal_rank"] for r in answerable)
            if answerable
            else None,
            "decision_accuracy": statistics.mean(r["decision_correct"] for r in subset),
            "unsupported_answer_rate": sum(r["actual"] == "answer" for r in oos) / len(oos)
            if oos
            else None,
            "median_retrieval_ms": statistics.median(latencies),
            "p95_retrieval_ms": latencies[min(len(latencies) - 1, int(len(latencies) * 0.95))],
        }
    return {"metrics": report, "cases": rows}


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate retrieval and decision gates, not LLM truthfulness"
    )
    parser.add_argument("--cases", type=Path, default=Path("evaluation/cases.jsonl"))
    parser.add_argument("--output", type=Path, default=Path("evaluation/results.json"))
    parser.add_argument("--neural", action="store_true")
    parser.add_argument(
        "--require-baseline",
        action="store_true",
        help="CI regression gate on same-language test retrieval",
    )
    args = parser.parse_args()
    cases = [json.loads(line) for line in args.cases.read_text().splitlines() if line.strip()]
    settings = replace(Settings.from_env(), backend="hybrid" if args.neural else "lexical")
    retriever = Retriever(settings)
    modes = ["word", "lexical"] + (["hybrid"] if args.neural else [])
    results = {mode: evaluate(cases, retriever, mode) for mode in modes}
    output = {
        "generated_at": datetime.now(UTC).isoformat(),
        "dataset_sha256": hashlib.sha256(args.cases.read_bytes()).hexdigest(),
        "corpus_version": retriever.version,
        "model": settings.model if args.neural else None,
        "model_revision": retriever.resolved_revision if args.neural else None,
        "thresholds": {
            "lexical": settings.lexical_threshold,
            "neural": settings.neural_threshold,
            "min_term_coverage": 0.20,
        },
        "environment": {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "packages": {
                n: importlib.metadata.version(n)
                for n in (
                    ["numpy", "scikit-learn", "fastapi"]
                    + (["sentence-transformers", "torch"] if args.neural else [])
                )
            },
        },
        "scope": (
            "Curated demonstration retrieval and decision checks; "
            "not answer correctness or production evidence."
        ),
        "results": results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({mode: r["metrics"] for mode, r in results.items()}, indent=2))
    if args.require_baseline:
        metric = results["lexical"]["metrics"]["test"]
        if metric["top1_document_accuracy"] < 0.75 or metric["unsupported_answer_rate"] > 0.34:
            raise SystemExit("Baseline regression gate failed")


if __name__ == "__main__":
    main()
