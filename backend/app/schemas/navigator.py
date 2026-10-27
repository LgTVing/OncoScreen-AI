"""Request/response của Navigator (công khai) — mirror API_CONTRACT §1."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from ai_core.schemas import Answer, CancerType, IntakeProfile, NavigatorReply
from pydantic import BaseModel, Field, model_validator


class NavigatorMessageIn(BaseModel):
    message: str | None = Field(default=None, max_length=2000)
    answers: list[Answer] = Field(default_factory=list, max_length=40)

    @model_validator(mode="after")
    def _not_empty(self) -> NavigatorMessageIn:
        if not (self.message and self.message.strip()) and not self.answers:
            raise ValueError("Cần message hoặc answers")
        return self


class ConsultMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    at: datetime


class ConsultationOut(BaseModel):
    id: str
    linked: bool
    intake: IntakeProfile
    messages: list[ConsultMessage] = Field(default_factory=list)
    last_reply: NavigatorReply | None = None
    created_at: datetime
    updated_at: datetime


class ConsultationCreated(BaseModel):
    access_token: str
    consultation: ConsultationOut


class ServiceOut(BaseModel):
    code: str
    name: str
    description: str
    cancer_types: list[CancerType]
