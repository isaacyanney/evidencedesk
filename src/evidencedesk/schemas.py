"""Public inference contract; scores are not calibrated confidence probabilities."""

from typing import Literal

from pydantic import BaseModel, Field


class Evidence(BaseModel):
    id: str
    document: str
    title: str
    section: str
    language: Literal["en", "de"]
    text: str
    source_hash: str
    lexical_score: float
    semantic_score: float | None
    fusion_score: float
    term_coverage: float = Field(ge=0, le=1)


class QueryResult(BaseModel):
    request_id: str
    decision: Literal["answer", "escalate", "blocked"]
    answer: str
    citations: list[str]
    evidence: list[Evidence]
    backend: Literal["lexical", "hybrid"]
    generator: Literal["extractive", "ollama", "none"]
    fallback: str | None
    corpus_version: str
    latency_ms: float = Field(ge=0)
    score_note: str
