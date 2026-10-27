"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { QuestionAnswer } from "@/types/api";
import { SourceList } from "@/components/SourceList";
import { InlineError } from "@/components/ui";
import { AlertTriangle, Bot, MessageSquare, Send, User } from "@/components/icons";

type Exchange = { question: string; result: QuestionAnswer };

const PROMPTS = ["Vì sao tôi cần làm xét nghiệm này?", "Lần tầm soát tới của tôi là khi nào?", "Tôi cần chuẩn bị gì trước khi đi tầm soát?"];

/** Hỏi trợ lý về kết luận & kế hoạch bác sĩ đã duyệt (POST /encounters/{id}/questions). */
export function PatientQuestionBox({ encounterId }: { encounterId: string }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(value: string) {
    const q = value.trim();
    if (!q || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.askEncounterQuestion(encounterId, q);
      setMessages((current) => [...current, { question: q, result }]);
      setQuestion("");
    } catch (err) {
      setError(errorMessage(err, "Chưa gửi được câu hỏi đến trợ lý. Vui lòng thử lại."));
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <section className="card-padded space-y-4" aria-labelledby="patient-qa-title">
      <div className="flex items-start gap-2 border-b border-slate-100 pb-3">
        <MessageSquare className="mt-0.5 h-5 w-5 text-teal-700" aria-hidden="true" />
        <div>
          <h2 id="patient-qa-title" className="text-base font-semibold text-slate-900">
            Hỏi trợ lý về kế hoạch đã duyệt
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Trợ lý giải thích kế hoạch bác sĩ đã duyệt; không chẩn đoán và không đọc kết quả xét nghiệm.
          </p>
        </div>
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => void ask(p)}
              disabled={loading}
              className="cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-3" aria-live="polite">
          {messages.map((m, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3.5 text-sm">
              <p className="flex items-start gap-2 font-medium text-slate-900">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                <span>{m.question}</span>
              </p>
              <div className="flex items-start gap-2 text-slate-700">
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="whitespace-pre-wrap leading-relaxed">{m.result.answer}</p>
                  {m.result.insufficient_evidence && (
                    <p className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Chưa đủ căn cứ trong kế hoạch đã duyệt; bạn nên hỏi trực tiếp bác sĩ.
                    </p>
                  )}
                  <SourceList sources={m.result.sources} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="patient-question" className="label">
            Câu hỏi của bạn
          </label>
          <textarea
            id="patient-question"
            className="input resize-y"
            rows={2}
            maxLength={1000}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ví dụ: Chụp nhũ ảnh cần chuẩn bị những gì?"
          />
        </div>
        {error && <InlineError message={error} />}
        <button type="submit" className="btn-primary" disabled={loading || !question.trim()}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span>Đang xử lý…</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>Gửi câu hỏi</span>
            </>
          )}
        </button>
      </form>
    </section>
  );
}
