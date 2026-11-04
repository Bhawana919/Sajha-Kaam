"""Public Work Record: anyone with the link can see a member's verified jobs and check the signatures.

The link uses a random id, not a name. The page shows only what was signed: no email, district,
price, or client name unless the client chose to show it.
"""

from html import escape

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select

from app.db import get_session
from app.models import LogEntry, Pod, User
from app.schemas import LogbookOut
from app.services import agreement, signing, work
from app.services.views import entry_out, pod_out

router = APIRouter(tags=["public"])


def _logbook(session: Session, slug: str) -> LogbookOut:
    junior = session.exec(select(User).where(User.profile_slug == slug, User.role == "junior")).first()
    if junior is None:
        raise HTTPException(404, "logbook_not_found")
    teams = [session.get(Pod, m.pod_id) for m in work.memberships(session, junior.id)]
    levels = {session.get(Pod, m.pod_id).skill: m.level for m in work.memberships(session, junior.id)}
    entries = session.exec(select(LogEntry).where(LogEntry.junior_id == junior.id)
                           .order_by(LogEntry.issued_at.desc())).all()
    return LogbookOut(display_name=junior.display_name, teams=[pod_out(session, t) for t in teams], levels=levels,
                      entries=[entry_out(e) for e in entries])


@router.get("/.well-known/sajha-kaam-keys.json")
def keys() -> dict:
    return signing.keyset()


@router.get("/v1/public/logbook/{slug}", response_model=LogbookOut)
def logbook_json(slug: str, session: Session = Depends(get_session)) -> LogbookOut:
    return _logbook(session, slug)


@router.get("/p/{slug}", response_class=HTMLResponse)
def logbook_page(slug: str, session: Session = Depends(get_session)) -> str:
    lb, skills = _logbook(session, slug), agreement.skills()
    level_names = work.load_yaml("skills.yaml")["levels"]
    levels = " · ".join(f"{escape(skills[s]['en'])}: {'★' * lv} {escape(level_names[lv]['en'])}"
                        for s, lv in lb.levels.items())
    cards = []
    for e in lb.entries:
        s = e.credential["credentialSubject"]
        client = s["acceptedBy"]["name"] or f"A client in {s['acceptedBy']['country']}"
        link = (f'<p><a href="{escape(s["workLink"])}" rel="nofollow noopener">See the work</a></p>'
                if s.get("workLink") else "")
        check = ('<span class="ok">✓ Verified</span>' if e.valid
                 else '<span class="bad">✗ Signature does not match</span>')
        done = "".join(f"<li>{escape(c)}</li>" for c in s["doneWhen"])
        sup = s["supervision"]
        cards.append(f"""<article><h2>{escape(s["job"])}</h2>{check}
<p class="meta">{escape(skills.get(s["skill"], {}).get("en", s["skill"]))} · done as {'★' * sup["level"]} {escape(sup["name"])} · accepted {escape(s["clientAcceptedAt"][:10])}</p>
<p><b>Approved by Team Leader:</b> {escape(s["approvedBy"]["name"])} ({escape(s["approvedBy"]["headline"])})<br>
<b>Accepted by:</b> {escape(client)}</p><p class="meta">Done when:</p><ul>{done}</ul>{link}</article>""")
    body = "".join(cards) or "<p>No verified jobs yet.</p>"
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>{escape(lb.display_name)} · Sajha Kaam Work Record</title>
<style>body{{font-family:system-ui,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#F1ECE3;color:#1F1A16}}
article{{background:#fff;border-radius:16px;padding:20px;margin:16px 0}}h1{{margin:0}}h2{{margin:0 0 6px;font-size:20px}}
.meta{{color:#6B6158;font-size:14px}}.ok{{color:#2E7D4F;font-weight:600}}.bad{{color:#B03D1E;font-weight:600}}
footer{{color:#6B6158;font-size:13px;margin-top:24px}}a{{color:#1F5B4B}}</style></head><body>
<p class="meta">Sajha Kaam · साझा काम — Work Record</p><h1>{escape(lb.display_name)}</h1>
<p class="meta">{levels}</p>{body}
<footer>Each job was approved by a Team Leader and accepted by the client, then digitally signed (Ed25519).
Check it yourself: <a href="/v1/public/logbook/{escape(slug)}">entry data</a> ·
<a href="/.well-known/sajha-kaam-keys.json">public key</a>. Demo data.</footer></body></html>"""
