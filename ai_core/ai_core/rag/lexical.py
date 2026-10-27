"""BM25 thuần Python cho tiếng Việt: token = âm tiết không dấu + bigram (bắt cụm "nhu anh", "co tu cung")."""

from __future__ import annotations

import math
import re
from collections import Counter

from ai_core.text import fold

_WORD = re.compile(r"[a-z0-9]+")
STOPWORDS = set(
    "la va cua co khong toi ban nen thi gi bao nhieu nao the nay do cho voi mot nhung cac duoc khi neu de o tu den "
    "hay hoac ve em minh a nhe vay sao lam can phai trong theo".split()
)


def tokenize(text: str) -> list[str]:
    words = _WORD.findall(fold(text))
    unigrams = [w for w in words if w not in STOPWORDS]
    bigrams = [f"{a}_{b}" for a, b in zip(words, words[1:], strict=False) if not (a in STOPWORDS and b in STOPWORDS)]
    return unigrams + bigrams


class BM25:
    def __init__(self, documents: list[list[str]], k1: float = 1.5, b: float = 0.75) -> None:
        self.k1, self.b = k1, b
        self.docs = [Counter(doc) for doc in documents]
        self.lengths = [len(doc) for doc in documents]
        self.avgdl = (sum(self.lengths) / len(self.lengths)) if self.lengths else 0.0
        df: Counter[str] = Counter()
        for doc in self.docs:
            df.update(doc.keys())
        n = len(self.docs)
        self.idf = {term: math.log(1 + (n - freq + 0.5) / (freq + 0.5)) for term, freq in df.items()}

    def scores(self, query: list[str]) -> list[float]:
        out: list[float] = []
        for doc, length in zip(self.docs, self.lengths, strict=True):
            score = 0.0
            for term in query:
                tf = doc.get(term)
                if not tf:
                    continue
                denom = tf + self.k1 * (1 - self.b + self.b * length / (self.avgdl or 1))
                score += self.idf.get(term, 0.0) * tf * (self.k1 + 1) / denom
            out.append(score)
        return out
