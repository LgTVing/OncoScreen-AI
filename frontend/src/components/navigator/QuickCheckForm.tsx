"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Answer, CancerType, IntakeProfile, Question, Questionnaire } from "@/types/api";
import { ArrowLeft, ArrowRight, CheckCircle2, ListChecks, X } from "@/components/icons";

export type AnswerValue = string | number | boolean | string[];
export type QuickValues = Record<string, AnswerValue | undefined>;

/** `depends_on` dạng "question_id=value" (vd. "smoking=true", "gender=Nữ"). */
export function isQuestionVisible(q: Question, values: QuickValues): boolean {
  if (!q.depends_on) return true;
  const sep = q.depends_on.indexOf("=");
  if (sep < 0) return true;
  const qid = q.depends_on.slice(0, sep).trim();
  const expected = q.depends_on.slice(sep + 1).trim();
  const v = values[qid];
  if (v === undefined) return false;
  if (Array.isArray(v)) return v.includes(expected);
  return String(v).toLowerCase() === expected.toLowerCase();
}

function isAnswered(v: AnswerValue | undefined): boolean {
  if (v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

const CANCER_OPTION: Partial<Record<CancerType, string>> = {
  breast: "Ung thư vú",
  cervical: "Ung thư cổ tử cung",
  colorectal: "Ung thư đại trực tràng",
  liver: "Ung thư gan",
  lung: "Ung thư phổi",
  prostate: "Ung thư tuyến tiền liệt",
  other: "Khác",
};

/** Điền sẵn câu trả lời từ những gì trợ lý đã hiểu (người dùng vẫn sửa được). */
export function valuesFromIntake(intake: IntakeProfile | null | undefined): QuickValues {
  if (!intake) return {};
  const v: QuickValues = {};
  if (intake.age !== null) v.age = intake.age;
  if (intake.gender) v.gender = intake.gender === "female" ? "Nữ" : intake.gender === "male" ? "Nam" : "Khác";
  if (intake.family_history.length) {
    v.family_history = intake.family_history.map((t) => CANCER_OPTION[t]).filter((x): x is string => Boolean(x));
  }
  if (intake.personal_cancer_history !== null) v.personal_cancer_history = intake.personal_cancer_history;
  if (intake.smoking !== null) v.smoking = intake.smoking;
  if (intake.pack_years !== null) v.pack_years = intake.pack_years;
  if (intake.hepatitis_b_or_c !== null) v.hbv_hcv = intake.hepatitis_b_or_c;
  if (intake.cirrhosis !== null) v.cirrhosis = intake.cirrhosis;
  if (intake.hpv_vaccinated !== null) v.hpv_vaccine = intake.hpv_vaccinated;
  return v;
}

const optionClass = (selected: boolean) =>
  `flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3.5 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-600 ${
    selected
      ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 font-medium text-teal-900"
      : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50"
  }`;

/** Bảng hỏi nhanh dạng wizard: một câu mỗi bước, có thanh tiến độ (SKILL.md 5.4). */
export function QuickCheckForm({
  questionnaire,
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  questionnaire: Questionnaire;
  initial?: QuickValues;
  submitting: boolean;
  onSubmit: (answers: Answer[]) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<QuickValues>(initial ?? {});
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const visible = useMemo(
    () => questionnaire.questions.filter((q) => isQuestionVisible(q, values)),
    [questionnaire.questions, values],
  );
  const index = Math.min(step, Math.max(visible.length - 1, 0));
  const current = visible[index];
  const isLast = index >= visible.length - 1;

  useEffect(() => {
    headingRef.current?.focus();
  }, [index]);

  if (!current) return null;

  const setValue = (qid: string, v: AnswerValue | undefined) => {
    setError("");
    setValues((prev) => ({ ...prev, [qid]: v }));
  };

  function submitAll() {
    const answers: Answer[] = visible
      .filter((q) => isAnswered(values[q.id]))
      .map((q) => ({ question_id: q.id, value: values[q.id] }));
    onSubmit(answers);
  }

  function next(e?: FormEvent) {
    e?.preventDefault();
    if (current.required && !isAnswered(values[current.id])) {
      setError("Vui lòng trả lời câu hỏi này để tiếp tục.");
      return;
    }
    if (current.type === "number" && isAnswered(values[current.id])) {
      const n = Number(values[current.id]);
      if (n < 0 || (current.id === "age" && (n < 1 || n > 120))) {
        setError("Giá trị chưa hợp lệ.");
        return;
      }
    }
    if (isLast) submitAll();
    else setStep(index + 1);
  }

  const v = values[current.id];
  const inputId = `qc-${current.id}`;
  const errorId = `${inputId}-error`;
  const progress = Math.round(((index + 1) / visible.length) * 100);

  return (
    <form onSubmit={next} className="space-y-5" aria-label="Bảng hỏi nhanh" noValidate>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ListChecks className="h-4 w-4 text-teal-700" aria-hidden="true" />
          Bảng hỏi nhanh
        </p>
        <button type="button" onClick={onCancel} className="btn-ghost min-h-0 px-2 py-1 text-xs" aria-label="Đóng bảng hỏi">
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Quay lại trò chuyện</span>
        </button>
      </div>

      <div>
        <div className="mb-1.5 flex justify-between text-xs text-slate-500">
          <span>
            Câu {index + 1}/{visible.length}
          </span>
          {!current.required && <span>Không bắt buộc</span>}
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Tiến độ bảng hỏi"
        >
          <div className="h-full rounded-full bg-teal-600 transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {current.type === "number" || current.type === "text" ? (
          <>
            <h3 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-slate-900 outline-none">
              <label htmlFor={inputId}>{current.text}</label>
            </h3>
            {current.type === "number" ? (
              <input
                id={inputId}
                type="number"
                inputMode="decimal"
                min={0}
                max={current.id === "age" ? 120 : undefined}
                className={`input max-w-xs ${error ? "input-error" : ""}`}
                value={typeof v === "number" ? v : ""}
                onChange={(e) => setValue(current.id, e.target.value === "" ? undefined : Number(e.target.value))}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
              />
            ) : (
              <textarea
                id={inputId}
                rows={3}
                maxLength={1000}
                className="input resize-y"
                value={typeof v === "string" ? v : ""}
                onChange={(e) => setValue(current.id, e.target.value)}
                placeholder="Mô tả ngắn gọn (không bắt buộc)"
              />
            )}
          </>
        ) : (
          <fieldset aria-describedby={error ? errorId : undefined}>
            <legend className="mb-3 w-full">
              <h3 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-slate-900 outline-none">
                {current.text}
              </h3>
              {current.type === "multi_choice" && <span className="text-sm text-slate-500">Có thể chọn nhiều</span>}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {current.type === "boolean" &&
                [
                  { label: "Có", value: true },
                  { label: "Không", value: false },
                ].map((opt) => {
                  const selected = v === opt.value;
                  return (
                    <label key={opt.label} className={optionClass(selected)}>
                      <input
                        type="radio"
                        name={inputId}
                        className="sr-only"
                        checked={selected}
                        onChange={() => setValue(current.id, opt.value)}
                      />
                      <span>{opt.label}</span>
                      {selected && <CheckCircle2 className="h-4 w-4 text-teal-700" aria-hidden="true" />}
                    </label>
                  );
                })}
              {current.type === "single_choice" &&
                (current.options ?? []).map((opt) => {
                  const selected = v === opt;
                  return (
                    <label key={opt} className={optionClass(selected)}>
                      <input
                        type="radio"
                        name={inputId}
                        className="sr-only"
                        checked={selected}
                        onChange={() => setValue(current.id, opt)}
                      />
                      <span>{opt}</span>
                      {selected && <CheckCircle2 className="h-4 w-4 text-teal-700" aria-hidden="true" />}
                    </label>
                  );
                })}
              {current.type === "multi_choice" &&
                (current.options ?? []).map((opt) => {
                  const list = Array.isArray(v) ? v : [];
                  const selected = list.includes(opt);
                  const exclusive = opt === "Không";
                  return (
                    <label key={opt} className={optionClass(selected)}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selected}
                        onChange={() => {
                          let nextList: string[];
                          if (selected) nextList = list.filter((x) => x !== opt);
                          else if (exclusive) nextList = [opt];
                          else nextList = [...list.filter((x) => x !== "Không"), opt];
                          setValue(current.id, nextList.length ? nextList : undefined);
                        }}
                      />
                      <span>{opt}</span>
                      {selected && <CheckCircle2 className="h-4 w-4 text-teal-700" aria-hidden="true" />}
                    </label>
                  );
                })}
            </div>
          </fieldset>
        )}
        {error && (
          <p id={errorId} className="text-sm font-medium text-amber-800">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => (index === 0 ? onCancel() : setStep(index - 1))}
          disabled={submitting}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {index === 0 ? "Huỷ" : "Quay lại"}
        </button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {!current.required && !isLast && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setValue(current.id, undefined);
                setStep(index + 1);
              }}
              disabled={submitting}
            >
              Bỏ qua
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Đang xử lý…
              </>
            ) : isLast ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Gửi câu trả lời
              </>
            ) : (
              <>
                Tiếp
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Câu trả lời chỉ dùng để gợi ý mốc tầm soát theo hướng dẫn; trợ lý không chẩn đoán.
      </p>
    </form>
  );
}
