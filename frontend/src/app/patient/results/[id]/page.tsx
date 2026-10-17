"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { SessionOut } from "@/types/api";
import { Disclaimer } from "@/components/Disclaimer";
import { RedFlagAlert } from "@/components/RedFlagAlert";
import { PlanTable } from "@/components/PlanTable";
import { SessionStatusBadge } from "@/components/SessionStatusBadge";
import { PatientQuestionBox } from "@/components/PatientQuestionBox";
import {
  ClipboardList,
  Clock,
  XCircle,
  Activity,
  CheckCircle2,
  Bell,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
} from "@/components/icons";

/**
 * Màn kết quả — rẽ nhánh theo status:
 *  - collecting     → link tiếp tục khảo sát
 *  - red_flag       → RedFlagAlert, không hiển thị plan
 *  - pending_review → thông báo chờ + polling 10s
 *  - rejected       → thông báo bác sĩ chưa duyệt + ghi chú
 *  - approved       → risk assessment + PlanTable (final_plan)
 */
export default function ResultPage({ params }: { params: { id: string } }) {
  const [s, setS] = useState<SessionOut | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function load() {
      api.getSession(params.id).then(setS).catch(console.error);
    }
    load();

    timerRef.current = setInterval(() => {
      setS((prev) => {
        if (prev?.status === "pending_review" || prev === null) {
          load();
        }
        return prev;
      });
    }, 10_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [params.id]);

  useEffect(() => {
    if (s && s.status !== "pending_review" && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [s?.status, s]);

  if (!s) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <span className="spinner h-7 w-7 text-teal-700" aria-label="Đang tải kết quả…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Kết quả thẩm định tầm soát</h1>
            <SessionStatusBadge status={s.status} />
          </div>
          <p className="page-subtitle">
            Phiên ngày:{" "}
            {new Date(s.created_at).toLocaleDateString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {s.has_red_flag && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 self-start sm:self-auto border border-red-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Dấu hiệu cần khám sớm</span>
          </span>
        )}
      </div>

      {/* ===== Collecting: chưa hoàn thành ===== */}
      {s.status === "collecting" && (
        <div className="card-padded space-y-4 text-center py-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-slate-900 text-base">Khảo sát chưa hoàn tất</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Phiên khảo sát của bạn vẫn đang dang dở. Hãy tiếp tục trả lời các câu hỏi để AI tổng hợp thông tin gửi bác sĩ.
            </p>
          </div>
          <Link
            href={`/patient/survey?session=${s.id}`}
            className="btn-primary inline-flex items-center gap-2"
          >
            <span>Tiếp tục làm khảo sát</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* ===== Red flag: dừng tư vấn, cảnh báo khám sớm ===== */}
      {s.status === "red_flag" && s.red_flag && (
        <RedFlagAlert result={s.red_flag} />
      )}

      {/* ===== Pending review: chờ bác sĩ ===== */}
      {s.status === "pending_review" && (
        <div className="card-padded flex flex-col items-center gap-3.5 py-10 text-center border-l-4 border-l-amber-500">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Clock className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <p className="font-semibold text-slate-900 text-base">Đang chờ Bác sĩ chuyên môn xem xét</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Theo quy trình an toàn y khoa, mọi kết quả và đề xuất tầm soát từ AI đều phải được bác sĩ trực tiếp kiểm tra và phê duyệt trước khi hiển thị cho bạn.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/80 px-3 py-1.5 rounded-full border border-amber-200">
            <span className="spinner h-3 w-3 text-amber-600" />
            <span>Trang tự động cập nhật trạng thái mỗi 10 giây</span>
          </div>
        </div>
      )}

      {/* ===== Rejected: bác sĩ chưa duyệt ===== */}
      {s.status === "rejected" && (
        <div className="card-padded space-y-4 border-l-4 border-l-slate-400">
          <div className="flex items-center gap-2 text-slate-800">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="font-semibold text-base">Bác sĩ chưa thể phê duyệt kế hoạch tự động này</p>
          </div>
          {s.doctor_note && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm text-slate-800 space-y-1">
              <p className="font-semibold text-slate-900">Ghi chú từ Bác sĩ:</p>
              <p className="leading-relaxed">{s.doctor_note}</p>
              {s.reviewed_by && (
                <p className="text-[11px] text-slate-400 pt-1">
                  Người duyệt: BS. {s.reviewed_by.full_name}
                  {s.reviewed_at && ` · ${new Date(s.reviewed_at).toLocaleDateString("vi-VN")}`}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500">
            Bạn có thể bắt đầu lại một phiên đánh giá mới với thông tin chi tiết hơn hoặc trao đổi trực tiếp với cơ sở y tế.
          </p>
          <Link href="/patient" className="btn-secondary inline-flex items-center gap-2 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại trang tổng quan</span>
          </Link>
        </div>
      )}

      {/* ===== Approved: hiển thị kết quả đầy đủ ===== */}
      {s.status === "approved" && s.final_plan && (
        <div className="space-y-6">
          {/* Risk assessment */}
          {s.risk_assessment && (
            <section className="card-padded space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Activity className="h-4 w-4 text-teal-700" />
                <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Đánh giá nguy cơ ung thư</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{s.risk_assessment.overall_summary}</p>
              {s.risk_assessment.factors.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {s.risk_assessment.factors.map((f) => (
                    <div
                      key={f.cancer_type}
                      className={`rounded-xl border p-3 text-xs flex-1 min-w-[240px] space-y-1 ${
                        f.level === "high"
                          ? "border-red-200 bg-red-50 text-red-900"
                          : f.level === "elevated"
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-emerald-200 bg-emerald-50 text-emerald-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase tracking-wider">{f.cancer_type}</span>
                        <span className="font-medium text-[11px]">
                          {f.level === "high" ? "Nguy cơ cao" : f.level === "elevated" ? "Nguy cơ tăng" : "Nguy cơ trung bình"}
                        </span>
                      </div>
                      {f.reasons.length > 0 && (
                        <ul className="list-disc pl-3 text-[11px] opacity-85 space-y-0.5">
                          {f.reasons.map((r) => <li key={r}>{r}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Final plan */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-700" />
              <h2 className="font-semibold text-slate-900 text-base">Kế hoạch tầm soát đã được Bác sĩ phê duyệt</h2>
            </div>
            <PlanTable plan={s.final_plan} />
          </section>

          {s.doctor_note && (
            <section className="card-padded text-xs sm:text-sm text-slate-800 space-y-1 border-l-4 border-l-teal-600">
              <p className="font-semibold text-slate-900">Lời dặn của Bác sĩ chuyên môn:</p>
              <p className="leading-relaxed">{s.doctor_note}</p>
            </section>
          )}

          <PatientQuestionBox sessionId={s.id} />

          {/* Reviewed by */}
          {s.reviewed_by && (
            <p className="text-xs text-slate-400 text-right flex items-center justify-end gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                Phê duyệt bởi <strong>BS. {s.reviewed_by.full_name}</strong>
                {s.reviewed_at && ` · ${new Date(s.reviewed_at).toLocaleDateString("vi-VN")}`}
              </span>
            </p>
          )}

          {/* Reminders CTA */}
          {s.reminders && s.reminders.length > 0 && (
            <section className="card-padded bg-teal-50/60 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Lịch nhắc định kỳ đã được kích hoạt</p>
                  <p className="text-xs text-slate-600">
                    Hệ thống đã tự động lên lịch nhắc cho {s.reminders.length} danh mục tầm soát.
                  </p>
                </div>
              </div>
              <Link href="/patient/reminders" className="btn-primary shrink-0 text-xs flex items-center gap-1.5">
                <span>Xem lịch nhắc</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>
          )}
        </div>
      )}

      {s.status === "approved" && !s.final_plan && (
        <div className="space-y-5">
          <section className="card-padded space-y-2 border-l-4 border-l-slate-400">
            <h2 className="font-semibold text-slate-900 text-base">Bác sĩ đã xem xét phiên đánh giá</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Hiện chưa đủ tài liệu guideline chuẩn để đề xuất kế hoạch tự động cho trường hợp của bạn.
            </p>
            {s.doctor_note && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2 text-xs">
                <strong>Ghi chú của bác sĩ:</strong> {s.doctor_note}
              </div>
            )}
          </section>
          <PatientQuestionBox sessionId={s.id} />
        </div>
      )}

      {/* ===== Disclaimer bắt buộc ===== */}
      <Disclaimer text={s.disclaimer} />

      {/* ===== Back link ===== */}
      <div className="pt-2">
        <Link
          href="/patient"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Quay về trang tổng quan</span>
        </Link>
      </div>
    </div>
  );
}
