import type { TraceEvent } from "@/types/api";

/** Hiển thị trace_events (tên node, thời lượng, thuộc tính) — chỉ bác sĩ thấy. */
export function TraceEvents({ events }: { events: TraceEvent[] }) {
  if (!events.length) return <p className="text-xs text-slate-500">Không có sự kiện trace.</p>;
  return (
    <ol className="space-y-1.5">
      {events.map((event, i) => {
        const { node, ms, ...rest } = event;
        return (
          <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
            <span className="font-semibold text-slate-900">{node !== undefined ? String(node) : `bước ${i + 1}`}</span>
            {ms !== undefined && <span className="text-slate-500">{String(ms)} ms</span>}
            {Object.entries(rest).map(([k, v]) => (
              <span key={k} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                {k}: <strong className="font-medium">{String(v)}</strong>
              </span>
            ))}
          </li>
        );
      })}
    </ol>
  );
}
