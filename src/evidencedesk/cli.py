import json

from .config import Settings
from .corpus import load_corpus


def main():
    settings = Settings.from_env()
    chunks, version = load_corpus(settings.corpus_dir)
    print(
        json.dumps(
            {
                "corpus_version": version,
                "documents": len({c.document for c in chunks}),
                "chunks": len(chunks),
                "characters": sum(len(c.text) for c in chunks),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
