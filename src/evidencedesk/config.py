import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).parent


@dataclass(frozen=True)
class Settings:
    corpus_dir: Path = ROOT / "data" / "runbooks"
    database: Path = Path("var/evidencedesk.sqlite3")
    backend: str = "lexical"
    model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    revision: str | None = "e8f8c211226b894fcb81acc59f3b34ba3efd5f42"
    model_local_only: bool = False
    generator: str = "extractive"
    ollama_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen2.5:3b"
    api_key: str = ""
    environment: str = "development"
    rate_limit: int = 30
    max_concurrent: int = 4
    lexical_threshold: float = 0.12
    neural_threshold: float = 0.48

    @classmethod
    def from_env(cls):
        return cls(
            corpus_dir=Path(os.getenv("CORPUS_DIR", str(ROOT / "data" / "runbooks"))),
            database=Path(os.getenv("DATABASE_PATH", "var/evidencedesk.sqlite3")),
            backend=os.getenv("RETRIEVAL_BACKEND", "lexical"),
            model=os.getenv("EMBEDDING_MODEL", cls.model),
            revision=os.getenv("EMBEDDING_REVISION") or cls.revision,
            model_local_only=os.getenv("MODEL_LOCAL_ONLY", "false").lower() == "true",
            generator=os.getenv("GENERATOR", "extractive"),
            ollama_url=os.getenv("OLLAMA_URL", "http://127.0.0.1:11434"),
            ollama_model=os.getenv("OLLAMA_MODEL", "qwen2.5:3b"),
            api_key=os.getenv("API_KEY", ""),
            environment=os.getenv("APP_ENV", "development"),
            rate_limit=int(os.getenv("RATE_LIMIT_PER_MINUTE", "30")),
            max_concurrent=int(os.getenv("MAX_CONCURRENT", "4")),
            lexical_threshold=float(os.getenv("LEXICAL_THRESHOLD", "0.12")),
            neural_threshold=float(os.getenv("NEURAL_THRESHOLD", "0.48")),
        )

    def validate(self):
        if self.backend not in {"lexical", "hybrid"}:
            raise ValueError("RETRIEVAL_BACKEND must be lexical or hybrid")
        if self.generator not in {"extractive", "ollama"}:
            raise ValueError("GENERATOR must be extractive or ollama")
        if self.environment not in {"development", "production"}:
            raise ValueError("APP_ENV must be development or production")
        if self.environment == "production" and len(self.api_key) < 32:
            raise ValueError("Production requires an API_KEY of at least 32 characters")
        if self.rate_limit < 1 or self.max_concurrent < 1:
            raise ValueError("Rate and concurrency limits must be positive")
        if not 0 < self.lexical_threshold < 1 or not 0 < self.neural_threshold < 1:
            raise ValueError("Thresholds must be between zero and one")
