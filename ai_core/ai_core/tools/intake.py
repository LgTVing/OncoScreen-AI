"""Tool: intake — dựng IntakeProfile từ câu trả lời nhanh, văn bản tự do hoặc hồ sơ tài khoản.

Rule-based, chạy được không cần LLM. Giá trị đã có chỉ bị ghi đè bởi thông tin mới rõ ràng hơn;
mã red-flag chỉ cộng dồn.
"""

from __future__ import annotations

import re
from datetime import date

from ai_core.schemas import Answer, CancerType, Gender, IntakeProfile, PatientProfile
from ai_core.text import fold, is_negated, sentences
from ai_core.tools.red_flag_detector import codes_from_answers, codes_from_text

_CANCER_WORDS: list[tuple[str, CancerType]] = [
    (r"vu", CancerType.breast),
    (r"co tu cung", CancerType.cervical),
    (r"(dai truc trang|dai trang|truc trang|ruot)", CancerType.colorectal),
    (r"gan", CancerType.liver),
    (r"phoi", CancerType.lung),
    (r"tuyen tien liet", CancerType.prostate),
]
_RELATIVE = re.compile(
    r"\b(bo|me|cha|ba ngoai|ba noi|ong ngoai|ong noi|ong|ba|co|di|chu|bac|cau|mo|anh trai|chi gai|em gai|em trai|"
    r"anh chi em|chi ruot|anh ruot|con trai|con gai|nguoi than|gia dinh|ho hang)\b"
)
_SELF_CANCER = re.compile(r"\b(da tung |tung |da |dang |vua )?(bi|mac|dieu tri) ung thu")
_FIRST_PERSON = re.compile(r"\b(toi|minh|em|tui)\b")
_LABEL_TO_CANCER = {
    "ung thư vú": CancerType.breast,
    "ung thư cổ tử cung": CancerType.cervical,
    "ung thư đại trực tràng": CancerType.colorectal,
    "ung thư gan": CancerType.liver,
    "ung thư phổi": CancerType.lung,
    "ung thư tuyến tiền liệt": CancerType.prostate,
    "khác": CancerType.other,
}
_GENDER_LABEL = {
    "nữ": Gender.female,
    "nam": Gender.male,
    "khác": Gender.other,
    "female": Gender.female,
    "male": Gender.male,
    "other": Gender.other,
}


def _as_bool(value: object) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value == 1
    if isinstance(value, str):
        v = value.strip().casefold()
        if v in {"true", "yes", "có", "co", "1"}:
            return True
        if v in {"false", "no", "không", "khong", "0"}:
            return False
    return None


def _as_float(value: object) -> float | None:
    try:
        return float(str(value).replace(",", ".")) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def from_answers(intake: IntakeProfile, answers: list[Answer]) -> IntakeProfile:
    data = intake.model_dump()
    for a in answers:
        qid, v = a.question_id, a.value
        if qid == "age" and (age := _as_float(v)) is not None and 0 <= age <= 120:
            data["age"] = int(age)
        elif qid == "gender" and isinstance(v, str) and v.strip().casefold() in _GENDER_LABEL:
            data["gender"] = _GENDER_LABEL[v.strip().casefold()]
        elif qid == "family_history":
            values = v if isinstance(v, (list, tuple)) else [v]
            types = [
                _LABEL_TO_CANCER[str(x).strip().casefold()]
                for x in values
                if str(x).strip().casefold() in _LABEL_TO_CANCER
            ]
            data["family_history"] = list(dict.fromkeys(types))
        elif qid == "personal_cancer_history":
            data["personal_cancer_history"] = _as_bool(v)
        elif qid == "smoking":
            data["smoking"] = _as_bool(v)
        elif qid == "pack_years":
            data["pack_years"] = _as_float(v)
        elif qid == "hbv_hcv":
            data["hepatitis_b_or_c"] = _as_bool(v)
        elif qid == "cirrhosis":
            data["cirrhosis"] = _as_bool(v)
        elif qid == "hpv_vaccine":
            data["hpv_vaccinated"] = _as_bool(v)
    data["symptom_codes"] = list(dict.fromkeys([*intake.symptom_codes, *codes_from_answers(answers)]))
    for a in answers:
        if a.question_id == "other_symptoms" and isinstance(a.value, str):
            data["symptom_codes"] = list(dict.fromkeys([*data["symptom_codes"], *codes_from_text(a.value)]))
    return IntakeProfile.model_validate(data)


_RELATIVE_OWNER = re.compile(
    r"\b(bo|me|cha|ong|ba|anh|chi|em|co|di|chu|bac|cau|mo|con|vo|chong)\s+(toi|minh|tui|em)\s+(nam nay\s+)?$"
)


def _age(folded: str, today: date) -> int | None:
    for m in re.finditer(r"\b(\d{1,3})\s*(tuoi|t)\b", folded):
        before = folded[max(0, m.start() - 25) : m.start()]
        if _RELATIVE_OWNER.search(before):  # "mẹ tôi 70 tuổi" là tuổi của người thân
            continue
        return int(m.group(1))
    if m := re.search(r"sinh nam (19\d\d|20\d\d)", folded):
        return today.year - int(m.group(1))
    if m := re.search(r"nam nay (\d{1,3})\b", folded):
        return int(m.group(1))
    return None


def _gender(original: str, folded: str) -> Gender | None:
    low = original.casefold()
    female = [
        r"(tôi|em|mình|tui)\s+(là\s+)?(nữ|phụ nữ|con gái)",
        r"giới tính\s*:?\s*nữ",
        r"\bnữ\s*,?\s*\d{1,3}\s*tuổi",
        r"\d{1,3}\s*tuổi\s*,?\s*nữ\b",
    ]
    male = [
        r"(tôi|em|mình|tui)\s+(là\s+)?(nam|đàn ông|con trai)\b",
        r"giới tính\s*:?\s*nam\b",
        r"\bnam\s*,?\s*\d{1,3}\s*tuổi",
        r"\d{1,3}\s*tuổi\s*,?\s*nam\b",
    ]
    if any(re.search(p, low) for p in female) or re.search(r"(gioi tinh:? nu|toi la (nu|phu nu))\b", folded):
        return Gender.female
    if any(re.search(p, low) for p in male) or re.search(r"(gioi tinh:? nam|nam gioi|dan ong)\b", folded):
        return Gender.male
    return None


def _is_self_cancer(sentence: str) -> bool:
    """ "Tôi đã từng bị ung thư vú" / "50 tuổi, đã từng bị ung thư" → bản thân; "mẹ tôi bị ung thư" → người thân."""
    for clause in sentence.split(","):
        m = _SELF_CANCER.search(clause)
        if not m or is_negated(clause, m.start()):
            continue
        before = clause[: m.start()]
        if _RELATIVE.search(before):
            continue
        if not before.strip() or _FIRST_PERSON.search(before):
            return True
    return False


def from_text(intake: IntakeProfile, text: str, today: date | None = None) -> IntakeProfile:
    today = today or date.today()
    folded = fold(text)
    data = intake.model_dump()
    if (age := _age(folded, today)) is not None and 0 < age <= 110:
        data["age"] = age
    if (gender := _gender(text, folded)) is not None:
        data["gender"] = gender

    family = list(intake.family_history)
    for sent in sentences(folded):
        if _is_self_cancer(sent):
            data["personal_cancer_history"] = True
            continue
        if "ung thu" not in sent or not _RELATIVE.search(sent) or re.search(r"khong (ai|co ai)", sent):
            continue
        for word, cancer_type in _CANCER_WORDS:
            if re.search(rf"ung thu {word}\b", sent) and cancer_type not in family:
                family.append(cancer_type)
    data["family_history"] = family

    if re.search(r"(khong|chua tung|chua bao gio|ko)\s+hut thuoc", folded):
        data["smoking"] = False
    elif re.search(r"hut thuoc|nghien thuoc|bo thuoc la|cai thuoc", folded):
        data["smoking"] = True
    if m := re.search(r"(\d+(?:[.,]\d+)?)\s*goi[- ]?nam", folded):
        data["pack_years"] = _as_float(m.group(1))
    elif m := re.search(r"(\d+(?:[.,]\d+)?)\s*goi\s*(?:moi |/ ?|mot |1 )?ngay\D{0,30}?(\d+)\s*nam", folded):
        data["pack_years"] = (_as_float(m.group(1)) or 0) * int(m.group(2))

    if m := re.search(r"viem gan (b|c)\b", folded):
        data["hepatitis_b_or_c"] = not is_negated(folded, m.start())
    if m := re.search(r"xo gan", folded):
        data["cirrhosis"] = not is_negated(folded, m.start())
    if m := re.search(r"tiem (vac ?xin |vaccine |vacxin )?hpv", folded):
        data["hpv_vaccinated"] = not is_negated(folded, m.start())

    data["symptom_codes"] = list(dict.fromkeys([*intake.symptom_codes, *codes_from_text(text)]))
    return IntakeProfile.model_validate(data)


def from_profile(profile: PatientProfile) -> IntakeProfile:
    """Hồ sơ tài khoản → IntakeProfile (genetics_history dạng mã `breast_cancer_mother`)."""
    family = [
        cancer_type
        for cancer_type in CancerType
        if cancer_type != CancerType.other
        and any(code.startswith(f"{cancer_type.value}_") for code in profile.genetics_history)
    ]
    lifestyle = profile.lifestyle or {}
    return IntakeProfile(
        age=profile.age,
        gender=profile.gender,
        family_history=family,
        smoking=_as_bool(lifestyle.get("smoking")),
        pack_years=_as_float(lifestyle.get("pack_years")),
        hepatitis_b_or_c=_as_bool(lifestyle.get("hepatitis_b_or_c")),
        cirrhosis=_as_bool(lifestyle.get("cirrhosis")),
    )


def merge(primary: IntakeProfile | None, secondary: IntakeProfile | None) -> IntakeProfile:
    """Ưu tiên `primary`, điền chỗ trống từ `secondary`; danh sách được hợp lại."""
    if primary is None:
        return secondary or IntakeProfile()
    if secondary is None:
        return primary
    a, b = primary.model_dump(), secondary.model_dump()
    out = {k: (a[k] if a[k] is not None else b[k]) for k in a}
    out["family_history"] = list(dict.fromkeys([*a["family_history"], *b["family_history"]]))
    out["symptom_codes"] = list(dict.fromkeys([*a["symptom_codes"], *b["symptom_codes"]]))
    return IntakeProfile.model_validate(out)


def to_genetics_codes(intake: IntakeProfile) -> list[str]:
    """IntakeProfile → mã genetics_history cho patient_profiles khi tài khoản được tạo từ phiên tư vấn."""
    return [f"{c.value}_cancer_family" for c in intake.family_history if c != CancerType.other]


def missing_info(intake: IntakeProfile) -> list[str]:
    missing = [name for name in ("age", "gender") if getattr(intake, name) is None]
    if intake.smoking and intake.pack_years is None and (intake.age or 0) >= 50:
        missing.append("pack_years")
    return missing
