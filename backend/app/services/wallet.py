"""The wallet: a member's and a Team Leader's share of every accepted job, minus what they took out.

Money arrives when the client accepts the work (the held payment is released). Withdrawals are a demo:
they are recorded and marked sent at once; no money moves.
"""

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import Job, Pod, User, Withdrawal
from app.services import notify
from app.services.work import split

METHODS = ("esewa", "khalti", "bank")


def balances(session: Session, user: User) -> list[dict]:
    rows: dict[str, dict] = {}

    def row(cur: str) -> dict:
        return rows.setdefault(cur, {"currency": cur, "earned_minor": 0, "held_minor": 0, "withdrawn_minor": 0})

    pods = [p.id for p in session.exec(select(Pod).where(Pod.anchor_id == user.id)).all()]
    q = select(Job).where(Job.payment != "unpaid")
    for job in session.exec(q).all():
        share = 0
        s = split(job.budget_minor, job.supervision_level) if job.supervision_level else None
        if s and job.junior_id == user.id:
            share += s["junior"]
        if s and job.pod_id in pods:
            share += s["anchor"]
        if share:
            row(job.currency)["earned_minor" if job.payment == "paid_out" else "held_minor"] += share
    for w in session.exec(select(Withdrawal).where(Withdrawal.user_id == user.id)).all():
        row(w.currency)["withdrawn_minor"] += w.amount_minor
    out = list(rows.values()) or [row("USD")]
    for r in out:
        r["available_minor"] = r["earned_minor"] - r["withdrawn_minor"]
    return out


def history(session: Session, user: User) -> list[Withdrawal]:
    return list(session.exec(select(Withdrawal).where(Withdrawal.user_id == user.id)
                             .order_by(Withdrawal.created_at.desc())).all())


def mask(account: str) -> str:
    a = account.strip()
    return ("\u2022\u2022\u2022\u2022 " + a[-4:]) if len(a) > 4 else a


def withdraw(session: Session, user: User, amount_minor: int, currency: str, method: str, account: str) -> Withdrawal:
    if method not in METHODS:
        raise HTTPException(422, "unknown_method")
    have = next((b["available_minor"] for b in balances(session, user) if b["currency"] == currency), 0)
    if amount_minor <= 0 or amount_minor > have:
        raise HTTPException(409, "not_enough_money")
    w = Withdrawal(user_id=user.id, amount_minor=amount_minor, currency=currency, method=method, account=mask(account))
    session.add(w)
    session.flush()
    notify.send(session, [user.id], "withdrawal_sent", w.id)
    session.commit()
    session.refresh(w)
    return w
