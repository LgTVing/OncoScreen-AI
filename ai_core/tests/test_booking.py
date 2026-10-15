from datetime import date

from ai_core.tools.booking import next_due_date


def test_next_due_uses_calendar_months_and_handles_leap_day():
    assert next_due_date(date(2024, 2, 29), 12, today=date(2024, 3, 1)) == date(2025, 2, 28)
    assert next_due_date(date(2024, 1, 31), 1, today=date(2024, 2, 1)) == date(2024, 2, 29)
