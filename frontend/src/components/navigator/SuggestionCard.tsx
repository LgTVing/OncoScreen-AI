import type { ReactNode } from "react";
import type { RiskFactor, ScreeningSuggestion } from "@/types/api";
import { cancerLabel, RISK_LEVEL_LABEL } from "@/lib/labels";
import { intervalLabel } from "@/lib/format";
import { SourceList } from "@/components/SourceList";
import { AlertTriangle, Calendar, Clock, Info } from "@/components/icons";

/** Thẻ gợi ý tầm soát theo guideline (Navigator & Copilot brief). Luôn có nguồn. */
export function SuggestionCard({
  suggestion: s,
  tone = "patient",
  action,
}: {
  suggestion: ScreeningSuggestion;
  tone?: "patient" | "doctor";
  action?: ReactNode;
}) {
  const pill =
    tone === "doctor" ? "border-indigo-200 bg-indigo-50 text-indigo-800" : "border-teal-200 bg-teal-50 text-teal-800";
  return (
    <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className={`badge border ${pill}`}>{cancerLabel(s.cancer_type)}</span>
        {s.elevated_risk && (
          <span className="badge border border-amber-200 bg-amber-50 text-amber-800">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Có yếu tố nguy cơ tăng
          </span>
        )}
      </header>
      <h3 className="text-sm font-semibold text-slate-900">{s.method}</h3>
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div className="flex items-start gap-1.5 text-slate-600">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <div>
            <dt className="sr-only">Tần suất</dt>
            <dd className={s.interval_months === null ? "font-medium text-slate-800" : ""}>{intervalLabel(s.interval_months)}</dd>
          </div>
        </div>
        <div className="flex items-start gap-1.5 text-slate-600">
          <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <div>
            <dt className="sr-only">Tuổi bắt đầu</dt>
            <dd>{s.start_age !== null ? `Bắt đầu từ ${s.start_age} tuổi` : "Bắt đầu khi thuộc nhóm nguy cơ"}</dd>
          </div>
        </div>
      </dl>
      <p className="text-xs leading-relaxed text-slate-600">
        <span className="font-medium text-slate-700">Áp dụng vì: </span>
        {s.applies_because}
      </p>
      {s.note && (
        <p className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{s.note}</span>
        </p>
      )}
      <SourceList sources={s.sources} tone={tone} />
      {action}
    </article>
  );
}

export function RiskFactorList({ factors, tone = "patient" }: { factors: RiskFactor[]; tone?: "patient" | "doctor" }) {
  if (!factors.length) return null;
  const levelStyle = (level: RiskFactor["level"]) =>
    level === "high"
      ? "border-amber-300 bg-amber-100 text-amber-900"
      : level === "elevated"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <ul className="space-y-2">
      {factors.map((f) => (
        <li key={f.cancer_type} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-semibold ${tone === "doctor" ? "text-slate-900" : "text-slate-800"}`}>
              {cancerLabel(f.cancer_type)}
            </span>
            <span className={`badge border ${levelStyle(f.level)}`}>{RISK_LEVEL_LABEL[f.level]}</span>
          </div>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-slate-600">
            {f.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
