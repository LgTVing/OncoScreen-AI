import type { ReactNode } from "react";
import type { RedFlagResult } from "@/types/api";
import { AlertTriangle, Phone, ShieldAlert } from "@/components/icons";

/**
 * Cảnh báo dấu hiệu cần khám sớm (S3) — giọng điệu bình tĩnh, không trấn an sai, không hiển thị gợi ý tầm soát.
 * `action`: CTA đặt lịch ưu tiên do trang cha quyết định (đăng ký / đặt lịch).
 */
export function RedFlagAlert({
  result,
  action,
  showEmergency = true,
}: {
  result: RedFlagResult;
  action?: ReactNode;
  showEmergency?: boolean;
}) {
  return (
    <section
      role="alert"
      className="space-y-4 rounded-xl border border-red-200 border-l-4 border-l-red-500 bg-red-50/60 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-red-950 sm:text-lg">Bạn nên được bác sĩ khám sớm</h2>
          <p className="mt-1 text-sm leading-relaxed text-red-900">
            {result.message ??
              "Một số dấu hiệu bạn mô tả cần được bác sĩ thăm khám trực tiếp thay vì chỉ tầm soát định kỳ."}
          </p>
        </div>
      </div>

      {result.flags.length > 0 && (
        <ul className="space-y-2">
          {result.flags.map((f) => (
            <li key={f.code} className="flex flex-col gap-2 rounded-lg border border-red-100 bg-white p-3 text-sm sm:flex-row sm:items-start">
              <span
                className={`badge shrink-0 self-start ${
                  f.severity === "urgent" ? "bg-red-600 text-white" : "bg-amber-100 text-amber-900"
                }`}
              >
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {f.severity === "urgent" ? "Khám trong vài ngày" : "Khám trong vài tuần"}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-semibold text-slate-900">{f.symptom}</p>
                <p className="text-xs leading-relaxed text-slate-600">{f.advice}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(action || showEmergency) && (
        <div className="flex flex-col gap-3 border-t border-red-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          {showEmergency && (
            <p className="flex items-start gap-2 text-sm font-medium text-red-900">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Nếu triệu chứng nặng lên đột ngột, hãy gọi cấp cứu{" "}
                <a href="tel:115" className="font-bold underline underline-offset-2">
                  115
                </a>{" "}
                hoặc đến cơ sở y tế gần nhất.
              </span>
            </p>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
    </section>
  );
}
