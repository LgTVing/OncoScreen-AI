"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { CancerType, ChatTurn, QuestionAnswer } from "@/types/api";
import {
  MessageSquare,
  Send,
  Trash2,
  Sparkles,
  Bot,
  User,
  FileText,
  AlertTriangle,
  ChevronRight,
  Info,
} from "@/components/icons";

type Topic = { cancer_type: CancerType; title: string };
type Message = ChatTurn & { result?: QuestionAnswer };

const LABELS: Record<CancerType, string> = {
  breast: "Ung thư vú",
  cervical: "Ung thư cổ tử cung",
  colorectal: "Ung thư đại trực tràng",
  liver: "Ung thư gan",
  lung: "Ung thư phổi",
  prostate: "Ung thư tiền liệt tuyến",
  other: "Khác",
};

const SUGGESTED_QUESTIONS: Record<CancerType, string[]> = {
  breast: [
    "Ai nên bắt đầu chụp nhũ ảnh định kỳ?",
    "Chụp nhũ ảnh bao lâu một lần theo khuyến nghị?",
    "Có khối u ở ngực nhưng không đau thì sao?",
  ],
  cervical: [
    "Độ tuổi nào nên bắt đầu làm xét nghiệm Pap smear?",
    "Tiêm vaccine HPV rồi có cần tầm soát cổ tử cung không?",
  ],
  colorectal: [
    "Nội soi đại tràng nên bắt đầu từ bao nhiêu tuổi?",
    "Xét nghiệm phân tìm máu ẩn (FIT) có ý nghĩa gì?",
  ],
  lung: [
    "Người hút thuốc bao nhiêu năm thì nên chụp CT liều thấp?",
    "Chụp CT liều thấp có an toàn không?",
  ],
  liver: [
    "Người viêm gan B nên tầm soát ung thư gan thế nào?",
    "Xét nghiệm AFP và siêu âm gan bao lâu một lần?",
  ],
  prostate: [
    "Xét nghiệm PSA là gì và ai nên làm?",
    "Độ tuổi khuyến nghị tầm soát tiền liệt tuyến?",
  ],
  other: [
    "Tầm soát ung thư định kỳ gồm những xét nghiệm gì?",
    "Khi nào cần tầm soát ung thư sớm?",
  ],
};

export default function PatientChatPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topic, setTopic] = useState<CancerType>("breast");
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .listEducationTopics()
      .then((data) => {
        if (data && data.length > 0) setTopics(data);
      })
      .catch(() => setError("Chưa tải được danh mục chủ đề tầm soát."));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function chooseTopic(value: CancerType) {
    setTopic(value);
    setMessages([]);
    setQuestion("");
    setError("");
    setExpandedSources({});
  }

  async function sendMessage(textToSend: string) {
    const value = textToSend.trim();
    if (!value || loading) return;

    setLoading(true);
    setError("");
    setQuestion("");

    // Add user message immediately
    const userMsg: Message = { role: "user", content: value };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const history: ChatTurn[] = messages
        .slice(-8)
        .map(({ role, content }) => ({ role, content: content.slice(0, 1000) }));

      const result = await api.chat({ question: value, cancer_type: topic, history });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.answer, result },
      ]);
    } catch {
      setError("Hệ thống chưa kết nối được với trợ lý AI. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(question);
  }

  const activeSuggestions = SUGGESTED_QUESTIONS[topic] ?? SUGGESTED_QUESTIONS.breast;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Trợ lý AI Tầm soát Ung thư</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
              <Sparkles className="h-3 w-3 text-teal-600" />
              Y khoa hỗ trợ
            </span>
          </div>
          <p className="page-subtitle">
            Hỏi đáp kiến thức chung về hướng dẫn tầm soát theo tài liệu chuẩn y khoa (USPSTF, NCCN).
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setExpandedSources({});
            }}
            disabled={loading}
            className="btn-ghost flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 self-start sm:self-auto"
          >
            <Trash2 className="h-4 w-4" />
            <span>Làm mới đoạn chat</span>
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden flex flex-col">
        {/* Topic Selector Pills */}
        <div className="border-b border-slate-200/80 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
            Chọn chủ đề tầm soát
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LABELS).map(([key, label]) => {
              const isActive = topic === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={loading}
                  onClick={() => chooseTopic(key as CancerType)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-teal-700 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 min-h-[22rem] max-h-[32rem] overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center max-w-md mx-auto space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-100">
                <Bot className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-900">
                  Chào bạn! Tôi có thể hỗ trợ gì về {LABELS[topic]}?
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tôi được huấn luyện dựa trên các hướng dẫn tầm soát chính thống để trả lời các thắc mắc về đối tượng, độ tuổi và phương pháp tầm soát.
                </p>
              </div>

              {/* Quick Prompt Chips */}
              <div className="w-full pt-3 space-y-2 text-left">
                <p className="text-xs font-medium text-slate-400">Câu hỏi thường gặp:</p>
                <div className="flex flex-col gap-2">
                  {activeSuggestions.map((promptText) => (
                    <button
                      key={promptText}
                      type="button"
                      onClick={() => sendMessage(promptText)}
                      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-medium text-slate-700 hover:border-teal-500 hover:bg-teal-50/40 transition-all text-left"
                    >
                      <span>{promptText}</span>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-teal-600 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 text-xs font-bold">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div className={`space-y-2 max-w-[85%] sm:max-w-[75%]`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? "bg-teal-700 text-white rounded-br-sm"
                          : "bg-slate-100 text-slate-900 rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>

                    {/* AI References & Sources */}
                    {!isUser && m.result && (
                      <div className="space-y-1.5 pt-0.5">
                        {m.result.insufficient_evidence && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>Chưa có đủ guideline trong dự án để giải đáp câu hỏi cụ thể này.</span>
                          </div>
                        )}

                        {m.result.sources && m.result.sources.length > 0 && (
                          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSources((prev) => ({ ...prev, [idx]: !prev[idx] }))
                              }
                              className="flex items-center justify-between w-full font-medium text-slate-700 hover:text-teal-700"
                            >
                              <span className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-teal-600" />
                                <span>{m.result.sources.length} tài liệu y khoa tham chiếu</span>
                              </span>
                              <span className="text-[11px] text-teal-700">
                                {expandedSources[idx] ? "Thu gọn ▲" : "Xem nguồn ▼"}
                              </span>
                            </button>

                            {expandedSources[idx] && (
                              <ul className="space-y-2 border-t border-slate-100 pt-2 text-slate-600">
                                {m.result.sources.map((s, sIdx) => (
                                  <li key={sIdx} className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    <p className="font-semibold text-slate-800">{s.title}</p>
                                    {s.section && <p className="text-[11px] text-slate-500">Mục: {s.section}</p>}
                                    {s.excerpt && (
                                      <p className="text-[11px] text-slate-600 italic bg-white p-1.5 rounded border border-slate-100">
                                        &ldquo;{s.excerpt}&rdquo;
                                      </p>
                                    )}
                                    {s.url && (
                                      <a
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-teal-700 hover:underline text-[11px] inline-block font-medium"
                                      >
                                        Đọc tài liệu gốc ↗
                                      </a>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-800 text-white text-xs font-bold">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-3 text-slate-500 text-xs">
                <span className="h-2 w-2 rounded-full bg-teal-600 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-2 font-medium">Trợ lý AI đang tra cứu hướng dẫn y khoa…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-200/90 bg-white p-3 sm:p-4">
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={question}
              disabled={loading}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Đặt câu hỏi về ${LABELS[topic]} (ví dụ: đối tượng tầm soát, độ tuổi...)`}
              className="input flex-1 rounded-xl"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="btn-primary h-11 px-5 rounded-xl flex items-center gap-2 shrink-0"
              title="Gửi câu hỏi"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Gửi</span>
            </button>
          </form>

          <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-slate-400">
            <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>
              Trợ lý chỉ cung cấp kiến thức tầm soát chung; không dùng để chẩn đoán hay thay thế bác sĩ.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
