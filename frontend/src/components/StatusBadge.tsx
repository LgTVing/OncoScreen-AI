import type { AppointmentStatus, BookingPriority, EncounterStatus, ReminderStatus } from "@/types/api";
import {
  APPOINTMENT_STATUS_LABEL,
  ENCOUNTER_STATUS_LABEL,
  PRIORITY_LABEL,
  REMINDER_STATUS_LABEL,
} from "@/lib/labels";
import { AlertTriangle } from "@/components/icons";

interface Style {
  badge: string;
  dot: string;
}

const NEUTRAL: Style = { badge: "bg-slate-100 text-slate-700 border border-slate-200", dot: "bg-slate-400" };

const APPOINTMENT_STYLE: Record<AppointmentStatus, Style> = {
  requested: { badge: "bg-amber-50 text-amber-800 border border-amber-200", dot: "bg-amber-500" },
  confirmed: { badge: "bg-sky-50 text-sky-800 border border-sky-200", dot: "bg-sky-500" },
  completed: { badge: "bg-emerald-50 text-emerald-800 border border-emerald-200", dot: "bg-emerald-500" },
  cancelled: NEUTRAL,
};

const ENCOUNTER_STYLE: Record<EncounterStatus, Style> = {
  in_progress: { badge: "bg-indigo-50 text-indigo-800 border border-indigo-200", dot: "bg-indigo-500" },
  finalized: { badge: "bg-emerald-50 text-emerald-800 border border-emerald-200", dot: "bg-emerald-500" },
};

const REMINDER_STYLE: Record<ReminderStatus, Style> = {
  scheduled: { badge: "bg-teal-50 text-teal-800 border border-teal-200", dot: "bg-teal-500" },
  due: { badge: "bg-amber-50 text-amber-800 border border-amber-200", dot: "bg-amber-500" },
  done: { badge: "bg-emerald-50 text-emerald-800 border border-emerald-200", dot: "bg-emerald-500" },
  skipped: NEUTRAL,
};

function Badge({ label, style, srPrefix }: { label: string; style: Style; srPrefix: string }) {
  return (
    <span className={`badge whitespace-nowrap ${style.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      <span className="sr-only">{srPrefix}: </span>
      <span>{label}</span>
    </span>
  );
}

/** Trạng thái lịch hẹn. */
export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge label={APPOINTMENT_STATUS_LABEL[status] ?? status} style={APPOINTMENT_STYLE[status] ?? NEUTRAL} srPrefix="Trạng thái lịch hẹn" />
  );
}

export function EncounterStatusBadge({ status }: { status: EncounterStatus }) {
  return (
    <Badge label={ENCOUNTER_STATUS_LABEL[status] ?? status} style={ENCOUNTER_STYLE[status] ?? NEUTRAL} srPrefix="Trạng thái lượt khám" />
  );
}

export function ReminderStatusBadge({ status }: { status: ReminderStatus }) {
  return (
    <Badge label={REMINDER_STATUS_LABEL[status] ?? status} style={REMINDER_STYLE[status] ?? NEUTRAL} srPrefix="Trạng thái nhắc lịch" />
  );
}

export function PriorityBadge({ priority }: { priority: BookingPriority }) {
  if (priority === "urgent") {
    return (
      <span className="badge whitespace-nowrap border border-red-200 bg-red-50 text-red-700">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">Mức ưu tiên: </span>
        {PRIORITY_LABEL.urgent}
      </span>
    );
  }
  return (
    <span className="badge whitespace-nowrap border border-slate-200 bg-white text-slate-600">
      <span className="sr-only">Mức ưu tiên: </span>
      {PRIORITY_LABEL.routine}
    </span>
  );
}
