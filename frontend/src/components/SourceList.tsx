"use client";
import { useState } from "react";
import type { Source } from "@/types/api";
import { ChevronDown, ExternalLink, FileText, History } from "@/components/icons";

export const isRecordSource = (s: Source) => s.doc_id.startsWith("record:");
export const recordEventId = (s: Source) => s.doc_id.slice("record:".length);

/**
 * Danh sách nguồn có thể mở rộng. Nguồn `record:<event_id>` (Copilot) hiển thị là mốc hồ sơ;
 * `onRecordClick` cho phép trang cha làm nổi bật mốc tương ứng trên timeline.
 */
export function SourceList({
  sources,
  defaultOpen = false,
  tone = "patient",
  onRecordClick,
  label,
}: {
  sources: Source[];
  defaultOpen?: boolean;
  tone?: "patient" | "doctor";
  onRecordClick?: (eventId: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (sources.length === 0) return null;
  const accent = tone === "doctor" ? "text-indigo-700" : "text-teal-700";
  const records = sources.filter(isRecordSource).length;
  const guidelines = sources.length - records;
  const summary =
    label ??
    [guidelines ? `${guidelines} nguồn guideline` : null, records ? `${records} mốc hồ sơ` : null].filter(Boolean).join(", ");

  return (
    <div className="rounded-lg border border-slate-200 bg-white text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left font-medium text-slate-700 hover:bg-slate-50`}
      >
        <span className="flex items-center gap-1.5">
          <FileText className={`h-3.5 w-3.5 ${accent}`} aria-hidden="true" />
          {summary}
        </span>
        <span className={`inline-flex items-center gap-1 ${accent}`}>
          {open ? "Thu gọn" : "Xem nguồn"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <ul className="space-y-2 border-t border-slate-100 p-2.5">
          {sources.map((s, i) => {
            const record = isRecordSource(s);
            return (
              <li key={`${s.doc_id}-${s.section ?? ""}-${i}`} className="space-y-1 rounded-md border border-slate-100 bg-slate-50 p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {record ? (
                    <History className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden="true" />
                  ) : (
                    <FileText className={`h-3.5 w-3.5 shrink-0 ${accent}`} aria-hidden="true" />
                  )}
                  <span className="font-semibold text-slate-800">{s.title}</span>
                  {s.section && <span className="text-slate-500">({s.section})</span>}
                </div>
                {s.excerpt && <p className="leading-relaxed text-slate-600">&ldquo;{s.excerpt}&rdquo;</p>}
                <div className="flex flex-wrap items-center gap-3">
                  {record && onRecordClick && (
                    <button
                      type="button"
                      onClick={() => onRecordClick(recordEventId(s))}
                      className="cursor-pointer font-medium text-indigo-700 underline-offset-2 hover:underline"
                    >
                      Xem mốc trên dòng thời gian
                    </button>
                  )}
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 font-medium ${accent} underline-offset-2 hover:underline`}
                    >
                      Đọc tài liệu gốc
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
