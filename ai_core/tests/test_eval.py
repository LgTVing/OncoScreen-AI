from ai_core.evaluation import run_navigator_eval
from ai_core.mock import MockAgent


def test_golden_set_with_mock_agent():
    report = run_navigator_eval(MockAgent())
    assert report.red_flag_recall == 1.0, report.failures
    assert report.diagnosis_language_rate == 0.0
    assert report.citation_validity == 1.0
    assert not report.failures, report.failures
