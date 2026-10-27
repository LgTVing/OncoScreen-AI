"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { cancerLabel, REMINDER_STATUS_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { ReminderOut } from "@/types/api";
import { ReminderStatusBadge } from "@/components/StatusBadge";
import { EmptyState, InlineError, MetaDivider, SkeletonList } from "@/components/ui";
import { Calendar, Check, CheckCircle2, ChevronRight } from "@/components/icons";

type Filter = "all" | "due" | "scheduled" | "done";

const FILTER_LABEL: Record<Filter, string> = {
  all: "Tất cả",
  due: "Đến hạn",
  scheduled: "Sắp tới",
  done: "Đã làm",
};

const ROW_STYLE: Record<string, string> = {
  scheduled: "bg-white border-slate-200",
  due: "bg-amber-50/60 border-amber-200",
  done: "bg-slate-50 border-slate-200",
  skipped: "bg-slate-50 border-slate-200",
};

/** Nhắc lịch tầm soát sinh từ kế hoạch bác sĩ đã duyệt; đánh dấu "đã làm" sinh chu kỳ kế tiếp. */
export default function RemindersPage() {
  const [items, setItems] = useState<ReminderOut[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [completing, setCompleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    api
      .listReminders()
      .then(setItems)
      .catch((err) => setError(errorMessage(err, "Chưa tải được lịch nhắc.")));
  }, []);
  useEffect(load, [load]);

  async function handleComplete(id: string) {
    setCompleting(id);
    setError("");
    try {
      await api.completeReminder(id);
      load();
    } catch (err) {
      setError(errorMessage(err, "Chưa cập nhật được lịch nhắc."));
    } finally {
      setCompleting(null);
    }
  }

  const all = items ?? [];
  const filtered = filter === "all" ? all : all.filter((r) => r.status === filter);
  const count = (f: Filter) => (f === "all" ? all.length : all.filter((r) => r.status === f).length);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="page-title">Nhắc lịch tầm soát</h1>
        <p className="page-subtitle">Theo kế hoạch bác sĩ đã duyệt. Khi bạn đánh dấu đã làm, hệ thống tự tạo lần nhắc kế tiếp.</p>
      </header>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Lọc theo trạng thái">
        {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`flex flex-1 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {FILTER_LABEL[f]}
            <span className={`rounded-full px-1.5 text-xs ${filter === f ? "bg-teal-100 text-teal-800" : "bg-slate-200 text-slate-600"}`}>
              {count(f)}
            </span>
          </button>
        ))}
      </div>

      {error && <InlineError message={error} onRetry={load} />}
      {items === null && !error ? (
        <SkeletonList rows={3} />
      ) : filtered.length === 0 ? (
        <div className="card-padded">
          <EmptyState
            icon={Calendar}
            title="Không có lịch nhắc"
            text={
              filter === "all"
                ? "Lịch nhắc được tạo sau khi bác sĩ duyệt kế hoạch tầm soát có ngày hẹn."
                : `Không có mục nào ở trạng thái "${REMINDER_STATUS_LABEL[filter]}".`
            }
            action={
              filter !== "all" ? (
                <button type="button" onClick={() => setFilter("all")} className="btn-secondary">
                  Hiển thị tất cả
                </button>
              ) : (
                <Link href="/patient" className="btn-secondary">
                  Về trang tổng quan
                </Link>
              )
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className={`rounded-lg border p-4 ${ROW_STYLE[r.status] ?? "bg-white border-slate-200"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-slate-900">{r.method}</span>
                    <ReminderStatusBadge status={r.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-slate-600">
                    <span>{cancerLabel(r.cancer_type)}</span>
                    <MetaDivider />
                    <span>
                      Hạn: <strong className="font-semibold text-slate-900">{formatDate(r.due_date)}</strong>
                    </span>
                  </div>
                  {r.message && <p className="text-sm text-slate-600">{r.message}</p>}
                  {r.completed_at && (
                    <p className="flex items-center gap-1 text-sm font-medium text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Đã thực hiện ngày {formatDate(r.completed_at)}
                    </p>
                  )}
                  <Link
                    href={`/patient/visits/${r.encounter_id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 underline-offset-2 hover:underline"
                  >
                    Xem kế hoạch gốc
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
                {r.status !== "done" && r.status !== "skipped" && (
                  <button
                    type="button"
                    onClick={() => void handleComplete(r.id)}
                    disabled={completing === r.id}
                    className="btn-primary shrink-0 self-start sm:self-auto"
                  >
                    {completing === r.id ? (
                      <>
                        <span className="spinner" aria-hidden="true" />
                        Đang xử lý…
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        Tôi đã đi tầm soát
                      </>
                    )}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
