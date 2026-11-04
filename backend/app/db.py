from collections.abc import Iterator

from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

from app import models  # noqa: F401  (registers tables)
from app.config import settings

engine = create_engine(settings().database_url, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _sqlite_speed(dbapi_conn, _record) -> None:
    """Write-ahead log: each save no longer waits for the disk, which keeps the demo fast."""
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA synchronous=NORMAL")
    cur.close()


def init_db(reset: bool = False) -> None:
    if reset:
        SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
