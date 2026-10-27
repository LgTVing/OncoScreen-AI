"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { errorMessage, isStatus } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import type { EncounterOut } from "@/types/api";
import { Disclaimer } from "@/components/Disclaimer";
import { PatientQuestionBox } from "@/components/PatientQuestionBox";
import { PlanTable } from "@/components/PlanTable";
import { ReminderList } from "@/components/RecordSections";
import { EncounterStatusBadge } from "@/components/StatusBadge";
import { EmptyState, InlineError, SkeletonList } from "@/components/ui";
import { ArrowLeft, Bell, ClipboardCheck, Clock, Stethoscope } from "@/components/icons";

/** Kết quả lượt khám (chỉ hiển thị khi bác sĩ đã hoàn tất — S4). */
export default function VisitPage({ params }: { params: { id: string } }) {
  const [enc, setEnc] = useState<EncounterOut | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    setError("");
    api
      .getEncounter(params.id)
      .then(setEnc)
      .catch((err) => {
        if (isStatus(err, 404)) setNotFound(true);
        else setError(errorMessage(err, "Chưa tải được kết quả lượt khám."));
      });
  }, [params.id]);
  useEffect(load, [load]);

  const back = (
    <Link href="/patient" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-teal-700">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Về trang tổng quan
    </Link>
  );

  if (notFound) {
    return (
      <div className="space-y-4">
        {back}
        <div className="card-padded">
          <EmptyState
            icon={ClipboardCheck}
            title="Không tìm thấy lượt khám"
            text="Lượt khám không tồn tại hoặc không thuộc tài khoản của bạn."
            action={
              <Link href="/patient/record" className="btn-primary">
                Xem hồ sơ xuyên suốt
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {back}
      {error && <InlineError message={error} onRetry={load} />}
      {!enc && !error && <SkeletonList rows={3} height="h-24" />}

      {enc && (
        <>
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="page-title">Kết quả lượt khám</h1>
              <EncounterStatusBadge status={enc.status} />
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              {enc.doctor && (
                <span className="inline-flex items-center gap-1.5">
                  <Stethoscope className="h-4 w-4" aria-hidden="true" />
                  {enc.doctor.full_name}
                </span>
              )}
              {enc.finalized_at && <span>Hoàn tất {formatDateTime(enc.finalized_at)}</span>}
            </p>
          </header>

          {enc.status !== "finalized" ? (
            <section className="card-padded">
              <EmptyState
                icon={Clock}
                title="Bác sĩ đang hoàn tất kết luận"
                text="Kết luận và kế hoạch tầm soát chỉ hiển thị sau khi bác sĩ xem xét và duyệt. Bạn sẽ thấy kết quả tại đây."
                action={
                  <Link href="/patient" className="btn-secondary">
                    Về trang tổng quan
                  </Link>
                }
              />
            </section>
          ) : (
            <>
              <section className="card-padded border-l-4 border-l-teal-600 shadow-sm">
                <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-900">
                  <ClipboardCheck className="h-5 w-5 text-teal-700" aria-hidden="true" />
                  Lời dặn của bác sĩ
                </h2>
                <p className="max-w-prose whitespace-pre-wrap text-base leading-relaxed text-slate-800">
                  {enc.conclusion ?? "Bác sĩ chưa ghi lời dặn."}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-semibold text-slate-900">Kế hoạch tầm soát đã duyệt</h2>
                {enc.final_plan && enc.final_plan.items.length > 0 ? (
                  <PlanTable plan={enc.final_plan} />
                ) : (
                  <p className="card-padded text-sm text-slate-600">
                    Trong lượt khám này bác sĩ không lập kế hoạch tầm soát định kỳ. Hãy làm theo lời dặn ở trên.
                  </p>
                )}
              </section>

              <section className="card-padded">
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                  <Bell className="h-5 w-5 text-teal-700" aria-hidden="true" />
                  Nhắc lịch từ kế hoạch này
                </h2>
                <ReminderList reminders={enc.reminders} />
                {enc.reminders.length > 0 && (
                  <Link href="/patient/reminders" className="btn-secondary mt-3">
                    Quản lý nhắc lịch
                  </Link>
                )}
              </section>

              <PatientQuestionBox encounterId={enc.id} />
            </>
          )}

          <Disclaimer text={enc.disclaimer} />
        </>
      )}
    </div>
  );
}
