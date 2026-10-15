"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { CancerType, ChatTurn, QuestionAnswer } from "@/types/api";

type Topic = { cancer_type: CancerType; title: string };
type Message = ChatTurn & { result?: QuestionAnswer };

const LABELS: Partial<Record<CancerType, string>> = {
  breast: "Ung thư vú",
  cervical: "Ung thư cổ tử cung",
  colorectal: "Ung thư đại trực tràng",
  liver: "Ung thư gan",
  lung: "Ung thư phổi",
  prostate: "Ung thư tuyến tiền liệt",
};

export default function PatientChatPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topic, setTopic] = useState<CancerType>("breast");
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listEducationTopics().then(setTopics).catch(() => setError("Chưa tải được danh sách chủ đề."));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, pendingQuestion]);

  function chooseTopic(value: CancerType) {
    setTopic(value);
    setMessages([]);
    setQuestion("");
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value || loading) return;
    setLoading(true);
    setError("");
    setPendingQuestion(value);
    try {
      const history: ChatTurn[] = messages.slice(-8).map(({ role, content }) => ({ role, content: content.slice(0, 1000) }));
      const result = await api.chat({ question: value, cancer_type: topic, history });
      setMessages((current) => [
        ...current,
        { role: "user", content: value },
        { role: "assistant", content: result.answer, result },
      ]);
      setQuestion("");
    } catch {
      setError("Chưa gửi được câu hỏi. Vui lòng thử lại.");
    } finally {
      setPendingQuestion("");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="page-title">Chat với AI</h1>
        <p className="page-subtitle">Hỏi kiến thức chung về tầm soát ung thư dựa trên tài liệu đã có trong dự án.</p>
      </header>

      <section className="card-padded space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label htmlFor="chat-topic" className="block text-sm font-medium text-slate-700">Chủ đề</label>
            <select
              id="chat-topic"
              className="input mt-1 min-w-52"
              value={topic}
              disabled={loading}
              onChange={(event) => chooseTopic(event.target.value as CancerType)}
            >
              {(topics.length ? topics : [{ cancer_type: "breast" as CancerType, title: "Ung thư vú" }]).map((item) => (
                <option key={item.cancer_type} value={item.cancer_type}>
                  {LABELS[item.cancer_type] ?? item.title}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn-secondary text-sm" onClick={() => setMessages([])} disabled={loading || messages.length === 0}>
            Xóa hội thoại
          </button>
        </div>
        <p className="text-xs text-slate-600">
          Chỉ hỏi kiến thức chung. Trợ lý không đánh giá triệu chứng, xét nghiệm hoặc quyết định lịch tầm soát cá nhân.
          Hội thoại không được lưu khi tải lại trang. Với model demo miễn phí, chỉ nhập dữ liệu giả.
        </p>

        <div className="min-h-64 max-h-[28rem] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
          {messages.length === 0 && !pendingQuestion && (
            <div className="space-y-2 text-sm text-slate-600">
              <p>Ví dụ: “Khuyến nghị tầm soát ung thư vú cho nhóm nguy cơ trung bình là gì?”</p>
              <p>Hiện kho tài liệu mới có ví dụ ngắn về ung thư vú. Chủ đề chưa có nguồn sẽ báo thiếu thông tin.</p>
            </div>
          )}
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.result && message.result.sources.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs text-slate-600">
                    {message.result.sources.map((source) => (
                      <li key={`${source.doc_id}-${source.section ?? ""}`}>
                        Nguồn: {source.url ? <a className="underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : source.title}
                      </li>
                    ))}
                  </ul>
                )}
                {message.result?.insufficient_evidence && <p className="mt-2 text-xs text-amber-700">Cần hỏi bác sĩ để được tư vấn thêm.</p>}
              </div>
            </div>
          ))}
          {pendingQuestion && (
            <div className="space-y-2 text-sm">
              <div className="ml-auto w-fit max-w-[90%] rounded-2xl bg-blue-600 px-4 py-3 text-white">{pendingQuestion}</div>
              <div className="w-fit rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-600">Đang trả lời…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={submit} className="space-y-2">
          <label htmlFor="chat-question" className="block text-sm font-medium text-slate-700">Câu hỏi của bạn</label>
          <textarea
            id="chat-question"
            className="input w-full resize-y"
            rows={3}
            maxLength={1000}
            value={question}
            disabled={loading}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Hỏi về tài liệu tầm soát…"
          />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading || !question.trim()}>
            {loading ? "Đang trả lời…" : "Gửi câu hỏi"}
          </button>
        </form>
      </section>

      <p className="text-xs text-slate-600">
        Nội dung chỉ để tham khảo, không thay thế tư vấn bác sĩ. Nếu muốn hỏi về kế hoạch của mình, mở
        {" "}<Link href="/patient" className="text-blue-700 underline">phiên đã được bác sĩ duyệt</Link>.
      </p>
    </div>
  );
}
