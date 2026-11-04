"""The job room: a small shared space for the work once the agreement is final.

Tasks (start from the agreement's deliverables; the member and the Team Leader add, tick and date
them), the deadline, and files (links or uploads). The client can follow the tasks and the deadline,
but sees work only after the Team Leader approves it, so files stay between the member and the Leader.
"""

from urllib.parse import urlparse

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import Job, RoomFile, RoomMessage, RoomTask, User, utcnow
from app.services import notify
from app.services.work import anchor_of

CLOSED = ("draft", "with_client", "with_anchor", "open")


def role_in(session: Session, user: User, job: Job) -> str | None:
    """'member', 'leader' or 'client' if this person is in the room, else None."""
    if job.state in CLOSED or job.agreed_at is None:
        return None
    if user.id == job.junior_id:
        return "member"
    a = anchor_of(session, job)
    if a is not None and user.id == a.id:
        return "leader"
    if user.id == job.client_id:
        return "client"
    return None


def _need(session: Session, user: User, job: Job, *, edit: bool = False) -> str:
    role = role_in(session, user, job)
    if role is None:
        raise HTTPException(404, "room_not_found")
    if edit and role == "client":
        raise HTTPException(403, "client_reads_only")
    if edit and job.state == "client_accepted":
        raise HTTPException(409, "job_finished")
    return role


def tasks(session: Session, job: Job) -> list[RoomTask]:
    rows = session.exec(select(RoomTask).where(RoomTask.job_id == job.id).order_by(RoomTask.created_at)).all()
    if not rows and job.agreed_at is not None:
        # The first tasks are the agreement's deliverables, so the room is never empty.
        creator = anchor_of(session, job)
        rows = [RoomTask(job_id=job.id, title=d, created_by=creator.id if creator else job.client_id) for d in job.deliverables]
        session.add_all(rows)
        session.commit()
    return list(rows)


def view(session: Session, user: User, job: Job) -> dict:
    role = _need(session, user, job)
    ts = tasks(session, job)
    files = [] if role == "client" else list(session.exec(select(RoomFile).where(RoomFile.job_id == job.id)
                                                           .order_by(RoomFile.created_at.desc())).all())
    msgs = [] if role == "client" else list(session.exec(select(RoomMessage).where(RoomMessage.job_id == job.id)
                                                          .order_by(RoomMessage.created_at)).all())
    ids = {f.added_by for f in files} | {m.author_id for m in msgs}
    names = {u.id: u.display_name for u in (session.get(User, i) for i in ids) if u}
    return {"role": role, "can_edit": role != "client" and job.state != "client_accepted", "tasks": ts,
            "files": [(f, names.get(f.added_by, "")) for f in files],
            "messages": [(m, names.get(m.author_id, ""), m.author_id == user.id) for m in msgs]}


def add_message(session: Session, user: User, job: Job, text: str) -> RoomMessage:
    """The member and the Leader talk here; the client sees the work once the Leader approves it."""
    role = _need(session, user, job, edit=True)
    msg = RoomMessage(job_id=job.id, author_id=user.id, text=text.strip())
    session.add(msg)
    other = anchor_of(session, job).id if role == "member" else job.junior_id
    if other:
        notify.send(session, [other], "room_message", job.id)
    session.commit()
    session.refresh(msg)
    return msg


def add_task(session: Session, user: User, job: Job, title: str, due_date: str) -> RoomTask:
    _need(session, user, job, edit=True)
    task = RoomTask(job_id=job.id, title=title.strip(), due_date=due_date.strip(), created_by=user.id)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def update_task(session: Session, user: User, job: Job, task_id: str, *, done: bool | None, title: str | None,
                due_date: str | None) -> RoomTask:
    _need(session, user, job, edit=True)
    task = session.get(RoomTask, task_id)
    if task is None or task.job_id != job.id:
        raise HTTPException(404, "task_not_found")
    if done is not None:
        task.done, task.done_at = done, (utcnow() if done else None)
    if title is not None and title.strip():
        task.title = title.strip()
    if due_date is not None:
        task.due_date = due_date.strip()
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def delete_task(session: Session, user: User, job: Job, task_id: str) -> None:
    _need(session, user, job, edit=True)
    task = session.get(RoomTask, task_id)
    if task is None or task.job_id != job.id:
        raise HTTPException(404, "task_not_found")
    session.delete(task)
    session.commit()


def add_file(session: Session, user: User, job: Job, label: str, link: str) -> RoomFile:
    role = _need(session, user, job, edit=True)
    link = link.strip()
    if urlparse(link).scheme != "https":
        raise HTTPException(422, "link_must_be_https")
    f = RoomFile(job_id=job.id, label=label.strip() or link, link=link, added_by=user.id)
    session.add(f)
    other = anchor_of(session, job).id if role == "member" else job.junior_id
    if other:
        notify.send(session, [other], "room_file", job.id)
    session.commit()
    session.refresh(f)
    return f
