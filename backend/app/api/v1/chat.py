"""Chat giáo dục cho bệnh nhân; chỉ lưu metadata phục vụ quan sát."""

from ai_core.schemas import QuestionAnswer
from fastapi import APIRouter

from app.api.deps import DB, Patient
from app.models import AuditLog
from app.schemas.chat import ChatIn
from app.services import agent_service

router = APIRouter()


@router.post("", response_model=QuestionAnswer)
async def chat(body: ChatIn, user: Patient, db: DB) -> QuestionAnswer:
    answer = await agent_service.answer_education_question(body.question, body.cancer_type, body.history)
    db.add(
        AuditLog(
            actor_id=user.id,
            action="chat.ask",
            after={
                "trace_id": answer.trace_id,
                "cancer_type": body.cancer_type.value,
                "source_count": len(answer.sources),
                "insufficient_evidence": answer.insufficient_evidence,
            },
        )
    )
    db.commit()
    return answer
