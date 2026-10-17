from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from evidencedesk.config import Settings
from evidencedesk.main import create_app


@pytest.fixture
def settings(tmp_path):
    return replace(Settings(), database=tmp_path / "audit.sqlite3")


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as c:
        yield c
