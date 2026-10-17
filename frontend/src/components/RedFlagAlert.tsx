import type { RedFlagResult } from "@/types/api";
import { AlertTriangle, ShieldAlert } from "@/components/icons";

/** Cảnh báo dấu hiệu cần khám sớm — giọng điệu bình tĩnh, KHÔNG hiển thị plan (S3). */
export function RedFlagAlert({ result }: { result: RedFlagResult }) {
  return (
    <section
      role="alert"
      className="rounded-xl border border-red-200 border-l-4 border-l-red-500 bg-red-50/60 p-5 space-y-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-red-950 sm:text-lg">
            Khuyến nghị thăm khám chuyên khoa sớm
          </h2>
          {result.message ? (
            <p className="mt-1 text-sm text-red-900 leading-relaxed">{result.message}</p>
          ) : (
            <p className="mt-1 text-sm text-red-900 leading-relaxed">
              Dựa trên câu trả lời của bạn, hệ thống ghi nhận một số dấu hiệu cần được bác sĩ chuyên khoa thăm khám và đánh giá trực tiếp thay vì chỉ theo dõi tầm soát thông thường.
            </p>
          )}
        </div>
      </div>

      {result.flags.length > 0 && (
        <ul className="space-y-2.5 pt-1">
          {result.flags.map((f) => (
            <li
              key={f.code}
              className="flex items-start gap-3 rounded-lg border border-red-100 bg-white p-3.5 text-sm shadow-sm"
            >
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  f.severity === "urgent"
                    ? "bg-red-600 text-white"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                {f.severity === "urgent" ? "Khám khẩn" : "Cần lưu ý"}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-semibold text-slate-900">{f.symptom}</p>
                <p className="text-xs text-slate-600">{f.advice}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors"
        >
          Hướng dẫn đặt lịch khám tại cơ sở y tế
        </button>
      </div>
    </section>
  );
}
