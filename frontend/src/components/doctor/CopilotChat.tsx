"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { ChatTurn, QuestionAnswer } from "@/types/api";
import { SourceList } from "@/components/SourceList";
import { TraceEvents } from "@/components/doctor/TraceEvents";
import { InlineError } from "@/components/ui";
import { AlertTriangle, Bot, ChevronDown, Send, Sparkles } from "@/components/icons";

type Turn = ChatTurn & { result?: QuestionAnswer };

const PROMPTS = [
  "Tóm tắt tiền sử gia đình trong hồ sơ",
  "Bệnh nhân có dấu hiệu cảnh báo nào không?",
  "Kế hoạch nháp dựa trên guideline nào?",
];

const MAX_HISTORY = 8;

/** Chat với Copilot về lượt khám (POST /doctor/encounters/{id}/copilot), giữ ≤ 8 lượt lịch sử. */
export function CopilotChat({ encounterId, onRecordClick }: { encounterId: string; onRecordClick: (eventId: string) => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openTrace, setOpenTrace] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, loading]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    setLoading(true);
    setError("");
    const history: ChatTurn[] = turns
      .slice(-MAX_HISTORY)
      .map(({ role, content }) => ({ role, content: content.slice(0, 1000) }));
    setTurns((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    try {
      const result = await api.askCopilot(encounterId, { question, history });
      setTurns((prev) => [...prev, { role: "assistant", content: result.answer, result }]);
    } catch (err) {
      setTurns((prev) => prev.slice(0, -1));
      setInput(question);
      setError(errorMessage(err, "Copilot chưa trả lời được. Vui lòng thử lại."));
    } finally {
      setLoading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  return (
    <section className="card flex flex-col" aria-labelledby="copilot-chat-title">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 id="copilot-chat-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          Hỏi Copilot về hồ sơ
        </h2>
        <p className="text-xs text-slate-500">Trả lời có dẫn nguồn guideline và mốc hồ sơ. Không chẩn đoán.</p>
      </header>
      <div ref={scrollRef} className="max-h-[26rem] min-h-[10rem] space-y-3 overflow-y-auto p-4" aria-live="polite">
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => void ask(p)}
                disabled={loading}
                className="cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2 text-sm text-white">
              <span className="sr-only">Bác sĩ: </span>
              {t.content}
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 max-w-[90%] space-y-2">
                <div className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2 text-sm leading-relaxed text-slate-800">
                  <span className="sr-only">Copilot: </span>
                  {t.content}
                </div>
                {t.result?.insufficient_evidence && (
                  <p className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Chưa đủ căn cứ trong hồ sơ / guideline để trả lời.
                  </p>
                )}
                {t.result && <SourceList sources={t.result.sources} tone="doctor" onRecordClick={onRecordClick} />}
                {t.result && t.result.trace_events.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setOpenTrace(openTrace === i ? null : i)}
                      aria-expanded={openTrace === i}
                      className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                    >
                      Trace {t.result.trace_id}
                      <ChevronDown className={`h-3 w-3 transition-transform ${openTrace === i ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                    {openTrace === i && (
                      <div className="mt-1.5">
                        <TraceEvents events={t.result.trace_events} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        {loading && (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <span className="spinner text-indigo-600" aria-hidden="true" />
            Copilot đang tra cứu hồ sơ và guideline…
          </p>
        )}
      </div>
      <div className="border-t border-slate-200 p-3">
        {error && (
          <div className="mb-2">
            <InlineError message={error} />
          </div>
        )}
        <form onSubmit={submit} className="flex items-end gap-2">
          <label htmlFor="copilot-input" className="sr-only">
            Câu hỏi cho Copilot
          </label>
          <textarea
            id="copilot-input"
            rows={1}
            maxLength={1000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void ask(input);
              }
            }}
            placeholder="Ví dụ: Lần tầm soát gần nhất được ghi nhận khi nào?"
            className="input min-h-[42px] flex-1 resize-y focus:border-indigo-600 focus:ring-indigo-600/20"
            disabled={loading}
          />
          <button type="submit" className="btn-doctor shrink-0" disabled={loading || !input.trim()} aria-label="Gửi câu hỏi cho Copilot">
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
        <p className="mt-1.5 text-[11px] text-slate-500">Copilot giữ tối đa {MAX_HISTORY} lượt gần nhất làm ngữ cảnh.</p>
      </div>
    </section>
  );
}
