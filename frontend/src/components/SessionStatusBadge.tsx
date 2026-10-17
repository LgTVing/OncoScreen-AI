import type { SessionStatus } from "@/types/api";

interface StatusConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
}

const CONFIG: Record<SessionStatus, StatusConfig> = {
  collecting: {
    label: "Đang khảo sát",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
    dotClass: "bg-slate-400",
  },
  red_flag: {
    label: "Cần khám sớm",
    badgeClass: "bg-red-50 text-red-700 border border-red-200",
    dotClass: "bg-red-500",
  },
  pending_review: {
    label: "Chờ bác sĩ duyệt",
    badgeClass: "bg-amber-50 text-amber-800 border border-amber-200",
    dotClass: "bg-amber-500",
  },
  approved: {
    label: "Đã duyệt",
    badgeClass: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  rejected: {
    label: "Bác sĩ từ chối",
    badgeClass: "bg-slate-100 text-slate-600 border border-slate-200",
    dotClass: "bg-slate-400",
  },
  completed: {
    label: "Hoàn thành",
    badgeClass: "bg-teal-50 text-teal-800 border border-teal-200",
    dotClass: "bg-teal-500",
  },
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const item = CONFIG[status] ?? {
    label: status,
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
    dotClass: "bg-slate-400",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${item.badgeClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${item.dotClass}`} aria-hidden="true" />
      <span>{item.label}</span>
    </span>
  );
}
