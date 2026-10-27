"""Góc nhìn bệnh nhân về lần khám: chỉ thấy kết luận + kế hoạch sau khi bác sĩ kết thúc khám."""

from ai_core.schemas import QuestionAnswer
from fastapi import APIRouter

from app.api.deps import DB, Patient
from app.schemas.common import QuestionIn
from app.schemas.encounter import EncounterOut
from app.services import encounter_service

router = APIRouter()


@router.get("/{encounter_id}", response_model=EncounterOut)
def get_encounter(encounter_id: str, user: Patient, db: DB):
    return encounter_service.get_for(db, encounter_id, user)


@router.post("/{encounter_id}/questions", response_model=QuestionAnswer)
async def ask(encounter_id: str, body: QuestionIn, user: Patient, db: DB):
    return await encounter_service.ask_patient_question(db, user, encounter_id, body.question)
