import { Info } from "@/components/icons";

/** BẮT BUỘC hiển thị trên mọi màn kết quả (S6). Nội dung lấy từ API (session.disclaimer). */
export function Disclaimer({ text }: { text: string }) {
  return (
    <aside
      role="note"
      className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-sm text-amber-900"
    >
      <Info className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
      <div className="leading-relaxed">
        <strong className="font-semibold text-amber-950 mr-1.5">Lưu ý y khoa quan trọng:</strong>
        <span>{text}</span>
      </div>
    </aside>
  );
}
