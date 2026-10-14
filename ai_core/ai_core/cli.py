"""CLI tiện ích: `python -m ai_core.cli demo [--real]`."""

from __future__ import annotations

import argparse
import json

from ai_core.api import get_agent
from ai_core.schemas import Answer, Gender, PatientContext, PatientProfile


def demo(real: bool, case: str) -> None:
    agent = get_agent(force_mock=not real)
    if case == "breast":
        profile = PatientProfile(age=45, gender=Gender.female)
        answers = [
            Answer(question_id="family_history", value=["Ung thư vú"]),
            Answer(question_id="smoking", value=False),
            Answer(question_id="alcohol", value="Không"),
            Answer(question_id="hbv_hcv", value=False),
            Answer(question_id="symptom_lump", value=False),
            Answer(question_id="symptom_bleeding", value=False),
            Answer(question_id="symptom_weight_loss", value=False),
            Answer(question_id="symptom_persistent_pain", value=False),
        ]
    elif case == "lung":
        profile = PatientProfile(age=55, gender=Gender.male)
        answers = [
            Answer(question_id="family_history", value=["Không"]),
            Answer(question_id="smoking", value=True),
            Answer(question_id="pack_years", value=30),
            Answer(question_id="alcohol", value="Không"),
            Answer(question_id="hbv_hcv", value=False),
            Answer(question_id="symptom_lump", value=False),
            Answer(question_id="symptom_bleeding", value=False),
            Answer(question_id="symptom_weight_loss", value=False),
            Answer(question_id="symptom_persistent_pain", value=False),
        ]
    else:
        profile = PatientProfile(age=45, gender=Gender.female)
        answers = [
            Answer(question_id="family_history", value=["Không"]),
            Answer(question_id="smoking", value=False),
            Answer(question_id="alcohol", value="Không"),
            Answer(question_id="hbv_hcv", value=False),
            Answer(question_id="symptom_lump", value=True),
        ]
    ctx = PatientContext(session_id="demo", profile=profile, answers=answers)
    print(f"agent = {agent.name}")
    print(json.dumps(agent.run_screening(ctx).model_dump(mode="json"), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("demo")
    d.add_argument("--real", action="store_true")
    d.add_argument("--case", choices=("breast", "lung", "red-flag"), default="breast")
    args = parser.parse_args()
    if args.cmd == "demo":
        demo(args.real, args.case)
