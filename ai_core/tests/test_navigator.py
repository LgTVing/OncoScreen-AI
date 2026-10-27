from ai_core.agents import navigator as nav_module
from ai_core.agents.navigator import NavigatorAgent
from ai_core.mock import MockAgent
from ai_core.schemas import Answer, IntakeProfile, NextAction


class _Structured:
    def __init__(self, output):
        self.output = output

    def invoke(self, _messages):
        if isinstance(self.output, Exception):
            raise self.output
        return self.output


class _Model:
    def __init__(self, output, extract=None):
        self.output, self.extract = output, extract

    def with_structured_output(self, schema):
        return _Structured(self.extract if schema.__name__ == "_ExtractedIntake" else self.output)


def _nodes(reply) -> list[str]:
    return [e["node"] for e in reply.trace_events]


def test_red_flag_stops_before_retrieval_and_routes_to_urgent_care():
    reply = MockAgent().navigate(message="Em sờ thấy khối u ở vú", answers=[], intake=IntakeProfile(), history=[])
    assert reply.red_flag.detected and reply.next_action == NextAction.urgent_care
    assert reply.booking_hint and reply.booking_hint.priority.value == "urgent"
    assert reply.suggestions == [] and "retrieve" not in _nodes(reply)
    assert _nodes(reply) == ["input_guard", "update_intake", "triage"]


def test_red_flag_persists_across_turns():
    first = MockAgent().navigate(message="Tôi đi ngoài ra máu", answers=[], intake=IntakeProfile(), history=[])
    second = MockAgent().navigate(message="Tôi nữ 45 tuổi", answers=[], intake=first.intake, history=[])
    assert second.next_action == NextAction.urgent_care


def test_quick_form_gives_grounded_suggestions_and_booking_hint():
    answers = [
        Answer(question_id="age", value=55),
        Answer(question_id="gender", value="Nam"),
        Answer(question_id="smoking", value=True),
        Answer(question_id="pack_years", value=30),
    ]
    reply = MockAgent().navigate(message=None, answers=answers, intake=IntakeProfile(), history=[])
    assert reply.next_action == NextAction.suggest_booking
    assert {s.cancer_type.value for s in reply.suggestions} == {"colorectal", "lung", "prostate"}
    assert "lung_screening" in reply.booking_hint.service_codes
    assert all(s.sources for s in reply.suggestions) and reply.sources


def test_missing_demographics_keeps_chatting():
    reply = MockAgent().navigate(message="Tầm soát ung thư là gì?", answers=[], intake=IntakeProfile(), history=[])
    assert reply.next_action == NextAction.continue_chat and reply.missing_info == ["age", "gender"]
    assert "tuổi" in reply.reply


def test_out_of_scope_question_is_refused_without_llm(monkeypatch):
    monkeypatch.setattr("ai_core.llm.get_chat_model", lambda: (_ for _ in ()).throw(AssertionError("LLM called")))
    agent = NavigatorAgent(use_llm=True, dense=False)
    reply = agent.run(
        message="Kết quả PSA của tôi là 6 có phải ung thư không?", answers=[], intake=IntakeProfile(), history=[]
    )
    assert "không thể chẩn đoán" in reply.reply
    assert reply.trace_events[0]["out_of_scope"] is True


def test_llm_reply_with_valid_citation_is_used(monkeypatch):
    monkeypatch.setattr(
        "ai_core.llm.get_chat_model",
        lambda: _Model(
            {"reply": "Phụ nữ 40–74 tuổi nên chụp nhũ ảnh mỗi 2 năm.", "source_ids": ["breast_uspstf_2024"]}
        ),
    )
    reply = NavigatorAgent(use_llm=True, dense=False).run(
        message="Chụp nhũ ảnh bao lâu một lần?", answers=[], intake=IntakeProfile(), history=[]
    )
    assert reply.reply.startswith("Phụ nữ 40–74") and reply.sources[0].doc_id == "breast_uspstf_2024"
    assert reply.trace_events[-2]["generator"] == "llm"


def test_llm_reply_with_invented_source_or_number_falls_back(monkeypatch):
    for bad in (
        {"reply": "Nên chụp nhũ ảnh mỗi năm.", "source_ids": ["invented_doc"]},
        {"reply": "Nên chụp nhũ ảnh từ 35 tuổi.", "source_ids": ["breast_uspstf_2024"]},
        {"reply": "Bạn bị ung thư vú.", "source_ids": ["breast_uspstf_2024"]},
        RuntimeError("provider down"),
    ):
        monkeypatch.setattr("ai_core.llm.get_chat_model", lambda bad=bad: _Model(bad))
        reply = NavigatorAgent(use_llm=True, dense=False).run(
            message="Chụp nhũ ảnh bao lâu một lần?", answers=[], intake=IntakeProfile(), history=[]
        )
        assert reply.trace_events[-2]["generator"] == "template_fallback"
        assert "35 tuổi" not in reply.reply and "Bạn bị" not in reply.reply


def test_llm_extraction_only_fills_missing_fields(monkeypatch):
    monkeypatch.setattr(
        "ai_core.llm.get_chat_model",
        lambda: _Model(RuntimeError("no reply"), extract={"age": 47, "gender": "female", "smoking": None}),
    )
    reply = NavigatorAgent(use_llm=True, dense=False).run(
        message="Mình bốn mươi bảy, là con gái", answers=[], intake=IntakeProfile(), history=[]
    )
    assert reply.intake.age == 47 and reply.intake.gender.value == "female"
    assert reply.trace_events[1]["extractor"] == "rules+llm"


def test_module_exposes_interval_helper():
    assert nav_module.interval_vi(24) == "mỗi 2 năm" and nav_module.interval_vi(6) == "mỗi 6 tháng"
