"""Opt-in integration check using real pretrained weights, not a model stub."""

import os
from dataclasses import replace

import pytest

from evidencedesk.config import Settings
from evidencedesk.retrieval import Retriever


@pytest.mark.skipif(
    os.getenv("RUN_NEURAL_TESTS") != "1",
    reason="Set RUN_NEURAL_TESTS=1 to load real pretrained weights",
)
def test_real_neural_embedding_and_citation():
    retriever = Retriever(replace(Settings.from_env(), backend="hybrid"))
    assert retriever.embeddings.shape == (32, 384)
    assert retriever.resolved_revision
    result = retriever.search("I lost the phone used for my authenticator", language="en")
    assert result[0].chunk.document == "mfa.en.md"
    assert result[0].semantic_score is not None
    assert retriever.sufficient(result[0])
