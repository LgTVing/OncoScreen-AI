/**
 * ★ CONTRACT — mirror của docs/protocols/API_CONTRACT.md và ai_core/ai_core/schemas.py.
 * KHÔNG tự thêm/sửa trường. Muốn đổi → PR `contract/*`.
 *
 * Hành trình: Navigator (ẩn danh) → tạo tài khoản & đặt lịch → bác sĩ khám với Clinical Copilot → theo dõi.
 */

// ---------- enums
export type Role = "patient" | "doctor";
export type Gender = "male" | "female" | "other";
export type CancerType = "breast" | "cervical" | "colorectal" | "liver" | "lung" | "prostate" | "other";
export type RiskLevel = "average" | "elevated" | "high";
export type QuestionType = "single_choice" | "multi_choice" | "number" | "boolean" | "text";
export type RedFlagSeverity = "urgent" | "soon";
export type NextAction = "continue_chat" | "suggest_booking" | "urgent_care";
export type BookingPriority = "routine" | "urgent";
export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled";
export type EncounterStatus = "in_progress" | "finalized";
export type ReminderStatus = "scheduled" | "due" | "done" | "skipped";
export type AgentName = "navigator" | "copilot" | "copilot_qa" | "patient_qa";
export type TraceEvent = Record<string, string | number | boolean>;

// ---------- auth
export interface UserOut {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}
export interface RegisterIn {
  email: string;
  password: string;
  full_name: string;
  role: "patient";
  /** Gắn phiên tư vấn ẩn danh vào tài khoản mới (hồ sơ được điền sẵn từ thông tin đã cung cấp). */
  consultation_id?: string;
  consultation_token?: string;
}
export interface LoginIn {
  email: string;
  password: string;
}
export interface TokenOut {
  access_token: string;
  token_type: "bearer";
  user: UserOut;
}

// ---------- patient profile
export interface Lifestyle {
  smoking?: boolean;
  pack_years?: number;
  hepatitis_b_or_c?: boolean;
  cirrhosis?: boolean;
  alcohol?: "none" | "light" | "heavy";
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  exercise?: "none" | "light" | "regular";
  [k: string]: unknown;
}
export interface PatientProfileIn {
  age: number;
  gender: Gender;
  genetics_history: string[]; // mã dạng "<cancer_type>_cancer_<người thân>", vd. "breast_cancer_mother"
  lifestyle: Lifestyle;
}
export interface PatientProfileOut extends PatientProfileIn {
  user_id: string;
  lifestyle_score: number | null;
  updated_at: string;
}

// ---------- questionnaire
export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: string[] | null;
  required: boolean;
  depends_on: string | null; // "question_id=value"
}
export interface Questionnaire {
  version: string;
  questions: Question[];
}
export interface Answer {
  question_id: string;
  value: unknown;
}

// ---------- AI shared
export interface Source {
  doc_id: string; // guideline doc_id hoặc "record:<event_id>" (Copilot)
  title: string;
  section: string | null;
  excerpt: string;
  url: string | null;
}
export interface RedFlag {
  code: string;
  symptom: string;
  severity: RedFlagSeverity;
  advice: string;
}
export interface RedFlagResult {
  detected: boolean;
  flags: RedFlag[];
  message: string | null;
}
export interface RiskFactor {
  cancer_type: CancerType;
  level: RiskLevel;
  reasons: string[];
}
export interface ScreeningSuggestion {
  rule_id: string;
  cancer_type: CancerType;
  method: string;
  start_age: number | null;
  interval_months: number | null; // null = guideline không quy định chu kỳ (quyết định cùng bác sĩ)
  applies_because: string;
  note: string | null;
  elevated_risk: boolean;
  sources: Source[];
}
export interface PlanItem {
  cancer_type: CancerType;
  method: string;
  start_age: number | null;
  interval_months: number;
  next_due: string | null; // YYYY-MM-DD; bác sĩ điền khi duyệt → sinh nhắc lịch
  rationale: string;
  sources: Source[];
  priority: number;
}
export interface ScreeningPlan {
  items: PlanItem[];
  general_advice: string;
  generated_at: string;
  model: string;
}
export interface EducationContent {
  cancer_type: CancerType;
  title: string;
  warning_signs: string[];
  prevention_tips: string[];
  body_md: string;
  sources: Source[];
}
export interface QuestionAnswer {
  answer: string;
  sources: Source[];
  disclaimer: string;
  trace_id: string;
  insufficient_evidence: boolean;
  trace_events: TraceEvent[];
}
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// ---------- Navigator (public)
export interface IntakeProfile {
  age: number | null;
  gender: Gender | null;
  family_history: CancerType[];
  personal_cancer_history: boolean | null;
  smoking: boolean | null;
  pack_years: number | null;
  hepatitis_b_or_c: boolean | null;
  cirrhosis: boolean | null;
  hpv_vaccinated: boolean | null;
  symptom_codes: string[];
}
export interface BookingHint {
  priority: BookingPriority;
  service_codes: string[];
  reason: string;
}
export interface NavigatorReply {
  reply: string;
  sources: Source[];
  intake: IntakeProfile;
  missing_info: string[]; // "age" | "gender" | "pack_years"
  suggestions: ScreeningSuggestion[];
  risk_factors: RiskFactor[];
  red_flag: RedFlagResult;
  next_action: NextAction;
  booking_hint: BookingHint | null;
  insufficient_evidence: boolean;
  disclaimer: string;
  trace_id: string;
  trace_events: TraceEvent[]; // luôn [] ở API công khai
}
export interface ConsultMessage {
  role: "user" | "assistant";
  content: string;
  at: string;
}
export interface ConsultationOut {
  id: string;
  linked: boolean; // đã gắn vào tài khoản bệnh nhân
  intake: IntakeProfile;
  messages: ConsultMessage[];
  last_reply: NavigatorReply | null;
  created_at: string;
  updated_at: string;
}
export interface ConsultationCreated {
  access_token: string; // gửi lại qua header X-Consult-Token; chỉ trả 1 lần
  consultation: ConsultationOut;
}
export interface NavigatorMessageIn {
  message?: string; // ≤ 2000 ký tự
  answers?: Answer[]; // bảng hỏi nhanh
}
export interface ServiceOut {
  code: string;
  name: string;
  description: string;
  cancer_types: CancerType[];
}

// ---------- appointments
export interface AppointmentIn {
  service_code: string;
  preferred_date: string; // YYYY-MM-DD, ≥ hôm nay
  reason?: string;
  consultation_id?: string;
}
export interface AppointmentOut {
  id: string;
  patient_id: string;
  patient_name: string;
  consultation_id: string | null;
  service_code: string;
  service_name: string;
  preferred_date: string;
  scheduled_date: string | null;
  reason: string | null;
  priority: BookingPriority;
  status: AppointmentStatus;
  encounter_id: string | null;
  created_at: string;
}
export interface ConfirmAppointmentIn {
  scheduled_date: string;
}

// ---------- reminders
export interface ReminderOut {
  id: string;
  encounter_id: string;
  patient_id: string;
  cancer_type: CancerType;
  method: string;
  due_date: string;
  status: ReminderStatus;
  completed_at: string | null;
  message: string | null;
}

// ---------- Clinical Copilot / encounters
export interface BriefFact {
  text: string;
  event_ids: string[];
}
export interface ClinicalBrief {
  summary: string;
  key_facts: BriefFact[];
  red_flags: RedFlag[];
  risk_factors: RiskFactor[];
  guideline_suggestions: ScreeningSuggestion[];
  questions_to_clarify: string[];
  data_gaps: string[];
  draft_plan: ScreeningPlan | null;
  disclaimer: string;
  generated_at: string;
  model: string;
  trace_id: string;
  trace_events: TraceEvent[];
}
export interface EncounterOut {
  id: string;
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  doctor: UserOut | null;
  status: EncounterStatus;
  brief: ClinicalBrief | null; // chỉ bác sĩ
  draft_plan: ScreeningPlan | null; // chỉ bác sĩ
  final_plan: ScreeningPlan | null; // bệnh nhân: chỉ khi finalized
  clinical_notes: string | null; // chỉ bác sĩ
  conclusion: string | null; // lời dặn/kết luận bác sĩ gửi bệnh nhân (khi finalized)
  finalized_at: string | null;
  created_at: string;
  reminders: ReminderOut[];
  disclaimer: string;
}
export interface FinalizeEncounterIn {
  conclusion: string; // bắt buộc
  clinical_notes?: string;
  final_plan?: ScreeningPlan | null; // bỏ trống = dùng draft_plan; null tường minh = không lập kế hoạch
  use_draft?: boolean; // mặc định true khi final_plan không gửi
}
export interface CopilotAskIn {
  question: string;
  history: ChatTurn[];
}

// ---------- hồ sơ xuyên suốt
export interface RecordEventOut {
  id: string;
  at: string;
  kind: string; // account.created | consult.summary | red_flag.detected | appointment.* | encounter.* | reminder.* | profile.updated
  summary: string;
  data: Record<string, unknown>;
}
export interface PatientRecordOut {
  user: UserOut;
  profile: PatientProfileOut | null;
  consultations: ConsultationOut[];
  appointments: AppointmentOut[];
  encounters: EncounterOut[];
  reminders: ReminderOut[];
  timeline: RecordEventOut[]; // mới nhất trước
}
export interface PatientListItem {
  user: UserOut;
  profile: PatientProfileOut | null;
  open_appointments: number;
  last_activity: string | null;
}

// ---------- observability
export interface AgentRunOut {
  id: string;
  agent: AgentName;
  trace_id: string;
  patient_id: string | null;
  latency_ms: number;
  generator: string | null; // llm | template | template_fallback | extractive
  red_flag: boolean;
  next_action: NextAction | null;
  insufficient_evidence: boolean;
  guard_blocked: boolean;
  events: TraceEvent[];
  created_at: string;
}
export interface MetricsOut {
  consultations: number;
  linked_consultations: number;
  red_flag_consultations: number;
  booking_suggested: number;
  appointments_by_status: Record<string, number>;
  encounters_finalized: number;
  plans_edited_by_doctor: number;
  agent_runs: number;
  agent_fallback_rate: number;
  agent_insufficient_rate: number;
  agent_latency_ms_p50: number;
  agent_latency_ms_p95: number;
}

// ---------- chung
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
export interface ApiError {
  detail: string;
}
