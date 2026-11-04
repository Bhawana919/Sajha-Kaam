"""Every state change in Sajha Kaam goes through here.

Job:  (draft | with_client | with_anchor | open) -> agreed -> assigned -> working -> submitted
      -> (sent_back -> submitted)* -> anchor_approved -> client_accepted
Rules: nothing reaches a junior before the client and the Anchor both agree; the first check never decides; only the Anchor approves, sends back, accepts team members
and changes levels; only the client accepts work. A logbook entry needs both yes's.
"""

from fastapi import HTTPException
from sqlmodel import Session, select

from app.config import load_yaml
from app.models import (
    AnchorClient,
    AnchorNote,
    Invite,
    Job,
    JoinRequest,
    JuniorProfile,
    LevelChange,
    LogEntry,
    Pod,
    PodMember,
    Submission,
    User,
    new_id,
    utcnow,
)
from app.services import agreement, checker, notify, signing

LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def split(price_minor: int) -> dict[str, int]:
    """How a payment is shared. Rounding goes to the junior, so the parts always add up."""
    pct = load_yaml("guthi.yaml")["split"]
    anchor = price_minor * pct["anchor"] // 100
    platform = price_minor * pct["platform"] // 100
    return {"junior": price_minor - anchor - platform, "anchor": anchor, "platform": platform}


def level_name(level: int) -> str:
    return load_yaml("skills.yaml")["levels"][level]["en"]


# ---------- lookups ----------

def pod_of_anchor(session: Session, anchor_id: str) -> Pod:
    pod = session.exec(select(Pod).where(Pod.anchor_id == anchor_id)).first()
    if pod is None:
        raise HTTPException(404, "no_team")
    return pod


def memberships(session: Session, junior_id: str) -> list[PodMember]:
    return list(session.exec(select(PodMember).where(PodMember.junior_id == junior_id)).all())


def get_job(session: Session, job_id: str) -> Job:
    job = session.get(Job, job_id)
    if job is None:
        raise HTTPException(404, "job_not_found")
    return job


def anchor_of(session: Session, job: Job) -> User | None:
    pod = session.get(Pod, job.pod_id) if job.pod_id else None
    return session.get(User, pod.anchor_id) if pod else None


def can_see(session: Session, user: User, job: Job) -> bool:
    if user.id in (job.client_id, job.junior_id):
        return True
    if user.role == "anchor":
        if job.state == "open":
            return job.skill == pod_of_anchor(session, user.id).skill
        a = anchor_of(session, job)
        return a is not None and a.id == user.id
    return False


def latest_submission(session: Session, job_id: str) -> Submission | None:
    return session.exec(select(Submission).where(Submission.job_id == job_id)
                        .order_by(Submission.created_at.desc())).first()


def notes_of(session: Session, anchor_id: str) -> list[str]:
    rows = session.exec(select(AnchorNote).where(AnchorNote.anchor_id == anchor_id)
                        .order_by(AnchorNote.created_at.desc())).all()
    return [r.text for r in rows]


# ---------- teams and joining ----------

def set_seats(session: Session, anchor: User, seats_open: int, test_task: str) -> Pod:
    pod = pod_of_anchor(session, anchor.id)
    opening = pod.seats_open == 0 and seats_open > 0
    pod.seats_open, pod.test_task = seats_open, test_task.strip()
    session.add(pod)
    if opening:
        members = {m.junior_id for m in session.exec(select(PodMember).where(PodMember.pod_id == pod.id)).all()}
        notify.send(session, set(notify.juniors_with_skill(session, pod.skill)) - members, "seats_open", pod.id)
    session.commit()
    session.refresh(pod)
    return pod


def open_teams_for(session: Session, junior: User) -> list[tuple[Pod, str | None]]:
    """Teams with open seats in the junior's skills, and the junior's request status for each."""
    profile = session.get(JuniorProfile, junior.id)
    skills = set(profile.skills) if profile else set()
    mine = {m.pod_id for m in memberships(session, junior.id)}
    out = []
    for pod in session.exec(select(Pod).where(Pod.seats_open > 0)).all():
        if pod.skill in skills and pod.id not in mine:
            req = session.exec(select(JoinRequest).where(JoinRequest.pod_id == pod.id,
                                                         JoinRequest.junior_id == junior.id)
                               .order_by(JoinRequest.created_at.desc())).first()
            out.append((pod, req.status if req else None))
    return out


def request_join(session: Session, junior: User, pod_id: str, *, sample_link: str, note: str,
                 test_answer: str) -> JoinRequest:
    pod = session.get(Pod, pod_id)
    if pod is None or pod.seats_open <= 0:
        raise HTTPException(404, "team_not_open")
    profile = session.get(JuniorProfile, junior.id)
    if profile is None or pod.skill not in profile.skills:
        raise HTTPException(422, "skill_not_in_profile")
    if session.get(PodMember, (pod.id, junior.id)):
        raise HTTPException(409, "already_member")
    if session.exec(select(JoinRequest).where(JoinRequest.pod_id == pod.id, JoinRequest.junior_id == junior.id,
                                              JoinRequest.status == "waiting")).first():
        raise HTTPException(409, "already_requested")
    if not sample_link.strip().startswith(("https://", "http://")):
        raise HTTPException(422, "sample_link_required")
    req = JoinRequest(pod_id=pod.id, junior_id=junior.id, sample_link=sample_link.strip(), note=note.strip(),
                      test_answer=test_answer.strip())
    session.add(req)
    notify.send(session, [pod.anchor_id], "join_request", pod.id)
    session.commit()
    session.refresh(req)
    return req


def blind_requests(session: Session, anchor: User) -> list[tuple[str, JoinRequest, JuniorProfile]]:
    """Waiting requests as "Applicant A, B, C": no name, email, district or about-me text."""
    pod = pod_of_anchor(session, anchor.id)
    reqs = session.exec(select(JoinRequest).where(JoinRequest.pod_id == pod.id, JoinRequest.status == "waiting")
                        .order_by(JoinRequest.created_at)).all()
    return [(LETTERS[i % 26], r, session.get(JuniorProfile, r.junior_id)) for i, r in enumerate(reqs)]


def decide_request(session: Session, anchor: User, request_id: str, accept: bool) -> JoinRequest:
    pod = pod_of_anchor(session, anchor.id)
    req = session.get(JoinRequest, request_id)
    if req is None or req.pod_id != pod.id:
        raise HTTPException(404, "request_not_found")
    if req.status != "waiting":
        raise HTTPException(409, "already_decided")
    if accept and pod.seats_open <= 0:
        raise HTTPException(409, "no_seats_left")
    req.status, req.decided_at = ("accepted" if accept else "declined"), utcnow()
    if accept:
        session.add(PodMember(pod_id=pod.id, junior_id=req.junior_id, level=2))
        pod.seats_open -= 1
        session.add(pod)
    session.add(req)
    notify.send(session, [req.junior_id], "join_accepted" if accept else "join_declined", pod.id)
    session.commit()
    session.refresh(req)
    return req


# ---------- levels ----------

def set_level(session: Session, anchor: User, junior_id: str, level: int, reason: str) -> PodMember:
    pod = pod_of_anchor(session, anchor.id)
    member = session.get(PodMember, (pod.id, junior_id))
    if member is None:
        raise HTTPException(404, "not_in_team")
    if not 1 <= level <= 5:
        raise HTTPException(422, "level_out_of_range")
    if level != member.level:
        session.add(LevelChange(pod_id=pod.id, junior_id=junior_id, old_level=member.level, new_level=level,
                                reason=reason.strip()))
        member.level = level
        session.add(member)
        notify.send(session, [junior_id], "level_changed", pod.id)
        session.commit()
        session.refresh(member)
    return member


def evidence(session: Session, pod: Pod, junior_id: str) -> dict:
    """Facts for the Anchor's level decision. It suggests nothing: the Anchor decides."""
    jobs = session.exec(select(Job).where(Job.pod_id == pod.id, Job.junior_id == junior_id,
                                          Job.state == "client_accepted").order_by(Job.created_at.desc())).all()
    streak = 0
    for job in jobs:
        sent_back = session.exec(select(Submission).where(Submission.job_id == job.id,
                                                          Submission.status == "sent_back")).first()
        if sent_back:
            break
        streak += 1
    total_sent_back = sum(1 for job in jobs for s in session.exec(
        select(Submission).where(Submission.job_id == job.id, Submission.status == "sent_back")).all())
    return {"signed_jobs": len(jobs), "first_try_streak": streak, "sent_back_total": total_sent_back}


# ---------- clients and invites ----------

def create_invite(session: Session, anchor: User) -> Invite:
    pod_of_anchor(session, anchor.id)
    inv = Invite(anchor_id=anchor.id)
    session.add(inv)
    session.commit()
    session.refresh(inv)
    return inv


def use_invite(session: Session, code: str, client: User) -> None:
    inv = session.get(Invite, code.strip().upper())
    if inv is None or inv.used_by:
        raise HTTPException(404, "invite_not_found")
    inv.used_by = client.id
    session.add_all([inv, AnchorClient(anchor_id=inv.anchor_id, client_id=client.id)])
    notify.send(session, [inv.anchor_id], "client_joined", client.id)


def my_anchors(session: Session, client_id: str) -> list[User]:
    links = session.exec(select(AnchorClient).where(AnchorClient.client_id == client_id)).all()
    return [session.get(User, link.anchor_id) for link in links]


# ---------- jobs: the agreement ----------
# Whoever wrote the latest version of the agreement waits for the other side to agree. Juniors see
# nothing until both have agreed. Later changes are amendments the client must accept.

AMENDABLE = ("agreed", "assigned", "working", "submitted", "sent_back", "anchor_approved")


def _agreement_fields(data: dict) -> dict:
    problems = agreement.check(data)
    if problems:
        raise HTTPException(422, {"code": "agreement_incomplete", "problems": problems})
    return dict(skill=data["skill"], title=data["title"].strip(),
                deliverables=[d.strip() for d in data["deliverables"] if d.strip()],
                done_when=[d.strip() for d in data["done_when"] if d.strip()],
                details={k: str(v).strip() for k, v in (data.get("details") or {}).items() if str(v).strip()},
                references=data.get("references") or [], deadline_days=data["deadline_days"],
                budget_minor=data["budget_minor"], currency=data.get("currency", "USD").upper(),
                revisions=data["revisions"], allow_ai=bool(data.get("allow_ai")))


def _save(session: Session, job: Job) -> Job:
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def create_job(session: Session, client: User, data: dict, send_to_anchor: str | None,
               job_id: str | None = None) -> Job:
    """A client writes the agreement. Sent to their own Anchor, it waits for that Anchor to agree;
    posted to everyone, the first Anchor who takes it agrees by taking it."""
    job = Job(id=job_id or new_id(), client_id=client.id, **_agreement_fields(data))
    if send_to_anchor:
        if session.get(AnchorClient, (send_to_anchor, client.id)) is None:
            raise HTTPException(403, "not_your_anchor")
        pod = pod_of_anchor(session, send_to_anchor)
        if pod.skill != job.skill:
            raise HTTPException(422, "anchor_skill_mismatch")
        job.pod_id, job.state = pod.id, "with_anchor"
        notify.send(session, [send_to_anchor], "job_sent", job.id)
    else:
        notify.send(session, notify.anchors_with_skill(session, job.skill), "job_open", job.id)
    return _save(session, job)


def anchor_create_job(session: Session, anchor: User, client_id: str, data: dict, job_id: str | None = None) -> Job:
    """The main way: the Anchor writes the agreement (usually after a call) and the client agrees."""
    pod = pod_of_anchor(session, anchor.id)
    if session.get(AnchorClient, (anchor.id, client_id)) is None:
        raise HTTPException(403, "not_your_client")
    if data.get("skill") != pod.skill:
        raise HTTPException(422, "anchor_skill_mismatch")
    job = Job(id=job_id or new_id(), client_id=client_id, pod_id=pod.id, state="with_client",
              **_agreement_fields(data))
    notify.send(session, [client_id], "agreement_ready", job.id)
    return _save(session, job)


def edit_job(session: Session, anchor: User, job: Job, data: dict) -> Job:
    """The Anchor rewrites an agreement that isn't agreed yet. It then waits for the client."""
    pod = pod_of_anchor(session, anchor.id)
    if job.pod_id != pod.id:
        raise HTTPException(403, "not_your_job")
    if job.state not in ("draft", "with_client", "with_anchor"):
        raise HTTPException(409, "already_agreed")
    if data.get("skill") != pod.skill:
        raise HTTPException(422, "anchor_skill_mismatch")
    for k, v in _agreement_fields(data).items():
        setattr(job, k, v)
    job.state, job.change_note = "with_client", ""
    notify.send(session, [job.client_id], "agreement_ready", job.id)
    return _save(session, job)


def agree(session: Session, user: User, job: Job) -> Job:
    """The side that didn't write the latest version taps Agree. The agreement is then locked."""
    if user.role == "client" and job.client_id == user.id and job.state == "with_client":
        notify.send(session, [anchor_of(session, job).id], "client_agreed", job.id)
    elif user.role == "anchor" and job.state == "with_anchor" and job.pod_id == pod_of_anchor(session, user.id).id:
        notify.send(session, [job.client_id], "job_taken", job.id)
    else:
        raise HTTPException(409, "nothing_to_agree")
    job.state, job.agreed_at, job.change_note = "agreed", utcnow(), ""
    return _save(session, job)


def request_changes(session: Session, client: User, job: Job, note: str) -> Job:
    if job.client_id != client.id:
        raise HTTPException(403, "not_your_job")
    if job.state != "with_client":
        raise HTTPException(409, "nothing_to_agree")
    job.state, job.change_note = "draft", note.strip()
    notify.send(session, [anchor_of(session, job).id], "changes_requested", job.id)
    return _save(session, job)


def take_job(session: Session, anchor: User, job: Job) -> Job:
    """Taking an open job the client posted is the Anchor's agreement to it."""
    pod = pod_of_anchor(session, anchor.id)
    if job.state != "open":
        raise HTTPException(409, "job_not_open")
    if job.skill != pod.skill:
        raise HTTPException(422, "anchor_skill_mismatch")
    job.pod_id, job.state, job.agreed_at = pod.id, "agreed", utcnow()
    if session.get(AnchorClient, (anchor.id, job.client_id)) is None:
        session.add(AnchorClient(anchor_id=anchor.id, client_id=job.client_id))
    notify.send(session, [job.client_id], "job_taken", job.id)
    return _save(session, job)


def propose_change(session: Session, anchor: User, job: Job, *, deadline_days: int, budget_minor: int,
                   note: str) -> Job:
    """After agreement nothing changes silently: the Anchor proposes, the client accepts or not."""
    a = anchor_of(session, job)
    if a is None or a.id != anchor.id:
        raise HTTPException(403, "not_your_job")
    if job.state not in AMENDABLE:
        raise HTTPException(409, "cannot_change_now")
    if deadline_days == job.deadline_days and budget_minor == job.budget_minor:
        raise HTTPException(422, "nothing_changed")
    if not 1 <= deadline_days <= 90:
        raise HTTPException(422, "deadline_out_of_range")
    if budget_minor < max(agreement.template()["minimum_budget_minor"].get(job.skill, 0), 1):
        raise HTTPException(422, "below_minimum")
    job.pending_change = {"deadline_days": deadline_days, "budget_minor": budget_minor, "note": note.strip()}
    notify.send(session, [job.client_id], "change_proposed", job.id)
    return _save(session, job)


def decide_change(session: Session, client: User, job: Job, accept: bool) -> Job:
    if job.client_id != client.id:
        raise HTTPException(403, "not_your_job")
    change = job.pending_change
    if not change:
        raise HTTPException(409, "no_change_waiting")
    if accept:
        history = list(job.amendments)  # a new list, so the JSON column sees the change
        for field in ("deadline_days", "budget_minor"):
            if change[field] != getattr(job, field):
                history.append({"field": field, "old": getattr(job, field), "new": change[field],
                                "note": change["note"], "at": utcnow().isoformat(timespec="seconds")})
                setattr(job, field, change[field])
        job.amendments = history
        if job.junior_id:
            notify.send(session, [job.junior_id], "job_changed", job.id)
    job.pending_change = {}
    notify.send(session, [anchor_of(session, job).id], "change_accepted" if accept else "change_declined", job.id)
    return _save(session, job)


# ---------- jobs: the work ----------

def assign(session: Session, anchor: User, job: Job, junior_id: str) -> Job:
    """Offer the job to a team member. It's theirs once they accept the brief."""
    pod = pod_of_anchor(session, anchor.id)
    if job.pod_id != pod.id:
        raise HTTPException(403, "not_your_job")
    if job.state not in ("agreed", "assigned"):
        raise HTTPException(409, "cannot_assign_now")
    member = session.get(PodMember, (pod.id, junior_id))
    if member is None:
        raise HTTPException(422, "not_in_team")
    job.junior_id, job.state, job.supervision_level = junior_id, "assigned", member.level
    job.junior_accepted_at = None
    notify.send(session, [junior_id], "job_assigned", job.id)
    return _save(session, job)


def answer_brief(session: Session, junior: User, job: Job, accept: bool) -> Job:
    """The junior's own short agreement: what to deliver, "done when", deadline and their share."""
    if job.junior_id != junior.id:
        raise HTTPException(403, "not_your_job")
    if job.state != "assigned":
        raise HTTPException(409, "nothing_to_accept")
    anchor = anchor_of(session, job)
    if accept:
        job.state, job.junior_accepted_at = "working", utcnow()
        notify.send(session, [anchor.id], "brief_accepted", job.id)
    else:
        job.state, job.junior_id, job.supervision_level = "agreed", None, None
        notify.send(session, [anchor.id], "brief_declined", job.id)
    return _save(session, job)


def submit(session: Session, junior: User, job: Job, *, link: str, content: str, note: str, llm=None) -> Submission:
    if job.junior_id != junior.id:
        raise HTTPException(403, "not_your_job")
    if job.state not in ("working", "sent_back"):
        raise HTTPException(409, "not_open_for_submission")
    if not link.strip() and not content.strip():
        raise HTTPException(422, "nothing_to_check")
    anchor = anchor_of(session, job)
    result = checker.check(title=job.title, brief="; ".join(job.deliverables), checklist=job.done_when,
                           link=link, content=content, note=note, notes=notes_of(session, anchor.id),
                           use_ai=anchor.ai_helper and job.allow_ai, llm=llm)
    sub = Submission(job_id=job.id, junior_id=junior.id, link=link.strip(), content=content, note=note.strip(),
                     check=result)
    job.state = "submitted"
    notify.send(session, [anchor.id], "work_submitted", job.id)
    session.add_all([sub, job])
    session.commit()
    session.refresh(sub)
    return sub


def _anchor_submission(session: Session, anchor: User, submission_id: str) -> tuple[Submission, Job]:
    sub = session.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(404, "submission_not_found")
    job = session.get(Job, sub.job_id)
    a = anchor_of(session, job)
    if a is None or a.id != anchor.id:
        raise HTTPException(403, "not_your_job")
    if sub.status != "waiting" or job.state != "submitted":
        raise HTTPException(409, "already_decided")
    return sub, job


def approve(session: Session, anchor: User, submission_id: str) -> Submission:
    sub, job = _anchor_submission(session, anchor, submission_id)
    sub.status, sub.decided_at = "approved", utcnow()
    job.state = "anchor_approved"
    notify.send(session, [job.junior_id], "work_approved", job.id)
    notify.send(session, [job.client_id], "ready_for_you", job.id)
    session.add_all([sub, job])
    session.commit()
    session.refresh(sub)
    return sub


def send_back(session: Session, anchor: User, submission_id: str, note: str) -> Submission:
    """The Anchor's note goes to the junior AND into the Anchor's notes for future first checks."""
    sub, job = _anchor_submission(session, anchor, submission_id)
    sub.status, sub.decided_at, sub.anchor_note = "sent_back", utcnow(), note.strip()
    job.state = "sent_back"
    notify.send(session, [job.junior_id], "work_sent_back", job.id)
    session.add_all([sub, job, AnchorNote(anchor_id=anchor.id, text=note.strip(), source="send_back")])
    session.commit()
    session.refresh(sub)
    return sub


def _iso(dt) -> str:
    return dt.replace(tzinfo=None).isoformat(timespec="seconds") + "Z"


def accept(session: Session, client: User, job: Job, show_client: bool) -> LogEntry:
    if job.client_id != client.id:
        raise HTTPException(403, "not_your_job")
    if job.state != "anchor_approved":
        raise HTTPException(409, "not_ready_for_client")
    sub = session.exec(select(Submission).where(Submission.job_id == job.id, Submission.status == "approved")).first()
    junior, anchor = session.get(User, job.junior_id), anchor_of(session, job)
    entry = LogEntry(job_id=job.id, junior_id=junior.id, signature_b64="", key_id="")
    now = utcnow()
    # Signed body: never the price, emails, district, or client details the client didn't agree to show.
    entry.credential = {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        "type": ["VerifiableCredential", "SajhaKaamLogEntry"],
        "id": f"urn:sajha-kaam:log:{entry.id}",
        "issuer": signing.ISSUER,
        "validFrom": _iso(now),
        "credentialSubject": {
            "id": f"urn:sajha-kaam:profile:{junior.profile_slug}",
            "displayName": junior.display_name,
            "job": job.title,
            "skill": job.skill,
            "doneWhen": job.done_when,
            "supervision": {"level": job.supervision_level, "name": level_name(job.supervision_level)},
            "approvedBy": {"name": anchor.display_name, "role": "Team Leader", "headline": anchor.headline},
            "acceptedBy": {"name": client.headline or client.display_name if show_client else None,
                           "country": client.country},
            "workLink": (sub.link or None) if show_client else None,
            "anchorApprovedAt": _iso(sub.decided_at),
            "clientAcceptedAt": _iso(now),
        },
    }
    entry.signature_b64, entry.key_id = signing.sign(entry.credential)
    job.state = "client_accepted"
    notify.send(session, [junior.id], "log_signed", job.id)
    notify.send(session, [anchor.id], "client_accepted", job.id)
    session.add_all([entry, job])
    session.commit()
    session.refresh(entry)
    return entry
