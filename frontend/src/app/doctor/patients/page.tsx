"use client";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { GENDER_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import type { PatientListItem } from "@/types/api";
import { EmptyState, InlineError, MetaDivider, SkeletonList } from "@/components/ui";
import { ChevronRight, Search, Users } from "@/components/icons";

/** Danh sách bệnh nhân (GET /doctor/patients?q=). */
export default function DoctorPatientsPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [items, setItems] = useState<PatientListItem[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    setItems(null);
    api
      .listPatients(submitted || undefined)
      .then(setItems)
      .catch((err) => setError(errorMessage(err, "Chưa tải được danh sách bệnh nhân.")));
  }, [submitted]);
  useEffect(load, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setSubmitted(query.trim());
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Bệnh nhân</h1>
        <p className="page-subtitle">Tra cứu hồ sơ xuyên suốt của bệnh nhân đã có tài khoản.</p>
      </header>

      <form onSubmit={onSearch} className="flex max-w-xl gap-2" role="search">
        <label htmlFor="patient-search" className="sr-only">
          Tìm theo tên hoặc email
        </label>
        <input
          id="patient-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc email"
          className="input flex-1 focus:border-indigo-600 focus:ring-indigo-600/20"
        />
        <button type="submit" className="btn-doctor shrink-0">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Tìm</span>
        </button>
      </form>

      {error && <InlineError message={error} onRetry={load} />}
      {!items && !error && <SkeletonList rows={4} />}
      {items && items.length === 0 && (
        <div className="card-padded">
          <EmptyState
            icon={Users}
            title="Không tìm thấy bệnh nhân"
            action={
              submitted ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setQuery("");
                    setSubmitted("");
                  }}
                >
                  Xoá bộ lọc
                </button>
              ) : (
                <Link href="/doctor" className="btn-secondary">
                  Về hàng chờ
                </Link>
              )
            }
          />
        </div>
      )}
      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.user.id}>
              <Link
                href={`/doctor/patients/${p.user.id}`}
                className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-shadow hover:border-slate-300 hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 group-hover:text-indigo-700">{p.user.full_name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-600">
                    <span className="break-all">{p.user.email}</span>
                    {p.profile && (
                      <>
                        <MetaDivider />
                        <span>
                          {GENDER_LABEL[p.profile.gender]}, {p.profile.age} tuổi
                        </span>
                      </>
                    )}
                    <MetaDivider />
                    <span>{p.open_appointments} lịch đang mở</span>
                  </p>
                  {p.last_activity && <p className="mt-0.5 text-xs text-slate-500">Hoạt động gần nhất {formatDateTime(p.last_activity)}</p>}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
