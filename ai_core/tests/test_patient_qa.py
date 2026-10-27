from datetime import datetime

from ai_core.schemas import CancerType, PlanItem, ScreeningPlan, Source
from ai_core.tools import patient_qa

SOURCE = Source(doc_id="breast_uspstf_2024", title="USPSTF", excerpt="Nhũ ảnh mỗi 2 năm.")
PLAN = ScreeningPlan(
    items=[
        PlanItem(cancer_type=CancerType.breast, method="Nhũ ảnh", interval_months=24, rationale="r", sources=[SOURCE])
    ],
    generated_at=datetime.now(),
    model="doctor",
)


class _Model:
    def __init__(self, output):
        self.output = output

    def with_structured_output(self, _schema):
        model = self

        class _S:
            def invoke(self, _messages):
                return model.output

        return _S()


def test_needs_approved_plan_and_refuses_clinical_question(monkeypatch):
    assert patient_qa.answer_question("Tôi nên làm gì?", None).insufficient_evidence
    monkeypatch.setattr("ai_core.llm.get_chat_model", lambda: (_ for _ in ()).throw(AssertionError("LLM called")))
    result = patient_qa.answer_question("Kết quả xét nghiệm của tôi có phải ung thư không?", PLAN)
    assert result.insufficient_evidence and result.sources == []


def test_llm_answer_must_cite_plan_source(monkeypatch):
    monkeypatch.setattr(
        "ai_core.llm.get_chat_model", lambda: _Model({"answer": "Chụp mỗi 2 năm.", "source_ids": [SOURCE.doc_id]})
    )
    assert patient_qa.answer_question("Bao lâu chụp một lần?", PLAN).sources == [SOURCE]
    monkeypatch.setattr(
        "ai_core.llm.get_chat_model", lambda: _Model({"answer": "Chụp mỗi 2 năm.", "source_ids": ["x"]})
    )
    assert patient_qa.answer_question("Bao lâu chụp một lần?", PLAN).insufficient_evidence


def test_mock_mode_summarizes_plan():
    result = patient_qa.answer_question("Kế hoạch gồm gì?", PLAN, use_llm=False)
    assert "Nhũ ảnh" in result.answer and result.sources
