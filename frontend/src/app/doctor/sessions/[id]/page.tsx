"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ScreeningPlan, SessionOut } from "@/types/api";
import { PlanTable } from "@/components/PlanTable";
import { RedFlagAlert } from "@/components/RedFlagAlert";
import { Disclaimer } from "@/components/Disclaimer";
import { SessionStatusBadge } from "@/components/SessionStatusBadge";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  User,
  FileText,
} from "@/components/icons";

/**
 * Màn duyệt HITL cho bác sĩ (Tuần 3).
 * Hiển thị: answers của bệnh nhân, risk assessment AI, draft plan editable, approve/reject với note.
 */
export default function DoctorSessionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionOut | null>(null);
  const [plan, setPlan] = useState<ScreeningPlan | null>(null);
  const [note, setNote] = useState("");
  const [acting, setActing] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getSession(params.id)
      .then((x) => {
        setSession(x);
        setPlan(x.draft_plan ?? x.final_plan);
      })
      .catch(console.error);
  }, [params.id]);

  async function act(action: "approve" | "reject") {
    if (action === "reject" && !note.trim()) {
      setError("Từ chối bắt buộc phải ghi lý do phản hồi cho bệnh nhân.");
      return;
    }
    if (action === "approve" && !plan && !note.trim()) {
      setError("Chưa có kế hoạch do thiếu nguồn. Vui lòng ghi chú kết luận của bác sĩ trước khi xác nhận.");
      return;
    }
    setError("");
    setActing(action);
    try {
      await api.review(params.id, {
        action,
        final_plan: action === "approve" && plan ? plan : undefined,
        note: note.trim() || undefined,
      });
      router.push("/doctor");
    } catch {
      setError("Thao tác thất bại. Vui lòng kiểm tra lại kết nối.");
      setActing(null);
    }
  }

  if (!session) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <span className="spinner h-7 w-7 text-indigo-600" aria-label="Đang tải dữ liệu phiên…" />
      </div>
    );
  }

  const riskLevelColor: Record<string, string> = {
    average: "bg-emerald-50 text-emerald-800 border-emerald-200",
    elevated: "bg-amber-50 text-amber-800 border-amber-200",
    high: "bg-red-50 text-red-800 border-red-200",
  };

  const riskLevelLabel: Record<string, string> = {
    average: "Nguy cơ trung bình",
    elevated: "Nguy cơ tăng",
    high: "Nguy cơ cao",
  };

  const boolLabel = (v: unknown) => {
    if (v === true || v === "true") return "Có";
    if (v === false || v === "false") return "Không";
    return String(v ?? "Chưa trả lời");
  };

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/doctor"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Quay lại hàng chờ duyệt</span>
        </Link>
        <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="page-title">Hồ sơ thẩm định: {session.patient_name}</h1>
              <SessionStatusBadge status={session.status} />
            </div>
            <p className="page-subtitle">
              Khởi tạo ngày:{" "}
              {new Date(session.created_at).toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Red flag alert (nếu có) */}
      {session.red_flag?.detected && (
        <RedFlagAlert result={session.red_flag} />
      )}

      {/* Thông tin bệnh nhân & Câu trả lời */}
      <section className="card-padded space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <User className="h-4 w-4 text-indigo-600" />
          <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Dữ liệu khảo sát từ bệnh nhân</h2>
        </div>

        {Object.keys(session.answers).length === 0 ? (
          <p className="text-sm text-slate-400 italic">Bệnh nhân chưa nộp câu trả lời nào.</p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            {Object.entries(session.answers).map(([qid, val]) => (
              <div key={qid} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <dt className="text-xs font-medium text-slate-500">{qid}</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {Array.isArray(val) ? val.join(", ") : boolLabel(val)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Đánh giá nguy cơ từ AI (Risk Assessment) */}
      {session.risk_assessment && (
        <section className="card-padded space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Mô hình AI Core đánh giá nguy cơ</h2>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-600">Tổng hợp đánh giá</p>
              <p className="mt-1 text-sm text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {session.risk_assessment.overall_summary}
              </p>
            </div>

            {session.risk_assessment.factors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600">Phân tầng nguy cơ theo cơ quan</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {session.risk_assessment.factors.map((f, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-3 text-xs space-y-1.5 ${
                        riskLevelColor[f.level] ?? "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{f.cancer_type}</span>
                        <span className="font-semibold text-[11px]">{riskLevelLabel[f.level] ?? f.level}</span>
                      </div>
                      {f.reasons.length > 0 && (
                        <ul className="list-disc pl-3 text-[11px] opacity-85 space-y-0.5">
                          {f.reasons.map((r, rIdx) => (
                            <li key={rIdx}>{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Kế hoạch tầm soát đề xuất */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-base">
            {session.status === "approved" ? "Kế hoạch tầm soát đã phê duyệt" : "Kế hoạch tầm soát dự thảo (Chỉnh sửa được)"}
          </h2>
          {session.status === "pending_review" && (
            <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              Bác sĩ có thể trực tiếp điều chỉnh ngày hẹn & chu kỳ
            </span>
          )}
        </div>

        {plan ? (
          <PlanTable
            plan={plan}
            editable={session.status === "pending_review"}
            onChange={setPlan}
          />
        ) : (
          <div className="card-padded text-center py-8 text-slate-500 bg-slate-50/60">
            <p className="text-sm">Chưa có kế hoạch dự thảo tự động cho phiên này (thiếu nguồn hoặc red-flag).</p>
          </div>
        )}
      </section>

      {/* Trace Events (Giám sát suy luận AI cho Bác sĩ) */}
      {session.trace_id && (
        <section className="card-padded space-y-3 bg-slate-50/70 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-700">
                Nhật ký thực thi AI Core (Trace Logs)
              </h3>
            </div>
            <span className="text-[11px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              Trace: {session.trace_id}
            </span>
          </div>
          <ol className="flex flex-wrap gap-2">
            {(session.trace_events ?? []).map((event, index) => (
              <li key={index} className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs text-slate-700 shadow-2xs">
                <span className="font-semibold text-slate-900">{String(event.node)}</span>
                <span className="inline-block h-2.5 w-px bg-slate-200" aria-hidden="true" />
                <span className="text-indigo-600 font-medium">{String(event.duration_ms ?? 0)} ms</span>
                {event.source_count !== undefined && (
                  <>
                    <span className="inline-block h-2.5 w-px bg-slate-200" aria-hidden="true" />
                    <span className="text-slate-500">{event.source_count} nguồn trích dẫn</span>
                  </>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Already reviewed info */}
      {(session.status === "approved" || session.status === "rejected") && session.reviewed_by && (
        <section className="card-padded text-sm text-slate-700 space-y-2 border-l-4 border-l-indigo-600">
          <div className="flex items-center gap-2">
            {session.status === "approved" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span>
              {session.status === "approved" ? "Kế hoạch đã được phê duyệt" : "Yêu cầu đã bị từ chối"} bởi{" "}
              <strong>Bác sĩ {session.reviewed_by.full_name}</strong>
              {session.reviewed_at && (
                <span className="text-slate-400 text-xs ml-1.5">
                  ({new Date(session.reviewed_at).toLocaleString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                  })})
                </span>
              )}
            </span>
          </div>
          {session.doctor_note && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-800 text-xs sm:text-sm">
              <span className="font-semibold text-slate-900">Ghi chú chuyên môn: </span>
              {session.doctor_note}
            </div>
          )}
        </section>
      )}

      {/* HITL Actions — only for pending_review */}
      {session.status === "pending_review" && (
        <section className="card-padded space-y-4 border border-indigo-100 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CheckCircle2 className="h-4 w-4 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 text-base">Quyết định y khoa của Bác sĩ</h2>
          </div>

          <div>
            <label htmlFor="doctor-note" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ghi chú cho bệnh nhân <span className="text-slate-400 font-normal lowercase">(bắt buộc nếu từ chối)</span>
            </label>
            <textarea
              id="doctor-note"
              rows={3}
              className="input w-full resize-y rounded-xl text-sm"
              placeholder="Nhập lý do điều chỉnh hoặc hướng dẫn bổ sung cho bệnh nhân…"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError("");
              }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              id="btn-approve"
              onClick={() => act("approve")}
              disabled={acting !== null}
              className="btn-doctor flex items-center gap-2 px-5 py-2.5"
            >
              {acting === "approve" ? (
                <span className="spinner h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>
                {acting === "approve"
                  ? "Đang xác nhận…"
                  : plan
                  ? "Phê duyệt kế hoạch tầm soát"
                  : "Xác nhận thiếu căn cứ"}
              </span>
            </button>

            <button
              id="btn-reject"
              onClick={() => act("reject")}
              disabled={acting !== null}
              className="btn-secondary flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
            >
              {acting === "reject" ? (
                <span className="spinner h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>{acting === "reject" ? "Đang xử lý…" : "Từ chối duyệt"}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Chỉ kế hoạch có ngày tầm soát đã xác nhận mới tạo lịch nhắc tự động cho bệnh nhân.
          </p>
        </section>
      )}

      <Disclaimer text={session.disclaimer} />
    </div>
  );
}
