"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { EducationContent } from "@/types/api";
import { Disclaimer } from "@/components/Disclaimer";

type Topic = { cancer_type: string; title: string };

export default function EducationPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<EducationContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listEducationTopics().then(setTopics).catch(() => setError("Chưa tải được danh sách tài liệu."));
  }, []);

  async function openTopic(cancerType: string) {
    setLoading(true);
    setError("");
    try {
      setSelected(await api.getEducation(cancerType));
    } catch {
      setError("Chưa tải được nội dung. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="page-title">Tài liệu tầm soát</h1>
        <p className="page-subtitle">Nội dung tham khảo từ các guideline đã được biên tập trong dự án.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <button
            key={topic.cancer_type}
            type="button"
            onClick={() => openTopic(topic.cancer_type)}
            className="btn-secondary"
          >
            {topic.title}
          </button>
        ))}
      </div>
      {loading && <p className="text-sm text-slate-500">Đang tải…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {selected && !loading && (
        <section className="card-padded space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">{selected.title}</h2>
          <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.body_md}</div>
          {selected.sources.length > 0 && (
            <ul className="space-y-1 text-xs text-slate-500">
              {selected.sources.map((source) => (
                <li key={source.doc_id}>
                  Nguồn: {source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.title}</a> : source.title}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <Disclaimer text="Nội dung này chỉ để tham khảo, không thay thế tư vấn của bác sĩ và không dùng để tự chẩn đoán." />
    </div>
  );
}
