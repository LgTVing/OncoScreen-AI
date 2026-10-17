"use client";
import { Suspense, useEffect, useReducer } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Answer, Question, Questionnaire, SessionOut } from "@/types/api";
import { Disclaimer } from "@/components/Disclaimer";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
} from "@/components/icons";

// ─── State management ──────────────────────────────────────────────────────────

interface SurveyState {
  session: SessionOut | null;
  questionnaire: Questionnaire | null;
  answers: Record<string, unknown>;
  step: number;
  submitting: boolean;
  error: string;
}

type Action =
  | { type: "SET_SESSION"; payload: SessionOut }
  | { type: "SET_ANSWER"; id: string; value: unknown }
  | { type: "TOGGLE_MULTI"; id: string; value: string; checked: boolean }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "SET_SUBMITTING"; v: boolean }
  | { type: "SET_ERROR"; msg: string };

function reducer(state: SurveyState, action: Action): SurveyState {
  switch (action.type) {
    case "SET_SESSION":
      return { ...state, session: action.payload, questionnaire: action.payload.questionnaire ?? null };
    case "SET_ANSWER":
      return { ...state, answers: { ...state.answers, [action.id]: action.value }, error: "" };
    case "TOGGLE_MULTI": {
      const cur = new Set((state.answers[action.id] as string[] | undefined) ?? []);
      action.checked ? cur.add(action.value) : cur.delete(action.value);
      return { ...state, answers: { ...state.answers, [action.id]: [...cur] } };
    }
    case "NEXT":
      return { ...state, step: state.step + 1, error: "" };
    case "PREV":
      return { ...state, step: Math.max(0, state.step - 1), error: "" };
    case "SET_SUBMITTING":
      return { ...state, submitting: action.v };
    case "SET_ERROR":
      return { ...state, error: action.msg };
    default:
      return state;
  }
}

const initState: SurveyState = { session: null, questionnaire: null, answers: {}, step: 0, submitting: false, error: "" };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isVisible(q: Question, answers: Record<string, unknown>): boolean {
  if (!q.depends_on) return true;
  const [k, v] = q.depends_on.split("=");
  return String(answers[k] ?? "").toLowerCase() === v.toLowerCase();
}

const CANCER_TYPE_LABELS: Record<string, string> = {
  breast: "Ung thư vú",
  lung: "Ung thư phổi",
  colorectal: "Ung thư đại trực tràng",
  cervical: "Ung thư cổ tử cung",
  liver: "Ung thư gan",
  prostate: "Ung thư tuyến tiền liệt",
  other: "Khác",
};

// ─── QuestionCard ───────────────────────────────────────────────────────────────

function QuestionCard({
  q,
  value,
  onChange,
  onMultiToggle,
}: {
  q: Question;
  value: unknown;
  onChange: (id: string, v: unknown) => void;
  onMultiToggle: (id: string, v: string, checked: boolean) => void;
}) {
  return (
    <div className="card-padded space-y-5 border border-slate-200/90 shadow-sm">
      <div className="space-y-1">
        <label htmlFor={`q-${q.id}`} className="block text-base font-semibold text-slate-900 sm:text-lg leading-snug">
          {q.text}
          {q.required && <span className="ml-1 text-red-500 font-bold" aria-hidden="true">*</span>}
        </label>
        {q.required ? (
          <p className="text-xs text-slate-400">Câu hỏi bắt buộc</p>
        ) : (
          <p className="text-xs text-slate-400">Không bắt buộc</p>
        )}
      </div>

      {/* Boolean */}
      {q.type === "boolean" && (
        <div className="grid grid-cols-2 gap-3">
          {(["true", "false"] as const).map((v) => {
            const isSelected = String(value) === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onChange(q.id, v === "true")}
                className={`flex items-center justify-center gap-2.5 rounded-xl border-2 p-4 text-sm font-semibold transition-all ${
                  isSelected
                    ? "border-teal-600 bg-teal-50/70 text-teal-900 shadow-sm ring-2 ring-teal-600/20"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-700" />}
                <span>{v === "true" ? "Có" : "Không"}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Number */}
      {q.type === "number" && (
        <div className="max-w-xs">
          <input
            id={`q-${q.id}`}
            type="number"
            min={0}
            value={(value as number | undefined) ?? ""}
            onChange={(e) => onChange(q.id, e.target.value === "" ? undefined : Number(e.target.value))}
            className="input text-base"
            placeholder="Nhập số lượng hoặc số năm…"
          />
        </div>
      )}

      {/* Text */}
      {q.type === "text" && (
        <input
          id={`q-${q.id}`}
          type="text"
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(q.id, e.target.value)}
          className="input text-base"
          placeholder="Nhập câu trả lời của bạn…"
        />
      )}

      {/* Single choice */}
      {q.type === "single_choice" && (
        <div className="flex flex-col gap-2.5">
          {q.options?.map((o) => {
            const isSelected = value === o;
            return (
              <button
                key={o}
                type="button"
                onClick={() => onChange(q.id, o)}
                className={`flex items-center justify-between rounded-xl border-2 p-4 text-sm font-medium transition-all text-left ${
                  isSelected
                    ? "border-teal-600 bg-teal-50/70 text-teal-950 shadow-sm ring-2 ring-teal-600/20"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{CANCER_TYPE_LABELS[o] ?? o}</span>
                {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Multi choice */}
      {q.type === "multi_choice" && (
        <div className="flex flex-col gap-2.5">
          {q.options?.map((o) => {
            const checked = ((value as string[] | undefined) ?? []).includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => onMultiToggle(q.id, o, !checked)}
                className={`flex items-center justify-between rounded-xl border-2 p-4 text-sm font-medium transition-all text-left ${
                  checked
                    ? "border-teal-600 bg-teal-50/70 text-teal-950 shadow-sm ring-2 ring-teal-600/20"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{CANCER_TYPE_LABELS[o] ?? o}</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded border ${
                    checked
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {checked && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round(((current + 1) / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-semibold text-slate-500">
        <span>Câu hỏi {current + 1} trên tổng số {total}</span>
        <span className="text-teal-700 font-bold">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
        <div
          className="h-full rounded-full bg-teal-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

// ─── Main Survey component ───────────────────────────────────────────────────────

function Survey() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session");
  const [state, dispatch] = useReducer(reducer, initState);

  useEffect(() => {
    if (sessionId) {
      api.getSession(sessionId).then((s) => dispatch({ type: "SET_SESSION", payload: s })).catch(console.error);
    } else {
      api.createSession().then((s) => {
        router.replace(`/patient/survey?session=${s.id}`);
        dispatch({ type: "SET_SESSION", payload: s });
      }).catch(console.error);
    }
  }, [sessionId, router]);

  const { session, questionnaire, answers, step, submitting, error } = state;

  if (!session || !questionnaire) {
    return (
      <div className="mx-auto max-w-2xl py-12 space-y-4">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-96" />
        <div className="skeleton h-48 rounded-xl" />
      </div>
    );
  }

  const visibleQuestions = questionnaire.questions.filter((q) => isVisible(q, answers));
  const current = visibleQuestions[step];
  const isLast = step === visibleQuestions.length - 1;
  const currentValue = current ? answers[current.id] : undefined;

  function validateCurrent(): boolean {
    if (!current) return true;
    if (!current.required) return true;
    if (current.type === "boolean" && currentValue === undefined) {
      dispatch({ type: "SET_ERROR", msg: "Vui lòng chọn Có hoặc Không để tiếp tục." });
      return false;
    }
    if (current.type === "single_choice" && !currentValue) {
      dispatch({ type: "SET_ERROR", msg: "Vui lòng chọn một phương án." });
      return false;
    }
    if (current.type === "multi_choice" && ((currentValue as string[] | undefined) ?? []).length === 0) {
      dispatch({ type: "SET_ERROR", msg: "Vui lòng chọn ít nhất một phương án phù hợp." });
      return false;
    }
    if (current.type === "number" && (currentValue === undefined || currentValue === "")) {
      dispatch({ type: "SET_ERROR", msg: "Vui lòng nhập số liệu." });
      return false;
    }
    return true;
  }

  function handleNext() {
    if (!validateCurrent()) return;
    if (isLast) {
      handleSubmit();
    } else {
      dispatch({ type: "NEXT" });
    }
  }

  async function handleSubmit() {
    if (!validateCurrent()) return;
    const sid = sessionId ?? session?.id;
    if (!sid) return;
    const payload: Answer[] = Object.entries(answers).map(([question_id, value]) => ({ question_id, value }));
    try {
      dispatch({ type: "SET_SUBMITTING", v: true });
      const res = await api.submitAnswers(sid, { answers: payload });
      router.push(`/patient/results/${res.id}`);
    } catch {
      dispatch({ type: "SET_ERROR", msg: "Gửi câu trả lời thất bại. Vui lòng thử lại." });
      dispatch({ type: "SET_SUBMITTING", v: false });
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold uppercase tracking-wider">
          <ClipboardList className="h-4 w-4" />
          <span>Phiên khảo sát OncoScreen AI</span>
        </div>
        <h1 className="page-title">Khảo sát đánh giá nguy cơ ung thư</h1>
        <p className="page-subtitle">
          Vui lòng trả lời chính xác để hệ thống đề xuất kế hoạch tầm soát phù hợp nhất cho bạn.
        </p>
      </header>

      {/* Progress */}
      <ProgressBar current={step} total={visibleQuestions.length} />

      {/* Question */}
      {current && (
        <QuestionCard
          q={current}
          value={currentValue}
          onChange={(id, v) => dispatch({ type: "SET_ANSWER", id, value: v })}
          onMultiToggle={(id, v, checked) => dispatch({ type: "TOGGLE_MULTI", id, value: v, checked })}
        />
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-sm text-red-700 border border-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => dispatch({ type: "PREV" })}
          disabled={step === 0 || submitting}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Câu trước</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={submitting}
          className="btn-primary flex items-center gap-2 px-6"
        >
          {submitting ? (
            <>
              <span className="spinner h-4 w-4" />
              <span>Đang tổng hợp kế hoạch…</span>
            </>
          ) : isLast ? (
            <>
              <span>Hoàn thành khảo sát</span>
              <Check className="h-4 w-4" />
            </>
          ) : (
            <>
              <span>Tiếp tục</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* Disclaimer */}
      {session.disclaimer && <Disclaimer text={session.disclaimer} />}
    </div>
  );
}

export default function SurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] items-center justify-center">
          <span className="spinner h-7 w-7 text-teal-700" />
        </div>
      }
    >
      <Survey />
    </Suspense>
  );
}
