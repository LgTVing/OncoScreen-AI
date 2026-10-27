from ai_core.rag.corpus import load_docs
from ai_core.schemas import CancerType, Gender, IntakeProfile, RiskLevel
from ai_core.tools.eligibility import evaluate, load_rules


def _types(intake: IntakeProfile) -> list[str]:
    return sorted(s.cancer_type.value for s in evaluate(intake).suggestions)


def test_every_rule_points_to_existing_guideline_section():
    docs = load_docs()
    for rule in load_rules():
        assert rule.doc_id in docs and rule.section in docs[rule.doc_id].sections


def test_female_45():
    assert _types(IntakeProfile(age=45, gender=Gender.female)) == ["breast", "cervical", "colorectal"]


def test_male_smoker_needs_20_pack_years_for_lung():
    heavy = IntakeProfile(age=55, gender=Gender.male, smoking=True, pack_years=30)
    light = IntakeProfile(age=55, gender=Gender.male, smoking=True, pack_years=5)
    assert _types(heavy) == ["colorectal", "lung", "prostate"]
    assert _types(light) == ["colorectal", "prostate"]
    assert any(f.cancer_type == CancerType.lung and f.level == RiskLevel.high for f in evaluate(heavy).risk_factors)


def test_family_history_marks_elevated_risk_with_note():
    result = evaluate(IntakeProfile(age=45, gender=Gender.female, family_history=[CancerType.breast]))
    breast = next(s for s in result.suggestions if s.cancer_type == CancerType.breast)
    assert breast.elevated_risk and breast.note
    assert all(s.sources for s in result.suggestions)


def test_hepatitis_triggers_liver_surveillance():
    assert "liver" in _types(IntakeProfile(age=40, gender=Gender.male, hepatitis_b_or_c=True))


def test_unknown_demographics_or_personal_history_give_no_suggestions():
    assert not evaluate(IntakeProfile(age=45)).evaluated
    assert evaluate(IntakeProfile(age=45, gender=Gender.female, personal_cancer_history=True)).suggestions == []
