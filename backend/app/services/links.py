"""Read submitted work from a public link, for the AI check.

Only two kinds of link are ever fetched, matched exactly, so the server can't be pointed at
anything else: a public GitHub pull request (read as its .diff) and a Google Doc shared with
"anyone with the link" (read as plain text). Anything else returns None and the check uses the
pasted text and note instead.
"""

import re
import urllib.request

from app.config import load_yaml, settings

GITHUB_PR = re.compile(r"^https://github\.com/([\w.-]+)/([\w.-]+)/pull/(\d+)/?$")
GOOGLE_DOC = re.compile(r"^https://docs\.google\.com/document/d/([\w-]{20,})(?:/[\w?=&#-]*)?$")


def source_of(link: str) -> str | None:
    link = link.strip()
    if GITHUB_PR.match(link):
        return "github"
    if GOOGLE_DOC.match(link):
        return "google_doc"
    return None


def fetch_url(link: str) -> str | None:
    link = link.strip()
    if m := GITHUB_PR.match(link):
        owner, repo, num = m.groups()
        return f"https://github.com/{owner}/{repo}/pull/{num}.diff"
    if m := GOOGLE_DOC.match(link):
        return f"https://docs.google.com/document/d/{m.group(1)}/export?format=txt"
    return None


def read(link: str) -> str | None:
    """The text behind a supported public link, or None (unsupported, private, offline, too slow)."""
    url = fetch_url(link)
    if url is None or not settings().read_links:
        return None
    cfg = load_yaml("guthi.yaml")["link_reading"]
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "sajha-kaam-check"})
        with urllib.request.urlopen(req, timeout=cfg["timeout_s"]) as res:  # noqa: S310 (fixed hosts above)
            if res.status != 200:
                return None
            return res.read(cfg["max_chars"] * 4).decode("utf-8", errors="replace")[: cfg["max_chars"]]
    except Exception:  # private doc, network down, timeout: fall back to pasted text
        return None
