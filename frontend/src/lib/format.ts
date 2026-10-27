/** Định dạng ngày giờ & chu kỳ cho giao diện tiếng Việt. */

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD theo giờ địa phương (dùng cho input date & so sánh ngày). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(base: string, days: number): string {
  const d = parseISODate(base);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Parse "YYYY-MM-DD" thành Date địa phương (tránh lệch múi giờ của Date.parse). */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function daysUntil(value: string): number {
  const ms = parseISODate(value).getTime() - parseISODate(todayISO()).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Chưa xác định";
  const d = value.length <= 10 ? parseISODate(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Chưa xác định";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `interval_months = null` nghĩa là guideline không quy định chu kỳ → bác sĩ cùng quyết định. */
export function intervalLabel(months: number | null | undefined): string {
  if (months === null || months === undefined) return "Tần suất do bác sĩ cùng quyết định";
  if (months <= 0) return "Chưa đặt chu kỳ";
  if (months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "Mỗi năm" : `Mỗi ${years} năm`;
  }
  return `Mỗi ${months} tháng`;
}

export function percent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 1000) / 10}%`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const last = parts[parts.length - 1];
  return last.charAt(0).toUpperCase();
}
