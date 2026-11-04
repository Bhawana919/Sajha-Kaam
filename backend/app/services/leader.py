"""Becoming a verified Team Leader.

Two ways: a member who is a Mentor (★★★★★, earned by the public badge rules) in a skill becomes a Leader
in that skill at once, because the record is the proof. Anyone else (a member who is not a Mentor yet, or a
Leader who signed up) sends proof of their work, and a Sajha Kaam reviewer approves or declines it with a
reason. Only verified Leaders apply for jobs clients post, so clients can trust who comes to them.
"""

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import LeaderApplication, Pod, PodMember, User, utcnow
from app.services import agreement, notify

MENTOR = 5


def mentor_skills(session: Session, user: User) -> list[str]:
    if user.role != "junior":
        return []
    rows = session.exec(select(PodMember).where(PodMember.junior_id == user.id, PodMember.level >= MENTOR)).all()
    return sorted({p.skill for p in (session.get(Pod, m.pod_id) for m in rows) if p})


def latest(session: Session, user: User) -> LeaderApplication | None:
    return session.exec(select(LeaderApplication).where(LeaderApplication.user_id == user.id)
                        .order_by(LeaderApplication.created_at.desc())).first()


def own_pod(session: Session, user: User) -> Pod | None:
    return session.exec(select(Pod).where(Pod.anchor_id == user.id)).first()


def reviewers(session: Session) -> list[str]:
    return [u.id for u in session.exec(select(User).where(User.role == "reviewer")).all()]


def apply(session: Session, user: User, skill: str, team_name: str, about: str, proof: list[str]) -> LeaderApplication:
    if user.role == "anchor" and user.leader_verified:
        raise HTTPException(409, "already_verified")
    last = latest(session, user)
    if last is not None and last.status == "pending":
        raise HTTPException(409, "already_waiting")
    if user.role == "anchor":
        pod = own_pod(session, user)
        skill, team_name = pod.skill, pod.name
    if skill not in agreement.skills():
        raise HTTPException(422, "unknown_skill")
    if len(team_name.strip()) < 3:
        raise HTTPException(422, "team_required")
    proof = [p.strip() for p in proof if p.strip()]
    if any(not p.startswith("https://") for p in proof):
        raise HTTPException(422, "link_must_be_https")
    by_record = skill in mentor_skills(session, user)
    if not by_record and not proof:
        raise HTTPException(422, "proof_required")
    app = LeaderApplication(user_id=user.id, skill=skill, team_name=team_name.strip(), about=about.strip(), proof=proof)
    session.add(app)
    session.flush()
    if by_record:
        _approve(session, app, by_record=True)
    else:
        notify.send(session, reviewers(session), "leader_application", app.id)
    session.commit()
    session.refresh(app)
    return app


def _approve(session: Session, app: LeaderApplication, by_record: bool = False) -> None:
    user = session.get(User, app.user_id)
    app.status, app.by_record, app.decided_at = "approved", by_record, utcnow()
    if user.role == "junior":
        # A new Leader with their own team. Their Work Record and badges stay theirs.
        user.role = "anchor"
        session.add(Pod(anchor_id=user.id, name=app.team_name, skill=app.skill,
                        about=app.about or f"{app.team_name}: work from Nepali businesses abroad."))
    user.leader_verified = True
    session.add_all([app, user])
    notify.send(session, [user.id], "leader_approved", app.id)


def pending(session: Session) -> list[LeaderApplication]:
    return list(session.exec(select(LeaderApplication).where(LeaderApplication.status == "pending")
                             .order_by(LeaderApplication.created_at)).all())


def decide(session: Session, app_id: str, approve: bool, reason: str = "") -> LeaderApplication:
    app = session.get(LeaderApplication, app_id)
    if app is None:
        raise HTTPException(404, "application_not_found")
    if app.status != "pending":
        raise HTTPException(409, "already_decided")
    if approve:
        _approve(session, app)
    else:
        if len(reason.strip()) < 5:
            raise HTTPException(422, "reason_required")
        app.status, app.reason, app.decided_at = "declined", reason.strip(), utcnow()
        session.add(app)
        notify.send(session, [app.user_id], "leader_declined", app.id)
    session.commit()
    session.refresh(app)
    return app
