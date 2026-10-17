import hashlib
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Chunk:
    id: str
    document: str
    title: str
    section: str
    language: str
    text: str
    source_hash: str

    @property
    def searchable(self):
        return f"{self.title}. {self.section}. {self.text}"


def load_corpus(directory: Path) -> tuple[list[Chunk], str]:
    """Deterministic Markdown ingestion; IDs bind citations to exact source bytes."""
    chunks = []
    manifest = hashlib.sha256()
    paths = sorted(directory.glob("*.md"))
    if not paths:
        raise ValueError("Corpus contains no Markdown runbooks")
    for path in paths:
        raw = path.read_bytes()
        if len(raw) > 1_000_000:
            raise ValueError(f"Runbook too large: {path.name}")
        digest = hashlib.sha256(raw).hexdigest()
        manifest.update(path.name.encode() + b"\0" + raw)
        text = raw.decode("utf-8")
        title = path.stem
        section = "Overview"
        language = "de" if path.stem.endswith(".de") else "en"
        body = []
        sections = set()

        def flush(body, path, section, digest, title, language):
            content = "\n".join(body).strip()
            if not content:
                return
            # Bound sections to 1,400 characters; long custom sections can split mid-sentence.
            for part_index, start in enumerate(range(0, len(content), 1400)):
                part = content[start : start + 1400]
                key = f"{path.name}:{section}:{part_index}:{digest}"
                cid = hashlib.sha256(key.encode()).hexdigest()[:16]
                chunks.append(Chunk(cid, path.name, title, section, language, part, digest))

        for line in text.splitlines():
            heading = re.match(r"^(#{1,2}) (.+)$", line)
            if heading:
                flush(body, path, section, digest, title, language)
                body.clear()
                if heading[1] == "#":
                    title = heading[2]
                else:
                    section = heading[2]
                    if section in sections:
                        raise ValueError(f"Duplicate section heading in {path.name}: {section}")
                    sections.add(section)
            else:
                body.append(line)
        flush(body, path, section, digest, title, language)
    if not chunks:
        raise ValueError("Corpus has no nonempty sections")
    if len(chunks) > 10000:
        raise ValueError("Corpus exceeds in-memory limit of 10,000 chunks")
    return chunks, manifest.hexdigest()
