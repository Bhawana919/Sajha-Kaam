"""The first check: a quick look at a junior's work, in their Anchor's words, before the Anchor sees it.

By default it is fully offline (no AI service, no cost, nothing leaves the server). Only if the
Anchor turned the AI helper on AND the client allowed it for this job, and an LLM is configured, it reviews the work against the task's "done when" list using the
Anchor's most relevant past notes as examples of their standards and tone. Without one (or if
the call fails), an offline check matches each list item against the work and quotes the
Anchor's closest past note. Either way the result says which it was, and the Anchor decides.

It reports "3 of 4 points look done" for the work, never a score for the person.
"""

import logging
from typing import Literal

from pydantic import BaseModel, ValidationError

from app.services import links, style
from app.services.llm import get_llm

log = logging.getLogger("guthi.check")
Status = Literal["looks_done", "needs_work", "cant_tell"]
MAX_WORK_CHARS = 12000


class ItemResult(BaseModel):
    item: str
    status: Status
    comment: str


class LLMCheck(BaseModel):
    items: list[ItemResult]
    to_fix: list[str]
    good: list[str]
    summary: str


SYSTEM = """You give a FIRST-PASS review of a junior's work for their mentor, the Anchor, who makes \
the final decision. Review only against the task's "done when" list. For each list item, in the same \
order, say looks_done, needs_work or cant_tell (when the work shown doesn't let you judge), with one \
short, specific comment. Write like the Anchor: copy the standards, tone and habits shown in their past \
notes. Be kind and concrete: say exactly what to change. Never say the work is approved or ready for \
the client; never judge the person, only the work. Output only JSON matching the schema."""


def _schema() -> dict:
    item = {"type": "object", "additionalProperties": False, "required": ["item", "status", "comment"],
            "properties": {"item": {"type": "string"}, "status": {"type": "string", "enum": list(Status.__args__)},
                           "comment": {"type": "string"}}}
    strings = {"type": "array", "items": {"type": "string"}}
    return {"type": "object", "additionalProperties": False, "required": ["items", "to_fix", "good", "summary"],
            "properties": {"items": {"type": "array", "items": item}, "to_fix": strings, "good": strings,
                           "summary": {"type": "string"}}}


def gather_work(link: str, content: str, note: str) -> tuple[str, str, str | None]:
    """(work text, where it came from, a note if the link couldn't be read)."""
    parts, read_from, link_note = [], "note_only", None
    if link.strip():
        fetched = links.read(link)
        if fetched:
            parts.append(fetched)
            read_from = links.source_of(link) or "pasted"
        else:
            link_note = "unsupported" if links.source_of(link) is None else "unreadable"
    if content.strip():
        parts.append(content)
        read_from = read_from if read_from != "note_only" else "pasted"
    if note.strip():
        parts.append(f"Junior's note: {note}")
    return "\n\n".join(parts)[:MAX_WORK_CHARS], read_from, link_note


def _offline(checklist: list[str], work: str, notes: list[str]) -> dict:
    work_tokens = set(style.tokens(work))
    items, to_fix, good, used = [], [], [], []
    for item in checklist:
        want = set(style.tokens(item))
        if not work.strip():
            status, comment = "cant_tell", "Nothing to check yet: add a public link or paste the work."
        elif want and len(want & work_tokens) / len(want) >= 0.5:
            status, comment = "looks_done", "This point appears in the work."
            good.append(item)
        else:
            status = "needs_work"
            match = style.rank(f"{item} {work[:2000]}", notes, k=1)
            comment = match[0] if match else f"Check this point carefully: {item}"
            if match and match[0] not in used:
                used.append(match[0])
            to_fix.append(item)
        items.append({"item": item, "status": status, "comment": comment})
    return {"items": items, "to_fix": to_fix, "good": good, "anchor_examples": used}


def check(*, title: str, brief: str, checklist: list[str], link: str, content: str, note: str,
          notes: list[str], use_ai: bool = False, llm=None) -> dict:
    """use_ai is True only when the Anchor turned the helper on AND the client allowed it for this job.
    Even then only the work, the checklist and the Anchor's notes are sent: no names or contacts."""
    work, read_from, link_note = gather_work(link, content, note)
    examples = style.rank(f"{title} {brief} {' '.join(checklist)} {work[:3000]}", notes, k=6)
    result: dict | None = None
    llm = (llm if llm is not None else get_llm()) if use_ai else None
    if llm is not None and work.strip():
        prompt = (f"Task: {title}\nWhat to deliver: {brief}\n\"Done when\" list:\n"
                  + "\n".join(f"{i + 1}. {c}" for i, c in enumerate(checklist))
                  + "\n\nThe Anchor's past review notes (copy this style):\n"
                  + ("\n".join(f"- {n}" for n in examples) or "- (none yet)")
                  + f"\n\nThe junior's work:\n{work}")
        try:
            data = LLMCheck.model_validate(llm.json(SYSTEM, prompt, _schema()))
            if len(data.items) != len(checklist):
                raise ValueError("item count mismatch")
            items = [{"item": c, "status": r.status, "comment": r.comment} for c, r in zip(checklist, data.items, strict=True)]
            result = {"source": "ai", "items": items, "to_fix": data.to_fix, "good": data.good,
                      "anchor_examples": examples, "summary": data.summary}
        except (ValidationError, ValueError, KeyError, StopIteration) as e:
            log.warning("AI check invalid output, using offline check: %s", type(e).__name__)
        except Exception as e:  # network, timeout, auth: the demo must never break
            log.warning("AI check failed, using offline check: %s", type(e).__name__)
    if result is None:
        result = {"source": "offline", **_offline(checklist, work, notes), "summary": ""}
    result["done_count"] = sum(1 for i in result["items"] if i["status"] == "looks_done")
    result["total"] = len(checklist)
    result["read_from"] = read_from
    result["link_note"] = link_note
    return result
