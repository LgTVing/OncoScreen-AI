from ai_core.schemas import Answer
from ai_core.tools.red_flag_detector import codes_from_text, detect_red_flags


def test_detects_lump_from_answers():
    r = detect_red_flags([Answer(question_id="symptom_lump", value=True)])
    assert r.detected and r.flags[0].code == "symptom_lump"
    assert r.flags[0].severity.value == "urgent"


def test_string_truthy_values():
    assert detect_red_flags([Answer(question_id="symptom_bleeding", value="yes")]).detected
    assert detect_red_flags([Answer(question_id="symptom_bleeding", value="có")]).detected


def test_no_false_positive_from_answers():
    answers = [
        Answer(question_id="symptom_lump", value=False),
        Answer(question_id="symptom_bleeding", value="no"),
        Answer(question_id="smoking", value=True),
    ]
    assert not detect_red_flags(answers).detected


def test_urgent_sorted_first():
    r = detect_red_flags(
        [Answer(question_id="symptom_weight_loss", value=True), Answer(question_id="symptom_lump", value=True)]
    )
    assert [f.severity.value for f in r.flags] == ["urgent", "soon"]


def test_free_text_with_and_without_diacritics():
    assert codes_from_text("Mấy hôm nay em sờ thấy một khối cứng ở vú") == ["symptom_lump"]
    assert codes_from_text("toi so thay cuc o co") == ["symptom_lump"]
    assert codes_from_text("Dạo này đi ngoài ra máu") == ["symptom_bleeding"]
    assert "symptom_weight_loss" in codes_from_text("Tôi sụt 6kg trong 2 tháng")


def test_free_text_negation_is_ignored():
    assert codes_from_text("Tôi không sờ thấy khối u nào") == []
    assert codes_from_text("Không bị ho ra máu") == []


def test_free_text_in_other_symptoms_answer():
    r = detect_red_flags([Answer(question_id="other_symptoms", value="Gần đây bị vàng da")])
    assert r.detected and r.flags[0].code == "symptom_jaundice"
