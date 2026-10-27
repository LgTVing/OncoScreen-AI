"use client";
import type { ReactNode } from "react";
import type { ClinicalBrief, ScreeningSuggestion } from "@/types/api";
import { formatDateTime } from "@/lib/format";
import { RiskFactorList, SuggestionCard } from "@/components/navigator/SuggestionCard";
import {
  AlertTriangle,
  FileSearch,
  HelpCircle,
  History,
  ListChecks,
  Plus,
  ShieldAlert,
  Sparkles,
  Check,
  type IconType,
} from "@/components/icons";

function Block({ title, icon: Icon, children, id }: { title: string; icon: IconType; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="space-y-2.5">
      <h3 id={id} className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-indigo-600" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Clinical Copilot brief: mọi trường của ClinicalBrief.
 * Dữ kiện (key_facts) truy vết về mốc hồ sơ: bấm để làm nổi bật mốc trên dòng thời gian.
 */
export function BriefPanel({
  brief,
  activeEventIds,
  onFactClick,
  onAddSuggestion,
  isPlanned,
}: {
  brief: ClinicalBrief;
  activeEventIds: string[];
  onFactClick: (eventIds: string[]) => void;
  onAddSuggestion?: (s: ScreeningSuggestion) => void;
  isPlanned?: (s: ScreeningSuggestion) => boolean;
}) {
  const active = new Set(activeEventIds);
  return (
    <section className="card-padded space-y-6" aria-labelledby="brief-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="brief-title" className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Sparkles className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Tóm tắt Clinical Copilot
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Tạo lúc {formatDateTime(brief.generated_at)}, mô hình {brief.model}
          </p>
        </div>
      </div>

      <p className="max-w-prose rounded-lg border border-indigo-100 bg-indigo-50/50 p-3.5 text-sm leading-relaxed text-slate-800">
        {brief.summary}
      </p>

      {brief.red_flags.length > 0 && (
        <div role="alert" className="space-y-2 rounded-lg border border-red-200 border-l-4 border-l-red-500 bg-red-50/60 p-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-900">
            <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden="true" />
            Dấu hiệu cảnh báo cần đánh giá lâm sàng
          </p>
          <ul className="space-y-1.5">
            {brief.red_flags.map((f) => (
              <li key={f.code} className="text-sm text-red-950">
                <span className="font-semibold">{f.symptom}</span>
                <span className="text-red-900">
                  {" "}
                  ({f.severity === "urgent" ? "khẩn" : "sớm"}): {f.advice}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Block title="Dữ kiện chính (truy vết hồ sơ)" icon={History} id="brief-facts">
        {brief.key_facts.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có dữ kiện truy vết được từ hồ sơ.</p>
        ) : (
          <ul className="space-y-2">
            {brief.key_facts.map((f, i) => {
              const selected = f.event_ids.some((id) => active.has(id));
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onFactClick(f.event_ids)}
                    aria-pressed={selected}
                    className={`w-full cursor-pointer rounded-lg border p-3 text-left text-sm transition-colors ${
                      selected ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300"
                    }`}
                  >
                    <span className="block text-slate-800">{f.text}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {f.event_ids.map((id) => (
                        <span key={id} className="badge border border-slate-200 bg-slate-50 text-[11px] text-slate-600">
                          Mốc {id}
                        </span>
                      ))}
                      <span className="text-[11px] font-medium text-indigo-700">Xem trên dòng thời gian</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      {brief.risk_factors.length > 0 && (
        <Block title="Yếu tố nguy cơ" icon={AlertTriangle} id="brief-risk">
          <RiskFactorList factors={brief.risk_factors} tone="doctor" />
        </Block>
      )}

      <Block title="Gợi ý theo guideline" icon={FileSearch} id="brief-suggestions">
        {brief.guideline_suggestions.length === 0 ? (
          <p className="text-sm text-slate-500">
            {brief.red_flags.length
              ? "Không đưa gợi ý tầm soát định kỳ khi có dấu hiệu cảnh báo; ưu tiên đánh giá lâm sàng."
              : "Không có mốc guideline áp dụng với dữ liệu hiện có."}
          </p>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {brief.guideline_suggestions.map((s) => {
              const planned = isPlanned?.(s) ?? false;
              return (
                <SuggestionCard
                  key={s.rule_id}
                  suggestion={s}
                  tone="doctor"
                  action={
                    onAddSuggestion ? (
                      <button
                        type="button"
                        onClick={() => onAddSuggestion(s)}
                        disabled={planned}
                        className="btn-secondary w-full text-xs"
                      >
                        {planned ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                        {planned ? "Đã có trong kế hoạch" : "Thêm vào kế hoạch"}
                      </button>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </Block>

      {brief.questions_to_clarify.length > 0 && (
        <Block title="Câu hỏi nên làm rõ với bệnh nhân" icon={HelpCircle} id="brief-questions">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {brief.questions_to_clarify.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </Block>
      )}

      {brief.data_gaps.length > 0 && (
        <Block title="Dữ liệu còn thiếu" icon={ListChecks} id="brief-gaps">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {brief.data_gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </Block>
      )}
    </section>
  );
}
