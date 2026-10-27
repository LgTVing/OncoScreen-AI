import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw, type IconType } from "@/components/icons";

/** Trạng thái rỗng luôn kèm hành động (SKILL.md 5.7). */
export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  className = "",
}: {
  icon: IconType;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 py-10 text-center ${className}`}>
      <Icon className="h-12 w-12 text-slate-300" aria-hidden />
      <p className="text-base font-medium text-slate-700">{title}</p>
      {text && <p className="max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Lỗi tải dữ liệu / thao tác (không dùng màu danger: danger dành cho red-flag). */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <span>{message}</span>
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary shrink-0 text-xs">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Thử lại
        </button>
      )}
    </div>
  );
}

export function SkeletonList({ rows = 3, height = "h-16" }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`skeleton ${height} rounded-lg`} />
      ))}
    </div>
  );
}

export function SkeletonText() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Đang tải">
      <div className="skeleton h-4 w-3/5" />
      <div className="skeleton h-4 w-4/5" />
      <div className="skeleton h-4 w-2/5" />
    </div>
  );
}

export function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  action,
  tone = "patient",
}: {
  icon: IconType;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  tone?: "patient" | "doctor" | "neutral";
}) {
  const color = tone === "doctor" ? "text-indigo-600" : tone === "patient" ? "text-teal-700" : "text-slate-500";
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div className="flex min-w-0 items-start gap-2">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} aria-hidden />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Divider dọc thay cho dấu chấm giữa (SKILL.md 2.1). */
export function MetaDivider() {
  return <span className="inline-block h-2.5 w-px bg-slate-200" aria-hidden="true" />;
}
