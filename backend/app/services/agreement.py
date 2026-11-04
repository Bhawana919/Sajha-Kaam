"""The job agreement: a fixed template plus simple rules. No AI, no external service.

check() returns a list of problems. An empty list means the job can be posted.
"""

import re

from app.config import load_yaml


def skills() -> dict[str, dict]:
    return {s["id"]: s for s in load_yaml("skills.yaml")["skills"]}


def template() -> dict:
    return load_yaml("agreement.yaml")


def vague_words_in(text: str) -> list[str]:
    words = set(re.findall(r"[a-z]+", text.lower()))
    return [w for w in template()["vague_words"] if w in words]


def check(job: dict) -> list[dict]:
    """Problems with a draft agreement: [{field, code, ...}]. Codes are translated in the app."""
    t, problems = template(), []
    skill = job.get("skill") or ""
    if skill not in skills():
        problems.append({"field": "skill", "code": "unknown_skill"})
    if len((job.get("title") or "").strip()) < 5:
        problems.append({"field": "title", "code": "missing"})
    if not [d for d in job.get("deliverables") or [] if d.strip()]:
        problems.append({"field": "deliverables", "code": "missing"})
    done_when = [d.strip() for d in job.get("done_when") or [] if d.strip()]
    if not done_when:
        problems.append({"field": "done_when", "code": "missing"})
    for i, item in enumerate(done_when):
        if vague := vague_words_in(item):
            problems.append({"field": "done_when", "code": "vague", "index": i, "words": vague})
    if not 1 <= int(job.get("deadline_days") or 0) <= 90:
        problems.append({"field": "deadline_days", "code": "out_of_range"})
    if not 0 <= int(job.get("revisions") if job.get("revisions") is not None else -1) <= 5:
        problems.append({"field": "revisions", "code": "out_of_range"})
    budget, minimum = int(job.get("budget_minor") or 0), t["minimum_budget_minor"].get(skill, 0)
    if budget < max(minimum, 1):
        problems.append({"field": "budget_minor", "code": "below_minimum", "minimum": minimum})
    details = job.get("details") or {}
    for f in t["skill_fields"].get(skill, []):
        if f["required"] and not str(details.get(f["key"], "")).strip():
            problems.append({"field": f"details.{f['key']}", "code": "missing"})
    for i, ref in enumerate(job.get("references") or []):
        if not str(ref.get("link", "")).startswith(("https://", "http://")):
            problems.append({"field": "references", "code": "bad_link", "index": i})
    return problems
