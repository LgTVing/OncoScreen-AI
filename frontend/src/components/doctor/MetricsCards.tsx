import type { ReactNode } from "react";
import type { MetricsOut } from "@/types/api";
import { percent } from "@/lib/format";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  FileSearch,
  Gauge,
  MessageSquare,
  Pencil,
  RefreshCw,
  Route,
  Timer,
  type IconType,
} from "@/components/icons";

function Card({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: IconType;
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "danger" | "warning" | "doctor";
}) {
  const border =
    accent === "danger"
      ? "border-l-4 border-l-red-500"
      : accent === "warning"
        ? "border-l-4 border-l-amber-500"
        : accent === "doctor"
          ? "border-l-4 border-l-indigo-500"
          : "";
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 ${border}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** Chỉ số vận hành từ GET /doctor/metrics. */
export function MetricsCards({ m }: { m: MetricsOut }) {
  const conversion = m.booking_suggested ? m.linked_consultations / m.booking_suggested : 0;
  const edited = m.encounters_finalized ? m.plans_edited_by_doctor / m.encounters_finalized : 0;
  const waiting = m.appointments_by_status.requested ?? 0;
  const confirmed = m.appointments_by_status.confirmed ?? 0;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        icon={MessageSquare}
        label="Phiên tư vấn Navigator"
        value={m.consultations}
        hint={`${m.linked_consultations} phiên đã gắn tài khoản`}
      />
      <Card
        icon={AlertTriangle}
        label="Phiên có red-flag"
        value={m.red_flag_consultations}
        hint="Được chuyển khám ưu tiên"
        accent={m.red_flag_consultations > 0 ? "danger" : undefined}
      />
      <Card
        icon={Route}
        label="Chuyển đổi sau gợi ý đặt lịch"
        value={percent(conversion)}
        hint={`${m.linked_consultations} tài khoản / ${m.booking_suggested} lần gợi ý`}
      />
      <Card
        icon={CalendarClock}
        label="Lịch hẹn đang mở"
        value={waiting + confirmed}
        hint={`${waiting} chờ xác nhận, ${confirmed} đã xác nhận`}
        accent={waiting > 0 ? "warning" : undefined}
      />
      <Card icon={ClipboardCheck} label="Lượt khám hoàn tất" value={m.encounters_finalized} accent="doctor" />
      <Card
        icon={Pencil}
        label="Kế hoạch bác sĩ chỉnh sửa"
        value={m.plans_edited_by_doctor}
        hint={`${percent(edited)} lượt khám hoàn tất`}
      />
      <Card
        icon={RefreshCw}
        label="Tỉ lệ fallback của agent"
        value={percent(m.agent_fallback_rate)}
        hint={`Trên ${m.agent_runs} lượt chạy`}
        accent={m.agent_fallback_rate > 0.2 ? "warning" : undefined}
      />
      <Card icon={FileSearch} label="Tỉ lệ thiếu căn cứ" value={percent(m.agent_insufficient_rate)} hint="insufficient_evidence" />
      <Card icon={Timer} label="Độ trễ p50" value={`${Math.round(m.agent_latency_ms_p50)} ms`} />
      <Card
        icon={Gauge}
        label="Độ trễ p95"
        value={`${Math.round(m.agent_latency_ms_p95)} ms`}
        accent={m.agent_latency_ms_p95 > 8000 ? "warning" : undefined}
      />
    </div>
  );
}
