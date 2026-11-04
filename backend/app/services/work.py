"""Every state change in Sajha Kaam goes through here.

Job:  (draft | with_client | with_anchor | open) -> agreed -> assigned -> working -> submitted
      -> (sent_back -> submitted)* -> anchor_approved -> client_accepted
      An open job (posted to everyone) gets applications from Anchors and Mentors with the skill; the
      client chooses one. A chosen Mentor goes straight to working; their Anchor still approves.
Rules: nothing reaches a junior before the client and the Anchor both agree; the first check never decides; only the Anchor approves, sends back, accepts team members
and changes levels; only the client accepts work. A logbook entry needs both yes's.
"""

from datetime import timedelta
from urllib.parse import urlparse

from fastapi import HTTPException
from sqlmodel import Session, select

from app.config import load_yaml
from app.models import (
    UTC,
    AnchorClient,
    AnchorNote,
    Invite,
    Job,
    JobApplication,
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
from app.services import agreement, checker, notify, signing, uploads

LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def split(price_minor: int, level: int | None) -> dict:
    """How a payment is shared. The member's share follows their badge for the job; Sajha Kaam's is fixed;
    the rest goes to the checker. Before a job has a member, only the platform part is known.
    Rounding goes to the member, so the parts always add up."""
    cfg = load_yaml("guthi.yaml")["split"]
    platform = price_minor * cfg["platform"] // 100
    if level is None:
        return {"junior": 0, "anchor": 0, "platform": platform, "level": None, "junior_pct": None, "anchor_pct": None,
                "platform_pct": cfg["platform"]}
    junior_pct = cfg["member_by_level"][level]
    anchor_pct = 100 - cfg["platform"] - junior_pct
    anchor = price_minor * anchor_pct // 100
    return {"junior": price_minor - anchor - platform, "anchor": anchor, "platform": platform, "level": level,
            "junior_pct": junior_pct, "anchor_pct": anchor_pct, "platform_pct": cfg["platform"]}


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
    if job.state == "open":
        return apply_team(session, user, job.skill) is not None
    if my_application(session, user, job) is not None:  # applied, so they can see who it went to
        return True
    if user.role == "anchor":
        a = anchor_of(session, job)
        return a is not None and a.id == user.id
    return False


def apply_team(session: Session, user: User, skill: str) -> Pod | None:
    """The team an open job would go into if this person applied for it, or None if they may not apply:
    a Team Leader whose team has the skill, or a member who is a Mentor in a team with the skill."""
    if user.role == "anchor":
        pod = session.exec(select(Pod).where(Pod.anchor_id == user.id)).first()
        return pod if pod and pod.skill == skill else None
    if user.role == "junior":
        for m in memberships(session, user.id):
            pod = session.get(Pod, m.pod_id)
            if m.level == notify.MENTOR and pod and pod.skill == skill:
                return pod
    return None


def open_jobs_for(session: Session, user: User) -> list[Job]:
    """Open client jobs this person may apply for."""
    jobs = session.exec(select(Job).where(Job.state == "open").order_by(Job.created_at)).all()
    return [j for j in jobs if apply_team(session, user, j.skill) is not None]


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
        # A new member starts at the level their record in this skill already earned (often Starter).
        session.add(PodMember(pod_id=pod.id, junior_id=req.junior_id,
                              level=earned_level(skill_record(session, req.junior_id, pod.skill))))
        pod.seats_open -= 1
        session.add(pod)
    session.add(req)
    notify.send(session, [req.junior_id], "join_accepted" if accept else "join_declined", pod.id)
    session.commit()
    session.refresh(req)
    return req


# ---------- levels ----------

def _rules() -> dict[int, dict]:
    return {int(k): v for k, v in load_yaml("guthi.yaml")["promotion"].items()}


def skill_record(session: Session, junior_id: str, skill: str) -> list[dict]:
    """Every job the member finished in this skill (any team), newest first: approved first time? on time?"""
    jobs = session.exec(select(Job).where(Job.junior_id == junior_id, Job.skill == skill,
                                          Job.state == "client_accepted")).all()
    out = []
    for job in jobs:
        subs = session.exec(select(Submission).where(Submission.job_id == job.id)).all()
        approved = next((x for x in subs if x.status == "approved"), None)
        due, sent = due_at(job), approved.created_at if approved else None
        if sent is not None and sent.tzinfo is None:
            sent = sent.replace(tzinfo=UTC)
        out.append({"first_time": not any(x.status == "sent_back" for x in subs),
                    "on_time": due is None or sent is None or sent <= due,
                    "at": job.paid_out_at or job.created_at})
    return sorted(out, key=lambda r: r["at"].replace(tzinfo=None), reverse=True)


def _streak(record: list[dict], key: str) -> int:
    n = 0
    for r in record:
        if not r[key]:
            break
        n += 1
    return n


def rule_checks(level: int, record: list[dict]) -> list[dict]:
    """The rule for one level as checks the member can read: what is needed, what they have."""
    rule, done = _rules()[level], len(record)
    first_pct = round(100 * sum(r["first_time"] for r in record) / done) if done else 0
    checks = [{"code": "jobs", "need": rule["jobs"], "have": done}]
    if "last_first_time" in rule:
        checks.append({"code": "last_first_time", "need": rule["last_first_time"], "have": _streak(record, "first_time")})
    if "first_time_pct" in rule:
        checks.append({"code": "first_time_pct", "need": rule["first_time_pct"], "have": first_pct})
    if "last_on_time" in rule:
        checks.append({"code": "last_on_time", "need": rule["last_on_time"], "have": _streak(record, "on_time")})
    return [{**c, "ok": c["have"] >= c["need"]} for c in checks]


def earned_level(record: list[dict]) -> int:
    """The highest badge the record meets by the public rules (Starter if none)."""
    for level in sorted(_rules(), reverse=True):
        if all(c["ok"] for c in rule_checks(level, record)):
            return level
    return 1


def progress(session: Session, member: PodMember, skill: str) -> dict:
    """Where the member stands: the next badge and what is still needed for it."""
    record = skill_record(session, member.junior_id, skill)
    paused = member.hold_at_jobs is not None and len(record) <= member.hold_at_jobs
    nxt = member.level + 1 if member.level < 5 else None
    return {"level": member.level, "next_level": nxt, "checks": rule_checks(nxt, record) if nxt else [],
            "verified": len(record), "paused_reason": member.hold_reason if paused else ""}


def promote_by_record(session: Session, junior_id: str, skill: str) -> None:
    """After a client accepts a job: raise the badge in every team with this skill if the rules are met.
    Never lowers. Skips once if the Team Leader paused this promotion (with a reason the member saw)."""
    record = skill_record(session, junior_id, skill)
    target = earned_level(record)
    for m in memberships(session, junior_id):
        pod = session.get(Pod, m.pod_id)
        if pod is None or pod.skill != skill:
            continue
        if m.hold_at_jobs is not None:
            if len(record) <= m.hold_at_jobs:
                continue
            m.hold_at_jobs, m.hold_reason = None, ""
        if target > m.level:
            session.add(LevelChange(pod_id=pod.id, junior_id=junior_id, old_level=m.level, new_level=target,
                                    reason="", kind="auto"))
            m.level = target
            notify.send(session, [junior_id], "level_up", pod.id)
            notify.send(session, [pod.anchor_id], "member_level_up", pod.id)
        session.add(m)


def set_level(session: Session, anchor: User, junior_id: str, level: int, reason: str) -> PodMember:
    """The Team Leader can only LOWER a badge (badges go up by the rules), with a reason the member sees."""
    pod = pod_of_anchor(session, anchor.id)
    member = session.get(PodMember, (pod.id, junior_id))
    if member is None:
        raise HTTPException(404, "not_in_team")
    if not 1 <= level <= 5:
        raise HTTPException(422, "level_out_of_range")
    if level >= member.level:
        raise HTTPException(422, "can_only_lower")
    session.add(LevelChange(pod_id=pod.id, junior_id=junior_id, old_level=member.level, new_level=level,
                            reason=reason.strip(), kind="lowered"))
    member.level = level
    session.add(member)
    notify.send(session, [junior_id], "level_changed", pod.id)
    session.commit()
    session.refresh(member)
    return member


def pause_promotion(session: Session, anchor: User, junior_id: str, reason: str) -> PodMember:
    """Pause the member's NEXT automatic promotion, once, with a reason the member sees. The verified job
    after that counts again."""
    pod = pod_of_anchor(session, anchor.id)
    member = session.get(PodMember, (pod.id, junior_id))
    if member is None:
        raise HTTPException(404, "not_in_team")
    done = len(skill_record(session, junior_id, pod.skill))
    if member.hold_at_jobs is not None and done <= member.hold_at_jobs:
        raise HTTPException(409, "already_paused")
    if member.level >= 5:
        raise HTTPException(409, "already_top")
    member.hold_at_jobs, member.hold_reason = done + 1, reason.strip()
    session.add_all([member, LevelChange(pod_id=pod.id, junior_id=junior_id, old_level=member.level,
                                         new_level=member.level, reason=reason.strip(), kind="paused")])
    notify.send(session, [junior_id], "promotion_paused", pod.id)
    session.commit()
    session.refresh(member)
    return member


def last_change(session: Session, pod_id: str, junior_id: str) -> LevelChange | None:
    return session.exec(select(LevelChange).where(LevelChange.pod_id == pod_id, LevelChange.junior_id == junior_id)
                        .order_by(LevelChange.created_at.desc())).first()


def jobs_last_30_days(session: Session, pod_id: str, junior_id: str) -> int:
    """How many jobs the member was given in the last 30 days (the team's fairness view)."""
    since = (utcnow() - timedelta(days=30)).replace(tzinfo=None)
    jobs = session.exec(select(Job).where(Job.pod_id == pod_id, Job.junior_id == junior_id)).all()
    return sum(1 for j in jobs if j.assigned_at and j.assigned_at.replace(tzinfo=None) >= since)


def evidence(session: Session, pod: Pod, junior_id: str) -> dict:
    """Facts behind the badge in this team, shown next to it."""
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
    posted to everyone, Anchors and Mentors with the skill apply and the client chooses one."""
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
        notify.send(session, notify.anchors_with_skill(session, job.skill)
                    + notify.mentors_with_skill(session, job.skill), "job_open", job.id)
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


VIDEO_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "drive.google.com",
               "vimeo.com", "www.vimeo.com", "loom.com", "www.loom.com"}


def video_link_ok(link: str) -> bool:
    """Only video sites the client can open in a browser; nothing is fetched by Sajha Kaam."""
    parts = urlparse(link)
    host = (parts.hostname or "").lower()
    return parts.scheme == "https" and (host in VIDEO_HOSTS or uploads.is_our_video(link, host, parts.path))


def apply_for_job(session: Session, user: User, job: Job, note: str, video_link: str = "") -> JobApplication:
    """Applying for an open job is agreeing to the client's agreement as written. The client chooses.
    A Mentor adds a short video (up to 2 minutes) so the client can see who they are choosing."""
    if job.state != "open":
        raise HTTPException(409, "job_not_open")
    pod = apply_team(session, user, job.skill)
    if pod is None:
        raise HTTPException(403, "cannot_apply")
    if session.exec(select(JobApplication).where(JobApplication.job_id == job.id,
                                                 JobApplication.applicant_id == user.id)).first():
        raise HTTPException(409, "already_applied")
    video_link = video_link.strip()
    if user.role == "junior" and not video_link:
        raise HTTPException(422, "video_required")
    if video_link and not video_link_ok(video_link):
        raise HTTPException(422, "video_link_not_supported")
    app = JobApplication(job_id=job.id, applicant_id=user.id, pod_id=pod.id, note=note.strip(), video_link=video_link)
    session.add(app)
    notify.send(session, [job.client_id], "job_application", job.id)
    session.commit()
    session.refresh(app)
    return app


def applications_of(session: Session, job: Job) -> list[JobApplication]:
    return list(session.exec(select(JobApplication).where(JobApplication.job_id == job.id)
                             .order_by(JobApplication.created_at)).all())


def my_application(session: Session, user: User, job: Job) -> JobApplication | None:
    return session.exec(select(JobApplication).where(JobApplication.job_id == job.id,
                                                     JobApplication.applicant_id == user.id)).first()


def choose_applicant(session: Session, client: User, job: Job, application_id: str) -> Job:
    """The client chooses who does an open job. A Team Leader gives it to their team as usual; a
    Mentor does it themselves, and their own Team Leader still checks the work before the client."""
    if job.client_id != client.id:
        raise HTTPException(403, "not_your_job")
    if job.state != "open":
        raise HTTPException(409, "job_not_open")
    app = session.get(JobApplication, application_id)
    if app is None or app.job_id != job.id or app.status != "waiting":
        raise HTTPException(404, "application_not_found")
    pod = session.get(Pod, app.pod_id)
    applicant = session.get(User, app.applicant_id)
    member = session.get(PodMember, (pod.id, applicant.id)) if applicant.role == "junior" else None
    if applicant.role == "junior" and (member is None or member.level != notify.MENTOR):
        raise HTTPException(409, "no_longer_mentor")  # the badge changed after applying
    now = utcnow()
    job.pod_id, job.state, job.agreed_at = pod.id, "agreed", now
    if member is not None:
        # Applying was the Mentor's "I accept": they start straight away at their level.
        job.junior_id, job.supervision_level, job.junior_accepted_at = applicant.id, member.level, now
        job.assigned_at = now
        job.state = "working"
        notify.send(session, [pod.anchor_id], "mentor_chosen", job.id)
    if session.get(AnchorClient, (pod.anchor_id, client.id)) is None:
        session.add(AnchorClient(anchor_id=pod.anchor_id, client_id=client.id))
    for other in applications_of(session, job):
        if other.status != "waiting":
            continue
        other.status, other.decided_at = ("chosen" if other.id == app.id else "not_chosen"), now
        session.add(other)
        notify.send(session, [other.applicant_id],
                    "application_chosen" if other.id == app.id else "application_not_chosen", job.id)
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
    if budget_minor != job.budget_minor and job.payment != "unpaid":
        raise HTTPException(409, "already_paid")  # the client paid this budget; only the deadline can change
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
    if member.level == 1 and job.junior_id != junior_id:
        # Like an instructor's limit of student pilots: a Leader supervises only a few Starters at once.
        starters = session.exec(select(Job).where(Job.pod_id == pod.id, Job.supervision_level == 1,
                                                  Job.state.in_(("assigned", "working", "submitted", "sent_back")),
                                                  Job.id != job.id)).all()
        if len(starters) >= load_yaml("guthi.yaml")["beginner_limit"]:
            raise HTTPException(409, "beginner_limit")
    job.junior_id, job.state, job.supervision_level = junior_id, "assigned", member.level
    job.junior_accepted_at, job.assigned_at = None, utcnow()
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


ACTIVE = ("agreed", "assigned", "working", "submitted", "sent_back")


def due_at(job: Job):
    """When the work is due: the agreed date plus the deadline in days (amendments included)."""
    if job.agreed_at is None:
        return None
    agreed = job.agreed_at if job.agreed_at.tzinfo else job.agreed_at.replace(tzinfo=UTC)  # SQLite drops the zone
    return agreed + timedelta(days=job.deadline_days)


def pay(session: Session, client: User, job: Job) -> Job:
    """Demo payment: the client pays the agreed budget; it is held until they accept the work."""
    if job.client_id != client.id:
        raise HTTPException(403, "not_your_job")
    if job.agreed_at is None or job.state == "client_accepted":
        raise HTTPException(409, "cannot_pay_now")
    if job.payment != "unpaid":
        raise HTTPException(409, "already_paid")
    job.payment, job.paid_at = "held", utcnow()
    a = anchor_of(session, job)
    notify.send(session, [a.id] + ([job.junior_id] if job.junior_id else []), "payment_held", job.id)
    return _save(session, job)


def team_money(session: Session, pod: Pod) -> tuple[list[dict], list[dict]]:
    """The team's demo money per currency (paid out, held, the Leader's share), and each member's earnings."""
    totals: dict[str, dict] = {}
    members: dict[tuple[str, str], dict] = {}
    for job in session.exec(select(Job).where(Job.pod_id == pod.id, Job.payment != "unpaid")).all():
        t = totals.setdefault(job.currency, {"currency": job.currency, "paid_out_minor": 0, "held_minor": 0,
                                             "anchor_minor": 0, "jobs_paid": 0})
        if job.payment == "held":
            t["held_minor"] += job.budget_minor
            continue
        s = split(job.budget_minor, job.supervision_level)
        t["paid_out_minor"] += job.budget_minor
        t["anchor_minor"] += s["anchor"]
        t["jobs_paid"] += 1
        m = members.setdefault((job.junior_id, job.currency), {"junior_id": job.junior_id, "currency": job.currency,
                                                                "amount_minor": 0, "jobs": 0})
        m["amount_minor"] += s["junior"]
        m["jobs"] += 1
    return list(totals.values()), sorted(members.values(), key=lambda m: -m["amount_minor"])


def junior_money(session: Session, junior_id: str) -> list[dict]:
    """A member's own demo earnings per currency: paid out to them, and their share still held."""
    out: dict[str, dict] = {}
    for job in session.exec(select(Job).where(Job.junior_id == junior_id, Job.payment != "unpaid")).all():
        row = out.setdefault(job.currency, {"currency": job.currency, "paid_out_minor": 0, "held_minor": 0})
        row["paid_out_minor" if job.payment == "paid_out" else "held_minor"] += split(job.budget_minor, job.supervision_level)["junior"]
    return list(out.values())


def accept(session: Session, client: User, job: Job, show_client: bool) -> LogEntry:
    if job.client_id != client.id:
        raise HTTPException(403, "not_your_job")
    if job.state != "anchor_approved":
        raise HTTPException(409, "not_ready_for_client")
    if job.payment != "held":
        raise HTTPException(409, "not_paid")  # pay first; accepting releases the money
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
    job.payment, job.paid_out_at = "paid_out", now
    notify.send(session, [junior.id], "log_signed", job.id)
    notify.send(session, [anchor.id], "client_accepted", job.id)
    session.add_all([entry, job])
    session.flush()
    promote_by_record(session, junior.id, job.skill)  # badges go up by the public rules, never by hand
    session.commit()
    session.refresh(entry)
    return entry
