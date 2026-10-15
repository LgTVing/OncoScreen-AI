"""Request cho chat kiến thức tầm soát chung."""

from ai_core.schemas import CancerType, ChatTurn
from pydantic import BaseModel, Field, field_validator


class ChatIn(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    cancer_type: CancerType
    history: list[ChatTurn] = Field(default_factory=list, max_length=8)

    @field_validator("question")
    @classmethod
    def nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Câu hỏi không được để trống")
        return value.strip()
