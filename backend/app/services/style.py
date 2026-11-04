"""Find the Anchor's past review notes that best match a piece of work.

A small keyword search (BM25) over the Anchor's own notes. It needs no extra service, works
offline, and is easy to swap for a vector database later. The notes found are shown to the
junior as "what your Anchor usually says", and given to the AI as examples of the Anchor's style.
"""

import math
import re
from collections import Counter

STOP = set("""a an and are as at be but by for from has have if in into is it its of on or so that the
their them then there these this to was were will with you your not no yes can do does did should must
also just than too very more most each any all our we they he she i me my""".split())


def tokens(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9\u0900-\u097f]+", text.lower())
    out = []
    for w in words:
        if w in STOP or len(w) < 2:
            continue
        # light stemming so "buttons"/"button" and "tested"/"test" match
        for suffix in ("ing", "ed", "es", "s"):
            if len(w) > 4 and w.endswith(suffix):
                w = w[: -len(suffix)]
                break
        out.append(w)
    return out


def rank(query: str, notes: list[str], k: int = 3) -> list[str]:
    """The k notes most relevant to the query, best first. Ties keep the original order."""
    if not notes:
        return []
    docs = [tokens(n) for n in notes]
    q = tokens(query)
    n = len(docs)
    avg = sum(len(d) for d in docs) / n or 1
    df = Counter(t for d in docs for t in set(d))
    scores = []
    for i, d in enumerate(docs):
        tf = Counter(d)
        s = 0.0
        for t in set(q):
            if t not in tf:
                continue
            idf = math.log(1 + (n - df[t] + 0.5) / (df[t] + 0.5))
            s += idf * tf[t] * 2.2 / (tf[t] + 1.2 * (0.25 + 0.75 * len(d) / avg))
        scores.append((s, -i))
    best = sorted(range(n), key=lambda i: scores[i], reverse=True)
    return [notes[i] for i in best[:k] if scores[i][0] > 0]
