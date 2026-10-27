from __future__ import annotations

from sqlalchemy import JSON, Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models._common import Timestamps, UUIDPk


class Consultation(UUIDPk, Timestamps, Base):
    """Phiên tư vấn với Navigator. Ẩn danh (patient_id NULL, truy cập bằng token) cho tới khi gắn vào tài khoản."""

    __tablename__ = "consultations"

    patient_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    intake: Mapped[dict] = mapped_column(JSON, default=dict)
    messages: Mapped[list] = mapped_column(JSON, default=list)
    last_reply: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    red_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    next_action: Mapped[str] = mapped_column(String(32), default="continue_chat")
