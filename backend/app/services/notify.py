"""In-app notifications. Only a kind and an id are stored; the app writes the words in the
reader's language, so no message text is duplicated or stored."""

from sqlmodel import Session, select

from app.models import JuniorProfile, Notification, Pod


def send(session: Session, user_ids: list[str] | set[str], kind: str, ref: str = "") -> None:
    for uid in set(user_ids):
        session.add(Notification(user_id=uid, kind=kind, ref=ref))


def juniors_with_skill(session: Session, skill: str) -> list[str]:
    """Everyone with the skill, not a ranked few: matching is a plain rule, never a score."""
    return [p.user_id for p in session.exec(select(JuniorProfile)).all() if skill in (p.skills or [])]


def anchors_with_skill(session: Session, skill: str) -> list[str]:
    return [p.anchor_id for p in session.exec(select(Pod).where(Pod.skill == skill)).all()]
