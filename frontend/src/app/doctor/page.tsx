"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { SessionStatus, SessionSummary } from "@/types/api";
import { SessionStatusBadge } from "@/components/SessionStatusBadge";
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  FileText,
  ChevronRight,
  MessageSquare,
  User,
  Activity,
} from "@/components/icons";

/** Dashboard bác sĩ: hàng chờ duyệt với filter theo trạng thái. */
export default function DoctorDashboard() {
  const [status, setStatus] = useState<SessionStatus | "">("");
  const [items, setItems] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<{ sessions: Record<string, number>; pending_without_plan: number; questions_asked: number } | null>(null);

  useEffect(() => {
    api.getDoctorMetrics().then(setMetrics).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .listAllSessions(status || undefined)
      .then((p) => setItems(p.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status]);

  const tabs: { label: string; value: SessionStatus | "" }[] = [
    { label: "Tất cả", value: "" },
    { label: "Chờ duyệt", value: "pending_review" },
    { label: "Cần khám sớm (Red-Flag)", value: "red_flag" },
    { label: "Đã duyệt", value: "approved" },
    { label: "Từ chối", value: "rejected" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Hàng chờ duyệt y khoa</h1>
            <span className="badge bg-indigo-100 text-indigo-800 border border-indigo-200">
              Bác sĩ lâm sàng
            </span>
          </div>
          <p className="page-subtitle">Xem xét bằng chứng guideline và phê duyệt kế hoạch tầm soát cho bệnh nhân.</p>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card-padded border-l-4 border-l-amber-500 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chờ bác sĩ duyệt</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.sessions.pending_review ?? 0}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="card-padded border-l-4 border-l-slate-400 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cần bổ sung nguồn</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.pending_without_plan}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <FileText className="h-5 w-5" />
            </div>
          </div>

          <div className="card-padded border-l-4 border-l-indigo-500 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Câu hỏi bệnh nhân gửi</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.questions_asked}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabs.map((t) => (
          <button
            key={t.value}
            id={`tab-${t.value || "all"}`}
            onClick={() => setStatus(t.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              status === t.value
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Session list */}
      {loading ? (
        <div className="space-y-3 py-4">
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="card-padded flex flex-col items-center gap-2 py-14 text-center text-slate-500">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-1">
            <ClipboardList className="h-6 w-6" />
          </div>
          <p className="font-semibold text-slate-800 text-base">Không có phiên nào</p>
          <p className="text-xs text-slate-400">Không tìm thấy phiên đánh giá theo bộ lọc trạng thái đã chọn.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((s) => (
            <li key={s.id}>
              <Link
                href={`/doctor/sessions/${s.id}`}
                className={`card-padded flex items-center justify-between gap-4 transition-all hover:border-indigo-300 hover:shadow-md group ${
                  s.has_red_flag ? "bg-red-50/40 border-l-4 border-l-red-500" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {s.patient_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tạo lúc:{" "}
                      {new Date(s.created_at).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {s.has_red_flag && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                      <AlertTriangle className="h-3 w-3" />
                      <span>RED-FLAG</span>
                    </span>
                  )}
                  <SessionStatusBadge status={s.status} />
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
