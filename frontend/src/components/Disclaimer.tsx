import { Info, ShieldCheck } from "@/components/icons";

/**
 * BẮT BUỘC hiển thị trên mọi màn kết quả (S6). Nội dung lấy từ API (`disclaimer`).
 * variant="copilot": lưu ý dành cho bác sĩ khi dùng Clinical Copilot.
 */
export function Disclaimer({
  text,
  variant = "patient",
  compact = false,
}: {
  text: string;
  variant?: "patient" | "copilot";
  compact?: boolean;
}) {
  const isCopilot = variant === "copilot";
  const Icon = isCopilot ? ShieldCheck : Info;
  return (
    <aside
      role="note"
      className={`flex items-start gap-3 rounded-xl border ${
        isCopilot ? "border-indigo-200 bg-indigo-50/70 text-indigo-950" : "border-amber-200/80 bg-amber-50/70 text-amber-900"
      } ${compact ? "p-3 text-xs" : "p-4 text-sm"}`}
    >
      <Icon
        className={`mt-0.5 shrink-0 ${compact ? "h-4 w-4" : "h-5 w-5"} ${isCopilot ? "text-indigo-600" : "text-amber-600"}`}
        aria-hidden="true"
      />
      <div className="leading-relaxed">
        <strong className="mr-1.5 font-semibold">
          {isCopilot ? "Công cụ hỗ trợ, bác sĩ quyết định:" : "Lưu ý y khoa quan trọng:"}
        </strong>
        <span>{text}</span>
      </div>
    </aside>
  );
}
