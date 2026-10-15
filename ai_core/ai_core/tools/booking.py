"""Tool: booking (mô phỏng) — tính ngày hẹn kế tiếp từ interval và lần thực hiện gần nhất."""

from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta


def next_due_date(last_done: date | None, interval_months: int, today: date | None = None) -> date:
    today = today or date.today()
    if last_done is None:
        return today + timedelta(days=30)  # lần đầu: hẹn trong ~1 tháng
    # Cộng tháng theo lịch để chu kỳ 12 tháng luôn đúng ngày/năm, kể cả năm nhuận.
    month_index = last_done.year * 12 + last_done.month - 1 + interval_months
    year, zero_based_month = divmod(month_index, 12)
    month = zero_based_month + 1
    due = date(year, month, min(last_done.day, monthrange(year, month)[1]))
    return max(due, today)
