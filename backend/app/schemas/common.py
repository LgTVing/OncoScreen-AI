from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, Field, field_validator

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class QuestionIn(BaseModel):
    question: str = Field(min_length=1, max_length=1000)

    @field_validator("question")
    @classmethod
    def nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Câu hỏi không được để trống")
        return value.strip()
