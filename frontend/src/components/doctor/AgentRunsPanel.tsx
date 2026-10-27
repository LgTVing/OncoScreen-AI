"use client";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { AGENT_LABEL, NEXT_ACTION_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import type { AgentName, AgentRunOut, Page } from "@/types/api";
import { TraceEvents } from "@/components/doctor/TraceEvents";
import { EmptyState, InlineError, SkeletonList } from "@/components/ui";
import { Activity, ChevronDown, ChevronLeft, ChevronRight } from "@/components/icons";

const AGENTS: AgentName[] = ["navigator", "copilot", "copilot_qa", "patient_qa"];

function Flag({ children, tone }: { children: ReactNode; tone: "danger" | "warn" | "neutral" }) {
  const cls =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={`badge border ${cls}`}>{children}</span>;
}

/** Bảng observability: các lượt chạy agent (GET /doctor/agent-runs). */
export function AgentRunsPanel() {
  const [agent, setAgent] = useState<AgentName | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<AgentRunOut> | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    setError("");
    setData(null);
    api
      .listAgentRuns(agent || undefined, page)
      .then(setData)
      .catch((err) => setError(errorMessage(err, "Chưa tải được nhật ký agent.")));
  }, [agent, page]);
  useEffect(load, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <section className="card-padded space-y-4" aria-labelledby="agent-runs-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="agent-runs-title" className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Activity className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Nhật ký agent
          </h2>
          <p className="text-sm text-slate-500">Mỗi lượt chạy Navigator / Copilot kèm trace để kiểm tra và đánh giá.</p>
        </div>
        <div>
          <label htmlFor="agent-filter" className="label text-xs">
            Lọc theo agent
          </label>
          <select
            id="agent-filter"
            className="input min-w-[12rem] focus:border-indigo-600 focus:ring-indigo-600/20"
            value={agent}
            onChange={(e) => {
              setAgent(e.target.value as AgentName | "");
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {AGENTS.map((a) => (
              <option key={a} value={a}>
                {AGENT_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <InlineError message={error} onRetry={load} />}
      {!data && !error && <SkeletonList rows={4} height="h-12" />}
      {data && data.items.length === 0 && <EmptyState icon={Activity} title="Chưa có lượt chạy nào" />}

      {data && data.items.length > 0 && (
        <>
          <div className="hidden grid-cols-[9rem_8rem_1fr_7rem_5rem_1fr_2rem] gap-3 border-b border-slate-200 px-3 pb-2 text-xs font-semibold text-slate-600 lg:grid">
            <span>Thời điểm</span>
            <span>Agent</span>
            <span>Trace</span>
            <span>Generator</span>
            <span>Độ trễ</span>
            <span>Cờ</span>
            <span className="sr-only">Chi tiết</span>
          </div>
          <ul className="space-y-2">
            {data.items.map((r) => {
              const expanded = open === r.id;
              return (
                <li key={r.id} className={`rounded-lg border ${r.red_flag ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white"}`}>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : r.id)}
                    aria-expanded={expanded}
                    className="grid w-full cursor-pointer grid-cols-1 gap-1.5 p-3 text-left text-sm hover:bg-slate-50/70 lg:grid-cols-[9rem_8rem_1fr_7rem_5rem_1fr_2rem] lg:items-center lg:gap-3"
                  >
                    <span className="text-xs text-slate-600">{formatDateTime(r.created_at)}</span>
                    <span className="font-medium text-slate-900">{AGENT_LABEL[r.agent] ?? r.agent}</span>
                    <span className="break-all text-xs text-slate-600">
                      <span className="lg:hidden">Trace: </span>
                      {r.trace_id}
                    </span>
                    <span className="text-xs text-slate-700">{r.generator ?? "không rõ"}</span>
                    <span className="text-xs text-slate-700">{r.latency_ms} ms</span>
                    <span className="flex flex-wrap gap-1">
                      {r.red_flag && <Flag tone="danger">Red-flag</Flag>}
                      {r.next_action && <Flag tone="neutral">{NEXT_ACTION_LABEL[r.next_action]}</Flag>}
                      {r.insufficient_evidence && <Flag tone="warn">Thiếu căn cứ</Flag>}
                      {r.guard_blocked && <Flag tone="warn">Guard chặn</Flag>}
                      {r.generator === "template_fallback" && <Flag tone="warn">Fallback</Flag>}
                    </span>
                    <ChevronDown
                      className={`hidden h-4 w-4 text-slate-500 transition-transform lg:block ${expanded ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  {expanded && (
                    <div className="space-y-2 border-t border-slate-100 bg-slate-50 p-3">
                      {r.patient_id && (
                        <Link
                          href={`/doctor/patients/${r.patient_id}`}
                          className="text-xs font-medium text-indigo-700 underline-offset-2 hover:underline"
                        >
                          Xem hồ sơ bệnh nhân liên quan
                        </Link>
                      )}
                      <TraceEvents events={r.events} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Trước
              </button>
              <span className="text-slate-600">
                Trang {page}/{totalPages}
              </span>
              <button type="button" className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Sau
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
