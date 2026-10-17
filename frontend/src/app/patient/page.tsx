"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { PatientProfileOut, ReminderOut, SessionSummary } from "@/types/api";
import { SessionStatusBadge } from "@/components/SessionStatusBadge";
import {
  Plus,
  Pencil,
  Bell,
  MessageSquare,
  Calendar,
  ChevronRight,
  AlertTriangle,
  User,
  Activity,
  HeartPulse,
  ClipboardList,
} from "@/components/icons";

const GENDER_LABEL: Record<string, string> = {
  female: "Nữ",
  male: "Nam",
  other: "Khác",
};

export default function PatientDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [profile, setProfile] = useState<PatientProfileOut | null>(null);
  const [reminders, setReminders] = useState<ReminderOut[]>([]);
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listMySessions().then((p) => setSessions(p.items)).catch(() => []),
      api.getProfile().then(setProfile).catch(() => null),
      api.listReminders().then(setReminders).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  async function start() {
    try {
      setStarting(true);
      const s = await api.createSession();
      router.push(`/patient/survey?session=${s.id}`);
    } catch {
      setStarting(false);
    }
  }

  const upcomingReminders = reminders
    .filter((r) => r.status === "scheduled" || r.status === "due")
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* ===== Hero / Quick Actions ===== */}
      <section className="card-padded flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div>
          <h1 className="page-title">Tổng quan sức khỏe</h1>
          <p className="page-subtitle">Quản lý lịch tầm soát ung thư và kết quả đánh giá nguy cơ cá nhân.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-start-survey"
            onClick={start}
            disabled={starting}
            className="btn-primary"
          >
            {starting ? <span className="spinner h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{starting ? "Đang chuẩn bị…" : "Đánh giá nguy cơ mới"}</span>
          </button>
          <Link href="/patient/profile" className="btn-secondary">
            <Pencil className="h-4 w-4 text-slate-500" />
            <span>Hồ sơ</span>
          </Link>
          <Link href="/patient/reminders" className="btn-secondary">
            <Bell className="h-4 w-4 text-slate-500" />
            <span>Lịch nhắc</span>
          </Link>
          <Link href="/patient/chat" className="btn-secondary">
            <MessageSquare className="h-4 w-4 text-teal-600" />
            <span>Chat AI</span>
          </Link>
        </div>
      </section>

      {/* ===== Profile summary ===== */}
      {loading ? (
        <section className="card-padded space-y-3">
          <div className="skeleton h-5 w-48" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="skeleton h-20 rounded-xl" />
            <div className="skeleton h-20 rounded-xl" />
            <div className="skeleton h-20 rounded-xl" />
            <div className="skeleton h-20 rounded-xl" />
          </div>
        </section>
      ) : profile ? (
        <section className="card-padded">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-teal-700" />
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Hồ sơ nguy cơ cơ bản</h2>
            </div>
            <Link href="/patient/profile" className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1">
              <span>Cập nhật</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
              <p className="text-xs font-medium text-slate-500">Độ tuổi</p>
              <p className="font-bold text-slate-900 text-base mt-0.5">{profile.age} tuổi</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
              <p className="text-xs font-medium text-slate-500">Giới tính sinh học</p>
              <p className="font-bold text-slate-900 text-base mt-0.5">{GENDER_LABEL[profile.gender] ?? profile.gender}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
              <p className="text-xs font-medium text-slate-500">Tiền sử gia đình</p>
              <p className="font-bold text-slate-900 text-base mt-0.5">
                {profile.genetics_history.length > 0
                  ? `${profile.genetics_history.length} yếu tố`
                  : "Không ghi nhận"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
              <p className="text-xs font-medium text-slate-500">Tiền sử hút thuốc</p>
              <p className="font-bold text-slate-900 text-base mt-0.5">
                {profile.lifestyle?.smoking === true
                  ? `Có ${profile.lifestyle.pack_years ? `(${profile.lifestyle.pack_years} gói-năm)` : ""}`
                  : profile.lifestyle?.smoking === false
                  ? "Không"
                  : "Chưa ghi"}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="card-padded border-l-4 border-l-teal-600">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Hồ sơ sức khỏe của bạn chưa được khởi tạo</p>
              <p className="text-xs text-slate-500 mt-1">
                Bổ sung tuổi, giới tính và tiền sử gia đình để AI gợi ý đúng bài khảo sát tầm soát phù hợp.
              </p>
            </div>
            <Link href="/patient/profile" className="btn-primary shrink-0 text-xs">
              Tạo hồ sơ ngay
            </Link>
          </div>
        </section>
      )}

      {/* ===== Upcoming reminders ===== */}
      {upcomingReminders.length > 0 && (
        <section className="card-padded">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-600" />
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Lịch nhắc tầm soát sắp tới</h2>
            </div>
            <Link href="/patient/reminders" className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1">
              <span>Xem tất cả</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="space-y-2.5">
            {upcomingReminders.map((r) => (
              <li
                key={r.id}
                className={`flex items-center justify-between rounded-xl p-3.5 text-sm border ${
                  r.status === "due"
                    ? "bg-amber-50/60 border-amber-200"
                    : "bg-slate-50/60 border-slate-200/80"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${r.status === "due" ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"}`}>
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{r.method}</span>
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
                      {r.cancer_type}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {r.status === "due" && (
                    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 mb-0.5">
                      Đến hạn khám
                    </span>
                  )}
                  <p className="text-xs font-medium text-slate-600">{r.due_date}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ===== Sessions list ===== */}
      <section className="card-padded">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-teal-700" />
            <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Lịch sử đánh giá nguy cơ</h2>
          </div>
          <span className="badge bg-slate-100 text-slate-600">{sessions.length} phiên</span>
        </div>

        {loading ? (
          <div className="space-y-3 py-2">
            <div className="skeleton h-14 rounded-xl" />
            <div className="skeleton h-14 rounded-xl" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center max-w-sm mx-auto space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <HeartPulse className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-800">Bạn chưa thực hiện phiên đánh giá nào</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hãy hoàn thành khảo sát nguy cơ ban đầu để nhận kế hoạch tầm soát phù hợp từ bác sĩ.
            </p>
            <button onClick={start} disabled={starting} className="btn-primary mt-2">
              <Plus className="h-4 w-4" />
              <span>Bắt đầu đánh giá đầu tiên</span>
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/patient/results/${s.id}`}
                  className="flex items-center justify-between py-3.5 px-2 rounded-xl transition-colors hover:bg-slate-50 group"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {new Date(s.created_at).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-slate-400">
                      Thời gian: {new Date(s.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {s.has_red_flag && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Cần lưu ý</span>
                      </span>
                    )}
                    <SessionStatusBadge status={s.status} />
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
