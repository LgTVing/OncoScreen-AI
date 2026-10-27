from datetime import date

from ai_core.schemas import Answer, CancerType, Gender, IntakeProfile, PatientProfile
from ai_core.tools.intake import from_answers, from_profile, from_text, merge, missing_info


def test_extracts_age_gender_family_history():
    intake = from_text(IntakeProfile(), "Tôi là nữ 45 tuổi, mẹ tôi bị ung thư vú")
    assert intake.age == 45 and intake.gender == Gender.female
    assert intake.family_history == [CancerType.breast]
    assert intake.personal_cancer_history is None


def test_relative_age_is_not_user_age():
    intake = from_text(IntakeProfile(), "Mẹ tôi 70 tuổi bị ung thư đại tràng")
    assert intake.age is None
    assert intake.family_history == [CancerType.colorectal]


def test_relative_age_in_other_clause_is_not_user_age():
    intake = from_text(IntakeProfile(), "Bố tôi mất năm 60 tuổi vì ung thư phổi")
    assert intake.age is None and intake.family_history == [CancerType.lung]
    intake = from_text(IntakeProfile(), "Mẹ 70 tuổi bị ung thư vú, tôi là nữ 40 tuổi")
    assert intake.age == 40 and intake.gender == Gender.female
    assert from_text(IntakeProfile(), "Tôi đã bỏ thuốc lá và năm nay 62 tuổi").age == 62


def test_personal_history_and_birth_year():
    intake = from_text(IntakeProfile(), "Sinh năm 1976, nữ, đã từng bị ung thư vú", today=date(2026, 10, 27))
    assert intake.age == 50 and intake.personal_cancer_history is True


def test_smoking_pack_years_and_hepatitis():
    intake = from_text(IntakeProfile(), "Tôi nam 55 tuổi, hút thuốc 1 gói mỗi ngày trong 30 năm, bị viêm gan B")
    assert intake.gender == Gender.male and intake.smoking is True
    assert intake.pack_years == 30 and intake.hepatitis_b_or_c is True
    assert from_text(IntakeProfile(), "Tôi không hút thuốc").smoking is False


def test_answers_map_to_intake_and_keep_red_flag_codes():
    intake = from_answers(
        IntakeProfile(symptom_codes=["symptom_lump"]),
        [
            Answer(question_id="age", value="52"),
            Answer(question_id="gender", value="Nam"),
            Answer(question_id="family_history", value=["Ung thư phổi", "Khác"]),
            Answer(question_id="symptom_lump", value=False),
        ],
    )
    assert intake.age == 52 and intake.gender == Gender.male
    assert intake.family_history == [CancerType.lung, CancerType.other]
    assert intake.symptom_codes == ["symptom_lump"]  # cờ đã ghi nhận không bị gỡ


def test_missing_info_and_merge():
    assert missing_info(IntakeProfile()) == ["age", "gender"]
    assert "pack_years" in missing_info(IntakeProfile(age=60, gender=Gender.male, smoking=True))
    merged = merge(
        IntakeProfile(age=40), IntakeProfile(age=50, gender=Gender.female, family_history=[CancerType.breast])
    )
    assert merged.age == 40 and merged.gender == Gender.female and merged.family_history == [CancerType.breast]


def test_profile_codes_map_to_family_history():
    intake = from_profile(PatientProfile(age=45, gender=Gender.female, genetics_history=["breast_cancer_mother"]))
    assert intake.family_history == [CancerType.breast]
