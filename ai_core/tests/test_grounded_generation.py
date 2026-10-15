from ai_core.schemas import CancerType, Gender, PatientProfile, RiskAssessment, Source
from ai_core.tools import patient_qa, screening_recommender


class _Structured:
    def __init__(self, output):
        self.output = output

    def invoke(self, _messages):
        return self.output


class _Model:
    def __init__(self, output):
        self.output = output

    def with_structured_output(self, _schema):
        return _Structured(self.output)


SOURCE = Source(doc_id="breast_uspstf_2024", title="USPSTF", excerpt="Nhũ ảnh mỗi hai năm.")


def _plan(monkeypatch, source_ids):
    monkeypatch.setattr(
        screening_recommender,
        "get_chat_model",
        lambda: _Model(
            {
                "items": [
                    {
                        "cancer_type": "breast",
                        "method": "Nhũ ảnh",
                        "interval_months": 24,
                        "rationale": "Theo nguồn đã truy xuất.",
                        "source_ids": source_ids,
                    }
                ]
            }
        ),
    )
    return screening_recommender.recommend(
        PatientProfile(age=45, gender=Gender.female), RiskAssessment(overall_summary="Sơ bộ"), [SOURCE]
    )


def test_recommendation_only_uses_retrieved_source(monkeypatch):
    plan = _plan(monkeypatch, [SOURCE.doc_id])
    assert plan and plan.items[0].sources == [SOURCE]
    assert plan.items[0].next_due is None
    assert plan.items[0].cancer_type == CancerType.breast


def test_recommendation_rejects_invented_source(monkeypatch):
    assert _plan(monkeypatch, ["invented_guideline"]) is None


def test_patient_qa_needs_approved_plan_and_source(monkeypatch):
    assert patient_qa.answer_question("Tôi nên làm gì?", None).insufficient_evidence
    plan = _plan(monkeypatch, [SOURCE.doc_id])
    monkeypatch.setattr(
        patient_qa,
        "get_chat_model",
        lambda: _Model({"answer": "Kế hoạch đã duyệt nêu nhũ ảnh.", "source_ids": [SOURCE.doc_id]}),
    )
    answer = patient_qa.answer_question("Kế hoạch nêu phương pháp gì?", plan)
    assert answer.sources == [SOURCE]
    assert not answer.insufficient_evidence


def test_patient_qa_refuses_clinical_question(monkeypatch):
    plan = _plan(monkeypatch, [SOURCE.doc_id])
    monkeypatch.setattr(patient_qa, "get_chat_model", lambda: (_ for _ in ()).throw(AssertionError("LLM called")))
    result = patient_qa.answer_question("Kết quả xét nghiệm của tôi có phải ung thư không?", plan)
    assert result.insufficient_evidence
    assert result.sources == []
