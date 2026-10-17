"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ReminderOut } from "@/types/api";
import {
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "@/components/icons";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Sắp tới",
  due: "Đến hạn",
  done: "Đã hoàn thành",
  skipped: "Đã bỏ qua",
};

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-teal-50/50 border-teal-200/80",
  due: "bg-amber-50/60 border-amber-200",
  done: "bg-slate-50 border-slate-200",
  skipped: "bg-slate-50 border-slate-200",
};

const BADGE_STYLE: Record<string, string> = {
  scheduled: "bg-teal-100 text-teal-800 border border-teal-200",
  due: "bg-amber-100 text-amber-800 border border-amber-200",
  done: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  skipped: "bg-slate-100 text-slate-500 border border-slate-200",
};

/** Màn lịch nhắc — nhóm theo trạng thái, có nút Đã tầm soát và lọc theo trạng thái. */
export default function RemindersPage() {
  const [items, setItems] = useState<ReminderOut[]>([]);
  const [filter, setFilter] = useState<"all" | "scheduled" | "due" | "done">("all");
  const [completing, setCompleting] = useState<string | null>(null);

  function load() {
    api.listReminders().then(setItems).catch(console.error);
  }

  useEffect(() => { load(); }, []);

  async function handleComplete(id: string) {
    try {
      setCompleting(id);
      await api.completeReminder(id);
      load();
    } finally {
      setCompleting(null);
    }
  }

  const filtered = filter === "all" ? items : items.filter((r) => r.status === filter);

  const counts = {
    all: items.length,
    scheduled: items.filter((r) => r.status === "scheduled").length,
    due: items.filter((r) => r.status === "due").length,
    done: items.filter((r) => r.status === "done").length,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="page-title">Lịch nhắc tầm soát định kỳ</h1>
          <span className="badge bg-teal-50 text-teal-700 border border-teal-200">
            <Bell className="h-3 w-3" />
            <span>Tự động</span>
          </span>
        </div>
        <p className="page-subtitle">
          Theo dõi và cập nhật tiến độ các phương pháp tầm soát đã được bác sĩ lên kế hoạch.
        </p>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1 border border-slate-200/60" role="tablist" aria-label="Lọc theo trạng thái">
        {(["all", "due", "scheduled", "done"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={filter === tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              filter === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>{tab === "all" ? "Tất cả" : tab === "due" ? "Đến hạn" : tab === "scheduled" ? "Sắp tới" : "Đã khám"}</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              filter === tab ? "bg-teal-100 text-teal-800" : "bg-slate-200 text-slate-600"
            }`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card-padded py-14 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Calendar className="h-6 w-6" />
          </div>
          <p className="font-semibold text-slate-800 text-base">Không có lịch nhắc nào</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filter === "all"
              ? "Chưa có lịch nhắc nào được tạo. Bác sĩ sẽ thiết lập lịch nhắc sau khi phê duyệt kế hoạch tầm soát của bạn."
              : `Hiện tại không có mục tầm soát nào ở trạng thái "${STATUS_LABEL[filter] ?? filter}".`}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li
              key={r.id}
              className={`rounded-xl border p-4.5 transition-all shadow-sm ${STATUS_STYLE[r.status] ?? "bg-white border-slate-200"}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-slate-900">{r.method}</span>
                    <span className={`badge ${BADGE_STYLE[r.status] ?? ""}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    {r.status === "due" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Đã đến hạn khám</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">
                    Phạm vi: <span className="font-semibold text-slate-900 uppercase">{r.cancer_type}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    Ngày hẹn dự kiến: <span className="font-semibold text-slate-900">{r.due_date}</span>
                  </p>

                  {r.message && (
                    <p className="text-xs text-slate-500 italic bg-white/60 p-2 rounded-lg border border-slate-100">
                      {r.message}
                    </p>
                  )}

                  {r.completed_at && (
                    <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Đã hoàn thành tầm soát vào ngày {new Date(r.completed_at).toLocaleDateString("vi-VN")}</span>
                    </p>
                  )}
                </div>

                {/* Action */}
                {r.status !== "done" && r.status !== "skipped" && (
                  <button
                    onClick={() => handleComplete(r.id)}
                    disabled={completing === r.id}
                    className="btn-primary shrink-0 text-xs self-start sm:self-auto flex items-center gap-1.5"
                  >
                    {completing === r.id ? (
                      <>
                        <span className="spinner h-3.5 w-3.5" />
                        <span>Đang lưu…</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Đã đi tầm soát</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Info note */}
      <p className="text-xs text-center text-slate-400">
        Lịch nhắc được đồng bộ tự động dựa trên chu kỳ khuyến nghị đã được bác sĩ xác nhận.
      </p>
    </div>
  );
}
