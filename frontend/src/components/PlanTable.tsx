"use client";
import { useState } from "react";
import type { PlanItem, ScreeningPlan } from "@/types/api";
import { FileText, Calendar, Clock, ExternalLink } from "@/components/icons";

/**
 * Bảng kế hoạch tầm soát.
 * - readonly (patient): chỉ hiện thông tin.
 * - editable (doctor): inline input cho method, interval_months, next_due, rationale; gọi onChange khi thay đổi.
 */
export function PlanTable({
  plan,
  editable = false,
  onChange,
}: {
  plan: ScreeningPlan;
  editable?: boolean;
  onChange?: (p: ScreeningPlan) => void;
}) {
  const [items, setItems] = useState<PlanItem[]>(plan.items);

  function updateItem(index: number, patch: Partial<PlanItem>) {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    setItems(next);
    onChange?.({ ...plan, items: next });
  }

  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hidden md:block">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50/80 text-left border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Loại ung thư</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Phương pháp khuyến nghị</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Chu kỳ</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Lần tới</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Cơ sở lý luận &amp; Guideline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it, i) => (
              <tr key={i} className="align-top hover:bg-slate-50/50 transition-colors">
                {/* Cancer type — read only */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-teal-800 border border-teal-200">
                    {it.cancer_type}
                  </span>
                </td>

                {/* Method */}
                <td className="px-4 py-3.5">
                  {editable ? (
                    <input
                      id={`plan-method-${i}`}
                      type="text"
                      value={it.method}
                      onChange={(e) => updateItem(i, { method: e.target.value })}
                      className="input text-sm w-full"
                    />
                  ) : (
                    <span className="font-semibold text-slate-900">{it.method}</span>
                  )}
                </td>

                {/* Interval */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {editable ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        id={`plan-interval-${i}`}
                        type="number"
                        min={1}
                        value={it.interval_months}
                        onChange={(e) => updateItem(i, { interval_months: Number(e.target.value) })}
                        className="input text-sm w-20 text-center"
                      />
                      <span className="text-slate-500 text-xs">tháng</span>
                    </div>
                  ) : (
                    <span className="text-slate-700">{it.interval_months} tháng</span>
                  )}
                </td>

                {/* Next due */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {editable ? (
                    <input
                      id={`plan-next-due-${i}`}
                      type="date"
                      value={it.next_due ?? ""}
                      onChange={(e) => updateItem(i, { next_due: e.target.value || null })}
                      className="input text-sm"
                    />
                  ) : (
                    <span className={`inline-block font-medium ${it.next_due ? "text-slate-800" : "text-slate-400"}`}>
                      {it.next_due ?? "Chưa xác định"}
                    </span>
                  )}
                </td>

                {/* Rationale + Sources */}
                <td className="px-4 py-3.5 max-w-sm space-y-2">
                  {editable ? (
                    <textarea
                      id={`plan-rationale-${i}`}
                      rows={3}
                      value={it.rationale}
                      onChange={(e) => updateItem(i, { rationale: e.target.value })}
                      className="input text-xs w-full resize-y"
                    />
                  ) : (
                    <p className="text-xs text-slate-700 leading-relaxed">{it.rationale}</p>
                  )}

                  {it.sources.length > 0 && (
                    <ul className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                      {it.sources.map((s) => (
                        <li key={s.doc_id} className="flex items-start gap-1">
                          <FileText className="h-3 w-3 text-teal-600 shrink-0 mt-0.5" />
                          <span>
                            {s.url ? (
                              <a className="text-teal-700 hover:underline font-medium inline-flex items-center gap-0.5" href={s.url} target="_blank" rel="noreferrer">
                                {s.title}
                                <ExternalLink className="h-2.5 w-2.5 inline" />
                              </a>
                            ) : (
                              <span className="font-medium text-slate-700">{s.title}</span>
                            )}
                            {s.section ? ` · ${s.section}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-sm shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-teal-800 border border-teal-200">
                {it.cancer_type}
              </span>
              <span className="text-xs text-slate-500">{it.interval_months} tháng/lần</span>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phương pháp:</p>
              {editable ? (
                <input
                  type="text"
                  value={it.method}
                  onChange={(e) => updateItem(i, { method: e.target.value })}
                  className="input text-sm w-full mt-1"
                />
              ) : (
                <p className="font-semibold text-slate-900 mt-0.5">{it.method}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <span className="text-xs text-slate-400">Chu kỳ:</span>
                {editable ? (
                  <input
                    type="number"
                    min={1}
                    value={it.interval_months}
                    onChange={(e) => updateItem(i, { interval_months: Number(e.target.value) })}
                    className="input text-sm w-full mt-1"
                  />
                ) : (
                  <p className="font-medium text-slate-700 mt-0.5">{it.interval_months} tháng</p>
                )}
              </div>
              <div>
                <span className="text-xs text-slate-400">Ngày hẹn tới:</span>
                {editable ? (
                  <input
                    type="date"
                    value={it.next_due ?? ""}
                    onChange={(e) => updateItem(i, { next_due: e.target.value || null })}
                    className="input text-sm w-full mt-1"
                  />
                ) : (
                  <p className="font-medium text-slate-700 mt-0.5">{it.next_due ?? "Chưa xác định"}</p>
                )}
              </div>
            </div>

            <div className="pt-1 border-t border-slate-100">
              <span className="text-xs text-slate-400">Lý do y khoa:</span>
              {editable ? (
                <textarea
                  rows={2}
                  value={it.rationale}
                  onChange={(e) => updateItem(i, { rationale: e.target.value })}
                  className="input text-xs w-full mt-1 resize-y"
                />
              ) : (
                <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{it.rationale}</p>
              )}
            </div>

            {it.sources.length > 0 && (
              <ul className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                {it.sources.map((s) => (
                  <li key={s.doc_id} className="flex items-start gap-1">
                    <FileText className="h-3 w-3 text-teal-600 shrink-0 mt-0.5" />
                    <span>
                      {s.url ? (
                        <a className="text-teal-700 hover:underline font-medium" href={s.url} target="_blank" rel="noreferrer">
                          {s.title}
                        </a>
                      ) : (
                        <span>{s.title}</span>
                      )}
                      {s.section ? ` · ${s.section}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {plan.general_advice && (
        <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <strong className="text-slate-700 not-italic mr-1">Lời khuyên chung:</strong>
          {plan.general_advice}
        </p>
      )}
    </div>
  );
}
