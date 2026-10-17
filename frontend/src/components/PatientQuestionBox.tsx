"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import type { QuestionAnswer } from "@/types/api";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  FileText,
  AlertTriangle,
} from "@/components/icons";

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
      setError("Chưa gửi được câu hỏi đến trợ lý. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card-padded space-y-4 border border-teal-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <MessageSquare className="h-4 w-4 text-teal-700" />
        <div>
          <h2 className="font-semibold text-slate-900 text-sm sm:text-base">
            Hỏi trợ lý về kế hoạch đã duyệt
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Trợ lý giải thích chi tiết các thuật ngữ y khoa và cơ sở guideline trong kế hoạch của bạn.
          </p>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="space-y-3" aria-live="polite">
          {messages.map((m, index) => (
            <div key={index} className="space-y-2 rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <User className="h-3.5 w-3.5 text-teal-700" />
                <span>Bạn:</span>
                <span className="font-normal text-slate-800">{m.question}</span>
              </div>

              <div className="flex items-start gap-1.5 text-slate-700 pt-1">
                <Bot className="h-3.5 w-3.5 text-teal-700 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <p className="whitespace-pre-wrap leading-relaxed">{m.result.answer}</p>

                  {m.result.sources.length > 0 && (
                    <div className="pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                      <span className="font-semibold">Nguồn trích dẫn:</span>
                      <ul className="mt-0.5 space-y-0.5">
                        {m.result.sources.map((source) => (
                          <li key={`${source.doc_id}-${source.section ?? ""}`} className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-teal-600" />
                            {source.url ? (
                              <a href={source.url} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                                {source.title}
                              </a>
                            ) : (
                              <span>{source.title}</span>
                            )}
                            {source.section ? ` · ${source.section}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {m.result.insufficient_evidence && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                      Lưu ý: Câu hỏi cần đánh giá lâm sàng chuyên sâu, vui lòng trao đổi trực tiếp với bác sĩ điều trị.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="patient-question" className="label text-xs font-semibold uppercase tracking-wider text-slate-500">
            Đặt câu hỏi làm rõ
          </label>
          <textarea
            id="patient-question"
            className="input w-full resize-y rounded-xl text-sm"
            rows={2}
            maxLength={1000}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ví dụ: Phương pháp chụp nhũ ảnh này cần chuẩn bị những gì trước khi đi khám?"
          />
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary flex items-center gap-2 text-xs"
          disabled={loading || !question.trim()}
        >
          {loading ? (
            <>
              <span className="spinner h-3.5 w-3.5" />
              <span>Đang tra cứu câu trả lời…</span>
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              <span>Gửi câu hỏi</span>
            </>
          )}
        </button>
      </form>
    </section>
  );
}
