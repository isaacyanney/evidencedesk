import re
import threading
from dataclasses import dataclass

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from .config import Settings
from .corpus import Chunk, load_corpus

# English and German function words are excluded only from the coverage gate.
STOP = set(
    (
        "the a an to for of in is it my i me and or on how what can do does not with "
        "be this that have has are you your we our when after from at was will please "
        "der die das ein eine und oder ich mein meine ist sind im am wie was kann "
        "nicht mit auf zu bei nach von für den dem des es sie wir sich werden wurde bitte"
    ).split()
)


def tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[\w]+", text.lower()) if len(t) > 2 and t not in STOP}


@dataclass(frozen=True)
class Hit:
    chunk: Chunk
    lexical_score: float
    semantic_score: float | None
    fusion_score: float
    coverage: float

    def public(self):
        return {
            "id": self.chunk.id,
            "document": self.chunk.document,
            "title": self.chunk.title,
            "section": self.chunk.section,
            "language": self.chunk.language,
            "text": self.chunk.text,
            "source_hash": self.chunk.source_hash,
            "lexical_score": round(self.lexical_score, 4),
            "semantic_score": None
            if self.semantic_score is None
            else round(self.semantic_score, 4),
            "fusion_score": round(self.fusion_score, 6),
            "term_coverage": round(self.coverage, 4),
        }


class Retriever:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.chunks, self.version = load_corpus(settings.corpus_dir)
        corpus = [c.searchable for c in self.chunks]
        self.word = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)
        self.char = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True)
        self.words = self.word.fit_transform(corpus)
        self.chars = self.char.fit_transform(corpus)
        self.model = None
        self.embeddings = None
        self.resolved_revision = None
        self.lock = threading.Lock()
        if settings.backend == "hybrid":
            from sentence_transformers import SentenceTransformer

            self.model = SentenceTransformer(
                settings.model,
                revision=settings.revision,
                device="cpu",
                local_files_only=settings.model_local_only,
                trust_remote_code=False,
            )
            self.resolved_revision = (
                getattr(self.model[0].auto_model.config, "_commit_hash", None) or settings.revision
            )
            self.embeddings = self.model.encode_document(corpus, normalize_embeddings=True)

    def search(self, query: str, k: int = 5, language: str = "all", mode: str | None = None):
        mode = mode or self.settings.backend
        if mode not in {"word", "lexical", "hybrid"}:
            raise ValueError("Unknown retrieval mode")
        word = (self.words @ self.word.transform([query]).T).toarray().ravel()
        char = (self.chars @ self.char.transform([query]).T).toarray().ravel()
        lexical = word if mode == "word" else 0.72 * word + 0.28 * char
        valid = [
            i for i, c in enumerate(self.chunks) if language == "all" or c.language == language
        ]
        lr = sorted(valid, key=lambda i: (-lexical[i], self.chunks[i].id))
        semantic = None
        fusion = np.zeros(len(self.chunks))
        if mode == "hybrid":
            if self.model is None:
                raise ValueError("Hybrid retrieval requires a loaded embedding model")
            with self.lock:
                embedding = self.model.encode_query([query], normalize_embeddings=True)[0]
            semantic = self.embeddings @ embedding
            sr = sorted(valid, key=lambda i: (-semantic[i], self.chunks[i].id))
            for ranking in (lr, sr):
                for rank, idx in enumerate(ranking[:20], 1):
                    fusion[idx] += 1.0 / (60 + rank)
            ranking = sorted(valid, key=lambda i: (-fusion[i], self.chunks[i].id))
        else:
            fusion = lexical.copy()
            ranking = lr
        qt = tokens(query)
        return [
            Hit(
                self.chunks[i],
                float(lexical[i]),
                None if semantic is None else float(semantic[i]),
                float(fusion[i]),
                len(qt & tokens(self.chunks[i].searchable)) / max(1, len(qt)),
            )
            for i in ranking[:k]
        ]

    def sufficient(self, hit: Hit | None):
        if hit is None:
            return False
        lexical_ok = hit.lexical_score >= self.settings.lexical_threshold and hit.coverage >= 0.20
        # Semantic-only matches permit cross-language questions, but are still heuristic.
        semantic_ok = (
            hit.semantic_score is not None and hit.semantic_score >= self.settings.neural_threshold
        )
        return lexical_ok or semantic_ok
