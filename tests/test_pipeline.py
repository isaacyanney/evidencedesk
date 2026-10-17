import json
from dataclasses import replace
from unittest.mock import patch

import httpx
import pytest

from evidencedesk.config import Settings
from evidencedesk.corpus import load_corpus
from evidencedesk.generation import draft
from evidencedesk.retrieval import Retriever


def test_source_change_invalidates_citation_ids(tmp_path):
    path = tmp_path / "test.en.md"
    path.write_text("# Title\n\n## Section\n\nVPN connection check.")
    first, v1 = load_corpus(tmp_path)
    path.write_text(path.read_text() + " Updated.")
    second, v2 = load_corpus(tmp_path)
    assert v1 != v2 and first[0].id != second[0].id
    assert load_corpus(tmp_path)[1] == v2


def test_empty_corpus_fails_loudly(tmp_path):
    with pytest.raises(ValueError, match="no Markdown"):
        load_corpus(tmp_path)


def test_invalid_production_config():
    with pytest.raises(ValueError, match="API_KEY"):
        replace(Settings(), environment="production").validate()
    with pytest.raises(ValueError, match="lexical or hybrid"):
        replace(Settings(), backend="fake").validate()


def test_hybrid_cannot_silently_fall_back(settings):
    retriever = Retriever(settings)
    with pytest.raises(ValueError, match="loaded embedding model"):
        retriever.search("VPN", mode="hybrid")


def test_ollama_bad_citation_falls_back_to_extract(settings):
    hits = Retriever(settings).search("VPN connection unavailable", language="en")
    response = httpx.Response(
        200,
        request=httpx.Request("POST", "http://localhost/api/chat"),
        json={"message": {"content": json.dumps({"answer": "Made up", "citations": ["invented"]})}},
    )
    with patch("evidencedesk.generation.httpx.Client.post", return_value=response):
        answer, ids, mode, fallback = draft(
            replace(settings, generator="ollama"), "VPN", hits, "en"
        )
    assert answer == hits[0].chunk.text and ids == [hits[0].chunk.id]
    assert mode == "extractive" and fallback


def test_ollama_timeout_falls_back(settings):
    hits = Retriever(settings).search("VPN connection unavailable")
    with patch(
        "evidencedesk.generation.httpx.Client.post", side_effect=httpx.ReadTimeout("timeout")
    ):
        assert draft(replace(settings, generator="ollama"), "VPN", hits, "en")[2:] == (
            "extractive",
            "model_unavailable_or_invalid",
        )


def test_ollama_valid_contract(settings):
    hits = Retriever(settings).search("VPN connection unavailable")
    content = json.dumps({"answer": "Check connectivity first.", "citations": [hits[0].chunk.id]})
    response = httpx.Response(
        200,
        request=httpx.Request("POST", "http://localhost/api/chat"),
        json={"message": {"content": content}},
    )
    with patch("evidencedesk.generation.httpx.Client.post", return_value=response):
        assert draft(replace(settings, generator="ollama"), "VPN", hits, "en")[2:] == (
            "ollama",
            None,
        )


def test_duplicate_headings_rejected(tmp_path):
    (tmp_path / "duplicate.en.md").write_text(
        "# Title\n\n## Same\nFirst text.\n\n## Same\nSecond text."
    )
    with pytest.raises(ValueError, match="Duplicate section"):
        load_corpus(tmp_path)
