"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import type { QuestionAnswer } from "@/types/api";

type Exchange = { question: string; result: QuestionAnswer };

export function PatientQuestionBox({ sessionId }: { sessionId: string }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.askQuestion(sessionId, value);
      setMessages((current) => [...current, { question: value, result }]);
      setQuestion("");
    } catch {
      setError("Chưa gửi được câu hỏi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card-padded space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800">Hỏi trợ lý về kết quả đã duyệt</h2>
        <p className="text-sm text-slate-600">
          Trợ lý chỉ giải thích nội dung đã có trong kế hoạch và tài liệu trích dẫn. Nếu phiên chưa có kế hoạch
          hoặc câu hỏi cần đánh giá y khoa, hãy trao đổi với bác sĩ.
        </p>
      </div>
      <div className="space-y-3" aria-live="polite">
        {messages.map((message, index) => (
          <div key={index} className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-800">Bạn: {message.question}</p>
            <p className="whitespace-pre-wrap text-slate-700">Trợ lý: {message.result.answer}</p>
            {message.result.sources.length > 0 && (
              <ul className="text-xs text-slate-500">
                {message.result.sources.map((source) => (
                  <li key={`${source.doc_id}-${source.section ?? ""}`}>
                    Nguồn: {source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.title}</a> : source.title}
                    {source.section ? ` · ${source.section}` : ""}
                  </li>
                ))}
              </ul>
            )}
            {message.result.insufficient_evidence && <p className="text-xs text-amber-700">Cần hỏi bác sĩ để được tư vấn thêm.</p>}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-2">
        <label htmlFor="patient-question" className="block text-sm font-medium text-slate-700">Câu hỏi của bạn</label>
        <textarea
          id="patient-question"
          className="input w-full resize-y"
          rows={3}
          maxLength={1000}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ví dụ: Kế hoạch đã duyệt nêu phương pháp tầm soát nào?"
        />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading || !question.trim()}>
          {loading ? "Đang trả lời…" : "Gửi câu hỏi"}
        </button>
      </form>
    </section>
  );
}
