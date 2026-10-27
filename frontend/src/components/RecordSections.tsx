"use client";
import Link from "next/link";
import { useState } from "react";
import type { AppointmentOut, ConsultationOut, EncounterOut, PatientProfileOut, ReminderOut } from "@/types/api";
import { cancerLabel, GENDER_LABEL, geneticsLabel, NEXT_ACTION_LABEL } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { IntakeChips } from "@/components/navigator/ResultPanel";
import {
  AppointmentStatusBadge,
  EncounterStatusBadge,
  PriorityBadge,
  ReminderStatusBadge,
} from "@/components/StatusBadge";
import { EmptyState } from "@/components/ui";
import { AlertTriangle, CalendarClock, ChevronDown, ChevronRight, ClipboardCheck, MessageSquare } from "@/components/icons";

/** Các khối hiển thị hồ sơ xuyên suốt, dùng chung cho bệnh nhân (/patient/record) và bác sĩ (/doctor/patients/[id]). */

export function ProfileSummary({ profile, tone = "patient" }: { profile: PatientProfileOut | null; tone?: "patient" | "doctor" }) {
  if (!profile) {
    return <p className="text-sm text-slate-500">Chưa có thông tin sức khoẻ cơ bản.</p>;
  }
  const ls = profile.lifestyle;
  const items: Array<[string, string]> = [
    ["Tuổi", String(profile.age)],
    ["Giới tính", GENDER_LABEL[profile.gender]],
    ["Tiền sử gia đình", profile.genetics_history.length ? profile.genetics_history.map(geneticsLabel).join(", ") : "Không ghi nhận"],
    [
      "Hút thuốc",
      ls.smoking === true ? (ls.pack_years ? `Có, ${ls.pack_years} gói-năm` : "Có") : ls.smoking === false ? "Không" : "Chưa ghi",
    ],
    ["Viêm gan B/C", ls.hepatitis_b_or_c === true ? "Có" : ls.hepatitis_b_or_c === false ? "Không" : "Chưa ghi"],
    ["Xơ gan", ls.cirrhosis === true ? "Có" : ls.cirrhosis === false ? "Không" : "Chưa ghi"],
  ];
  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">{k}</dt>
          <dd className={`break-words font-semibold ${tone === "doctor" ? "text-slate-900" : "text-slate-800"}`}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AppointmentList({ appointments }: { appointments: AppointmentOut[] }) {
  if (!appointments.length) {
    return <EmptyState icon={CalendarClock} title="Chưa có lịch hẹn" />;
  }
  return (
    <ul className="space-y-2">
      {appointments.map((a) => (
        <li key={a.id} className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-3.5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{a.service_name}</p>
            <div className="flex flex-wrap gap-1.5">
              <PriorityBadge priority={a.priority} />
              <AppointmentStatusBadge status={a.status} />
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Mong muốn {formatDate(a.preferred_date)}
            {a.scheduled_date ? `, xác nhận ${formatDate(a.scheduled_date)}` : ""}
            {`, tạo lúc ${formatDateTime(a.created_at)}`}
          </p>
          {a.reason && <p className="text-xs text-slate-600">Lý do: {a.reason}</p>}
        </li>
      ))}
    </ul>
  );
}

export function EncounterList({
  encounters,
  appointments,
  hrefFor,
}: {
  encounters: EncounterOut[];
  appointments: AppointmentOut[];
  hrefFor: (e: EncounterOut) => string | null;
}) {
  if (!encounters.length) {
    return <EmptyState icon={ClipboardCheck} title="Chưa có lượt khám" />;
  }
  return (
    <ul className="space-y-2">
      {encounters.map((e) => {
        const href = hrefFor(e);
        const service = appointments.find((a) => a.id === e.appointment_id)?.service_name ?? "Lượt khám";
        const body = (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">{service}</p>
              <EncounterStatusBadge status={e.status} />
            </div>
            <p className="text-xs text-slate-600">
              {e.status === "finalized" ? `Hoàn tất ${formatDateTime(e.finalized_at)}` : `Bắt đầu ${formatDateTime(e.created_at)}`}
              {e.doctor ? `, ${e.doctor.full_name}` : ""}
            </p>
            {e.conclusion && <p className="line-clamp-2 text-sm text-slate-700">{e.conclusion}</p>}
            {e.final_plan && e.final_plan.items.length > 0 && (
              <p className="text-xs text-slate-500">
                Kế hoạch: {e.final_plan.items.map((i) => cancerLabel(i.cancer_type)).join(", ")}
              </p>
            )}
          </>
        );
        return (
          <li key={e.id}>
            {href ? (
              <Link
                href={href}
                className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-sm transition-shadow hover:border-slate-300 hover:shadow-md"
              >
                <div className="min-w-0 flex-1 space-y-1">{body}</div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </Link>
            ) : (
              <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-3.5 text-sm">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ReminderList({ reminders }: { reminders: ReminderOut[] }) {
  if (!reminders.length) return <p className="text-sm text-slate-500">Chưa có nhắc lịch.</p>;
  return (
    <ul className="space-y-2">
      {reminders.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{r.method}</p>
            <p className="text-xs text-slate-500">
              {cancerLabel(r.cancer_type)}, hạn {formatDate(r.due_date)}
              {r.completed_at ? `, đã làm ${formatDate(r.completed_at)}` : ""}
            </p>
          </div>
          <ReminderStatusBadge status={r.status} />
        </li>
      ))}
    </ul>
  );
}

export function ConsultationList({ consultations }: { consultations: ConsultationOut[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!consultations.length) {
    return <EmptyState icon={MessageSquare} title="Chưa có cuộc trò chuyện nào được gắn vào hồ sơ" />;
  }
  return (
    <ul className="space-y-2">
      {consultations.map((c) => {
        const reply = c.last_reply;
        const expanded = open === c.id;
        return (
          <li key={c.id} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">Tư vấn trực tuyến {formatDateTime(c.created_at)}</p>
              {reply && (
                <span
                  className={`badge border ${
                    reply.red_flag.detected
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {reply.red_flag.detected && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                  {NEXT_ACTION_LABEL[reply.next_action]}
                </span>
              )}
            </div>
            <IntakeChips intake={c.intake} />
            {reply && reply.suggestions.length > 0 && (
              <p className="text-xs text-slate-600">
                Gợi ý theo guideline: {reply.suggestions.map((s) => cancerLabel(s.cancer_type)).join(", ")}
              </p>
            )}
            {c.messages.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : c.id)}
                  aria-expanded={expanded}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  {expanded ? "Ẩn hội thoại" : `Xem hội thoại (${c.messages.length} tin nhắn)`}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {expanded && (
                  <ol className="mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
                    {c.messages.map((m, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-semibold text-slate-700">{m.role === "user" ? "Người dùng" : "Trợ lý"}: </span>
                        <span className="whitespace-pre-wrap text-slate-600">{m.content}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
