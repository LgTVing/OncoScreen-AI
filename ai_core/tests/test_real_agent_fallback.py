from ai_core.api import ScreeningAgent
from ai_core.graph.nodes import assess_risk, recommend, retrieve
from ai_core.schemas import Answer, Gender, PatientContext, PatientProfile, RiskAssessment, Source


class _StructuredRisk:
    def invoke(self, _messages):
        return RiskAssessment(overall_summary="Đánh giá sơ bộ, cần bác sĩ xác nhận.")


class _FakeModel:
    def with_structured_output(self, _schema):
        return _StructuredRisk()


def _answers() -> list[Answer]:
    return [
        Answer(question_id="family_history", value=["Không"]),
        Answer(question_id="smoking", value=False),
        Answer(question_id="alcohol", value="Không"),
        Answer(question_id="hbv_hcv", value=False),
        Answer(question_id="symptom_lump", value=False),
        Answer(question_id="symptom_bleeding", value=False),
        Answer(question_id="symptom_weight_loss", value=False),
        Answer(question_id="symptom_persistent_pain", value=False),
    ]


def test_real_graph_completes_all_nodes_without_rag_data(monkeypatch):
    monkeypatch.setattr(assess_risk, "get_chat_model", lambda: _FakeModel())
    monkeypatch.setattr(retrieve, "retrieve_sources", lambda _profile, _risk: [])
    ctx = PatientContext(session_id="no-data", profile=PatientProfile(age=45, gender=Gender.female), answers=_answers())

    result = ScreeningAgent().run_screening(ctx)

    assert result.status == "pending_review"
    assert result.draft_plan is None
    assert result.risk_assessment and "Chưa đủ tài liệu" in result.risk_assessment.overall_summary
    assert [event["node"] for event in result.trace_events] == [
        "collect", "red_flag", "assess_risk", "retrieve", "recommend", "guardrail"
    ]
    assert result.trace_events[3]["source_count"] == 0


def test_real_graph_stops_on_red_flag_before_llm(monkeypatch):
    monkeypatch.setattr(assess_risk, "get_chat_model", lambda: (_ for _ in ()).throw(AssertionError("LLM called")))
    answers = [Answer(question_id="symptom_lump", value=True)]
    ctx = PatientContext(session_id="red-flag", profile=PatientProfile(age=45, gender=Gender.female), answers=answers)

    result = ScreeningAgent().run_screening(ctx)

    assert result.status == "red_flag"
    assert result.draft_plan is None
    assert [event["node"] for event in result.trace_events] == ["collect", "red_flag"]


def test_real_graph_keeps_pending_when_risk_model_fails_even_with_sources(monkeypatch):
    monkeypatch.setattr(assess_risk, "get_chat_model", lambda: (_ for _ in ()).throw(RuntimeError("provider")))
    monkeypatch.setattr(
        retrieve,
        "retrieve_sources",
        lambda _profile, _risk: [Source(doc_id="breast_sample", title="Sample", excerpt="Nhũ ảnh mỗi 2 năm")],
    )
    monkeypatch.setattr(recommend, "recommend", lambda *_args: (_ for _ in ()).throw(AssertionError("called")))
    ctx = PatientContext(
        session_id="model-fail",
        profile=PatientProfile(age=45, gender=Gender.female),
        answers=_answers(),
    )

    result = ScreeningAgent().run_screening(ctx)

    assert result.status == "pending_review" and result.draft_plan is None
    assert [event["node"] for event in result.trace_events][-2:] == ["recommend", "guardrail"]
