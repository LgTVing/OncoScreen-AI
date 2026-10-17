"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { EducationContent } from "@/types/api";
import { Disclaimer } from "@/components/Disclaimer";
import {
  BookOpen,
  FileText,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from "@/components/icons";

type Topic = { cancer_type: string; title: string };

export default function EducationPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeType, setActiveType] = useState<string>("");
  const [selected, setSelected] = useState<EducationContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listEducationTopics()
      .then((data) => {
        setTopics(data);
        if (data.length > 0) {
          openTopic(data[0].cancer_type);
        }
      })
      .catch(() => setError("Chưa tải được danh mục tài liệu tầm soát."));
  }, []);

  async function openTopic(cancerType: string) {
    setActiveType(cancerType);
    setLoading(true);
    setError("");
    try {
      setSelected(await api.getEducation(cancerType));
    } catch {
      setError("Chưa tải được nội dung tài liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="page-title">Thư viện Hướng dẫn Tầm soát</h1>
          <span className="badge bg-teal-50 text-teal-700 border border-teal-200">
            <BookOpen className="h-3 w-3" />
            <span>Y khoa chính thống</span>
          </span>
        </div>
        <p className="page-subtitle">
          Tổng hợp kiến thức và khuyến nghị tầm soát từ các hiệp hội ung thư uy tín (USPSTF, NCCN, ACS).
        </p>
      </header>

      {/* Topic selection pills */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {topics.map((t) => (
          <button
            key={t.cancer_type}
            type="button"
            onClick={() => openTopic(t.cancer_type)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              activeType === t.cancer_type
                ? "bg-teal-700 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="card-padded space-y-4">
          <div className="skeleton h-7 w-64" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton h-24 w-full rounded-xl" />
        </div>
      ) : selected ? (
        <div className="space-y-6">
          <section className="card-padded space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold text-slate-900">{selected.title}</h2>
              <span className="text-xs text-slate-500 mt-1 inline-block font-medium">
                Chuyên đề: <strong className="font-semibold text-slate-700">{selected.cancer_type}</strong>
              </span>
            </div>

            {/* Warning Signs & Prevention (nếu có) */}
            {selected.warning_signs && selected.warning_signs.length > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-red-800 font-semibold text-xs sm:text-sm">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <span>Dấu hiệu cảnh báo cần thăm khám sớm:</span>
                </div>
                <ul className="grid sm:grid-cols-2 gap-2 text-xs text-red-900">
                  {selected.warning_signs.map((sign, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-red-100">
                      <span className="text-red-500 font-bold">•</span>
                      <span>{sign}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Body Markdown/Text */}
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {selected.body_md}
            </div>

            {/* Prevention tips */}
            {selected.prevention_tips && selected.prevention_tips.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-slate-700">
                  Lời khuyên phòng ngừa chủ động:
                </p>
                <ul className="grid sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  {selected.prevention_tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-teal-50/50 p-2.5 rounded-lg border border-teal-100">
                      <CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources */}
            {selected.sources.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-500">
                <p className="font-semibold text-slate-700">Tài liệu tham chiếu chuẩn y khoa:</p>
                <ul className="space-y-1">
                  {selected.sources.map((source) => (
                    <li key={source.doc_id} className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-700 hover:underline font-medium inline-flex items-center gap-1"
                        >
                          <span>{source.title}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span>{source.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      ) : null}

      <Disclaimer text="Tài liệu chỉ mang tính chất tham khảo giáo dục sức khỏe, không thay thế chẩn đoán hoặc chỉ định lâm sàng của bác sĩ." />
    </div>
  );
}
