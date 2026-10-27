"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { cancerLabel } from "@/lib/labels";
import { formatDate, formatDateTime, todayISO } from "@/lib/format";
import type { AppointmentOut, AppointmentStatus, MetricsOut, Page, ReminderOut } from "@/types/api";
import { AgentRunsPanel } from "@/components/doctor/AgentRunsPanel";
import { MetricsCards } from "@/components/doctor/MetricsCards";
import { AppointmentStatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { EmptyState, InlineError, MetaDivider, SkeletonList } from "@/components/ui";
import {
  Bell,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Play,
  RefreshCw,
  Stethoscope,
} from "@/components/icons";

const TABS: Array<{ label: string; value: AppointmentStatus | "" }> = [
  { label: "Tất cả", value: "" },
  { label: "Chờ xác nhận", value: "requested" },
  { label: "Đã xác nhận", value: "confirmed" },
  { label: "Đã khám", value: "completed" },
  { label: "Đã huỷ", value: "cancelled" },
];

function QueueRow({
  appt,
  onChanged,
}: {
  appt: AppointmentOut;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [date, setDate] = useState(appt.preferred_date >= todayISO() ? appt.preferred_date : todayISO());
  const [busy, setBusy] = useState<"confirm" | "start" | null>(null);
  const [error, setError] = useState("");
  const urgent = appt.priority === "urgent";
  const canStart = (appt.status === "requested" || appt.status === "confirmed") && !appt.encounter_id;

  async function confirm() {
    setBusy("confirm");
    setError("");
    try {
      await api.confirmAppointment(appt.id, { scheduled_date: date });
      onChanged();
    } catch (err) {
      setError(errorMessage(err, "Chưa xác nhận được lịch."));
    } finally {
      setBusy(null);
    }
  }

  async function start() {
    setBusy("start");
    setError("");
    try {
      const enc = await api.startAppointment(appt.id);
      router.push(`/doctor/encounters/${enc.id}`);
    } catch (err) {
      setError(errorMessage(err, "Chưa bắt đầu được lượt khám."));
      setBusy(null);
    }
  }

  return (
    <li
      className={`space-y-3 rounded-lg border p-4 ${
        urgent && appt.status !== "completed" && appt.status !== "cancelled"
          ? "border-red-200 border-l-4 border-l-red-500 bg-red-50/40"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/doctor/patients/${appt.patient_id}`}
            className="font-semibold text-slate-900 underline-offset-2 hover:text-indigo-700 hover:underline"
          >
            {appt.patient_name}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-600">
            <span>{appt.service_name}</span>
            <MetaDivider />
            <span>
              {appt.scheduled_date
                ? `Lịch khám ${formatDate(appt.scheduled_date)}`
                : `Mong muốn ${formatDate(appt.preferred_date)}`}
            </span>
            <MetaDivider />
            <span className="text-xs text-slate-500">Đặt lúc {formatDateTime(appt.created_at)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <PriorityBadge priority={appt.priority} />
          <AppointmentStatusBadge status={appt.status} />
        </div>
      </div>
      {appt.reason && <p className="max-w-prose text-sm text-slate-700">Lý do: {appt.reason}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        {appt.status === "requested" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div>
              <label htmlFor={`confirm-date-${appt.id}`} className="label text-xs">
                Ngày khám xác nhận
              </label>
              <input
                id={`confirm-date-${appt.id}`}
                type="date"
                min={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input focus:border-indigo-600 focus:ring-indigo-600/20"
              />
            </div>
            <button type="button" className="btn-secondary" onClick={() => void confirm()} disabled={busy !== null || !date}>
              {busy === "confirm" ? <span className="spinner" aria-hidden="true" /> : <CalendarCheck className="h-4 w-4" aria-hidden="true" />}
              Xác nhận lịch
            </button>
          </div>
        )}
        {canStart && (
          <button type="button" className="btn-doctor" onClick={() => void start()} disabled={busy !== null}>
            {busy === "start" ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Đang chuẩn bị tóm tắt…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" aria-hidden="true" />
                Bắt đầu khám
              </>
            )}
          </button>
        )}
        {appt.encounter_id && (
          <Link href={`/doctor/encounters/${appt.encounter_id}`} className={appt.status === "completed" ? "btn-secondary" : "btn-doctor"}>
            <Stethoscope className="h-4 w-4" aria-hidden="true" />
            {appt.status === "completed" ? "Xem lượt khám" : "Mở phiên khám"}
          </Link>
        )}
      </div>
      {error && <InlineError message={error} />}
    </li>
  );
}

/** Dashboard bác sĩ: hàng chờ lịch hẹn (ưu tiên trước), chỉ số vận hành, nhật ký agent. */
export default function DoctorDashboard() {
  const [status, setStatus] = useState<AppointmentStatus | "">("");
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState<Page<AppointmentOut> | null>(null);
  const [queueError, setQueueError] = useState("");
  const [metrics, setMetrics] = useState<MetricsOut | null>(null);
  const [metricsError, setMetricsError] = useState("");
  const [due, setDue] = useState<ReminderOut[]>([]);

  const loadQueue = useCallback(() => {
    setQueueError("");
    setQueue(null);
    api
      .listDoctorAppointments(status || undefined, page)
      .then(setQueue)
      .catch((err) => setQueueError(errorMessage(err, "Chưa tải được hàng chờ.")));
  }, [status, page]);

  const loadMetrics = useCallback(() => {
    setMetricsError("");
    api
      .getMetrics()
      .then(setMetrics)
      .catch((err) => setMetricsError(errorMessage(err, "Chưa tải được chỉ số.")));
    api.listDueReminders().then(setDue).catch(() => setDue([]));
  }, []);

  useEffect(loadQueue, [loadQueue]);
  useEffect(loadMetrics, [loadMetrics]);

  const refreshAll = () => {
    loadQueue();
    loadMetrics();
  };
  const totalPages = queue ? Math.max(1, Math.ceil(queue.total / queue.page_size)) : 1;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Hàng chờ khám</h1>
          <p className="page-subtitle">Lịch ưu tiên (có dấu hiệu cần khám sớm) luôn hiển thị trước, sau đó theo ngày.</p>
        </div>
        <button type="button" onClick={refreshAll} className="btn-secondary self-start sm:self-auto">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Làm mới
        </button>
      </header>

      <section className="space-y-4" aria-labelledby="queue-title">
        <h2 id="queue-title" className="sr-only">
          Danh sách lịch hẹn
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Lọc trạng thái lịch hẹn">
          {TABS.map((t) => (
            <button
              key={t.value || "all"}
              type="button"
              role="tab"
              aria-selected={status === t.value}
              onClick={() => {
                setStatus(t.value);
                setPage(1);
              }}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                status === t.value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {queueError && <InlineError message={queueError} onRetry={loadQueue} />}
        {!queue && !queueError && <SkeletonList rows={3} height="h-28" />}
        {queue && queue.items.length === 0 && (
          <div className="card-padded">
            <EmptyState
              icon={ClipboardList}
              title="Không có lịch hẹn"
              text={status ? "Không có lịch hẹn ở trạng thái đã chọn." : "Chưa có bệnh nhân đặt lịch."}
              action={
                status ? (
                  <button type="button" onClick={() => setStatus("")} className="btn-secondary">
                    Hiển thị tất cả
                  </button>
                ) : (
                  <Link href="/doctor/patients" className="btn-secondary">
                    Xem danh sách bệnh nhân
                  </Link>
                )
              }
            />
          </div>
        )}
        {queue && queue.items.length > 0 && (
          <ul className="space-y-3">
            {queue.items.map((a) => (
              <QueueRow key={a.id} appt={a} onChanged={refreshAll} />
            ))}
          </ul>
        )}
        {queue && totalPages > 1 && (
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
      </section>

      {due.length > 0 && (
        <section className="card-padded" aria-labelledby="due-title">
          <h2 id="due-title" className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Bell className="h-5 w-5 text-amber-600" aria-hidden="true" />
            Nhắc lịch đã đến hạn ({due.length})
          </h2>
          <ul className="space-y-2">
            {due.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-sm">
                <span>
                  <strong className="font-semibold text-slate-900">{r.method}</strong>
                  <span className="text-slate-600">
                    {" "}
                    ({cancerLabel(r.cancer_type)}), hạn {formatDate(r.due_date)}
                  </span>
                </span>
                <Link
                  href={`/doctor/patients/${r.patient_id}`}
                  className="text-sm font-medium text-indigo-700 underline-offset-2 hover:underline"
                >
                  Xem hồ sơ
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="metrics-title">
        <h2 id="metrics-title" className="text-base font-semibold text-slate-900">
          Chỉ số vận hành
        </h2>
        {metricsError && <InlineError message={metricsError} onRetry={loadMetrics} />}
        {!metrics && !metricsError && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-lg" />
            ))}
          </div>
        )}
        {metrics && <MetricsCards m={metrics} />}
      </section>

      <AgentRunsPanel />
    </div>
  );
}
