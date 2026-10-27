import Link from "next/link";
import { HeartPulse } from "@/components/icons";

/** Logo dùng chung. Không gắn thương hiệu bệnh viện thật — bệnh viện cấu hình khi triển khai. */
export function Brand({
  href = "/",
  tone = "patient",
  subtitle = "Trợ lý tầm soát ung thư",
}: {
  href?: string;
  tone?: "patient" | "doctor";
  subtitle?: string;
}) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="OncoScreen AI, về trang chính">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${
          tone === "doctor" ? "bg-indigo-600" : "bg-teal-700"
        }`}
      >
        <HeartPulse className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col">
        <span className="text-base font-bold leading-tight tracking-tight text-slate-900">OncoScreen AI</span>
        <span className="text-[11px] font-medium text-slate-500">{subtitle}</span>
      </span>
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white py-4 text-xs text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
        <span>OncoScreen AI hỗ trợ tìm hiểu và theo dõi tầm soát ung thư tại bệnh viện.</span>
        <span className="flex items-center gap-2">
          <span>Không chẩn đoán</span>
          <span className="inline-block h-2.5 w-px bg-slate-300" aria-hidden="true" />
          <span>Kế hoạch do bác sĩ duyệt</span>
          <span className="inline-block h-2.5 w-px bg-slate-300" aria-hidden="true" />
          <span>
            Cấp cứu:{" "}
            <a href="tel:115" className="font-semibold text-slate-700 underline-offset-2 hover:underline">
              115
            </a>
          </span>
        </span>
      </div>
    </footer>
  );
}
