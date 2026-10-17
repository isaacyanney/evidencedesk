import hashlib
import json
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path


class Store:
    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript("""
                CREATE TABLE IF NOT EXISTS traces (
                    id TEXT PRIMARY KEY, created REAL NOT NULL, query_hash TEXT NOT NULL,
                    decision TEXT NOT NULL, latency REAL NOT NULL, backend TEXT NOT NULL,
                    generator TEXT NOT NULL, corpus_version TEXT NOT NULL, evidence TEXT NOT NULL,
                    fallback TEXT
                );
                CREATE TABLE IF NOT EXISTS feedback (
                    trace_id TEXT PRIMARY KEY REFERENCES traces(id), helpful INTEGER NOT NULL,
                    reason TEXT NOT NULL, created REAL NOT NULL
                );
            """)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def record(self, result, question):
        with self.connect() as db:
            db.execute(
                "INSERT INTO traces VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    result["request_id"],
                    time.time(),
                    hashlib.sha256(question.encode()).hexdigest(),
                    result["decision"],
                    result["latency_ms"],
                    result["backend"],
                    result["generator"],
                    result["corpus_version"],
                    json.dumps([h["id"] for h in result["evidence"]]),
                    result["fallback"],
                ),
            )

    def trace(self, trace_id):
        with self.connect() as db:
            row = db.execute("SELECT * FROM traces WHERE id=?", (trace_id,)).fetchone()
        if row is None:
            return None
        out = dict(row)
        out["evidence"] = json.loads(out["evidence"])
        return out

    def feedback(self, trace_id, helpful, reason):
        with self.connect() as db:
            if db.execute("SELECT id FROM traces WHERE id=?", (trace_id,)).fetchone() is None:
                return False
            db.execute(
                """INSERT INTO feedback VALUES (?,?,?,?) ON CONFLICT(trace_id)
                       DO UPDATE SET helpful=excluded.helpful, reason=excluded.reason,
                       created=excluded.created""",
                (trace_id, int(helpful), reason, time.time()),
            )
        return True

    def stats(self):
        with self.connect() as db:
            rows = db.execute(
                "SELECT decision, COUNT(*) AS n FROM traces GROUP BY decision"
            ).fetchall()
            feedback = db.execute(
                "SELECT COUNT(*) AS n, AVG(helpful) AS helpful FROM feedback"
            ).fetchone()
        return {
            "requests": sum(r["n"] for r in rows),
            "decisions": {r["decision"]: r["n"] for r in rows},
            "feedback_count": feedback["n"],
            "helpful_fraction": feedback["helpful"],
        }
