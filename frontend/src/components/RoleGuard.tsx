"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { Role } from "@/types/api";
import { clearSession, getUser, homeFor } from "@/lib/auth";
import {
  LayoutDashboard,
  UserCircle,
  BookOpen,
  MessageSquare,
  Bell,
  ClipboardList,
  LogOut,
  HeartPulse,
} from "@/components/icons";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PATIENT_NAV: NavItem[] = [
  { href: "/patient", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/patient/profile", label: "Hồ sơ", icon: UserCircle },
  { href: "/patient/education", label: "Tài liệu", icon: BookOpen },
  { href: "/patient/chat", label: "Chat AI", icon: MessageSquare },
  { href: "/patient/reminders", label: "Nhắc lịch", icon: Bell },
];

const DOCTOR_NAV: NavItem[] = [
  { href: "/doctor", label: "Hàng chờ duyệt", icon: ClipboardList },
];

/**
 * Bọc layout theo role:
 * - Chưa đăng nhập → /login
 * - Sai role → về trang của role đó
 */
export function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
    } else if (u.role !== role) {
      router.replace(homeFor(u.role));
    } else {
      setUserName(u.full_name);
      setOk(true);
    }
  }, [role, router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <span className="spinner h-7 w-7 text-teal-700" aria-label="Đang tải…" />
          <p className="text-xs font-medium text-slate-500">Đang tải OncoScreen AI…</p>
        </div>
      </div>
    );
  }

  const isDoctor = role === "doctor";
  const navItems = isDoctor ? DOCTOR_NAV : PATIENT_NAV;
  const roleBadge = isDoctor ? "Bác sĩ" : "Bệnh nhân";

  const brandBg = isDoctor ? "bg-indigo-600" : "bg-teal-700";
  const brandText = isDoctor ? "text-indigo-600" : "text-teal-700";
  const activeNavClass = isDoctor
    ? "bg-indigo-50 text-indigo-700 font-semibold"
    : "bg-teal-50 text-teal-800 font-semibold";
  const roleBadgeClass = isDoctor
    ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
    : "bg-teal-100 text-teal-800 border border-teal-200";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* ===== Top Navbar ===== */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link
            href={homeFor(role)}
            className="flex items-center gap-2.5 font-bold text-slate-900 transition-colors"
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${brandBg} text-white shadow-sm`}>
              <HeartPulse className="h-5 w-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-bold leading-tight tracking-tight text-slate-900">
                OncoScreen <span className={brandText}>AI</span>
              </span>
              <span className="text-[10px] font-medium text-slate-500">
                {isDoctor ? "Cổng Bác sĩ" : "Hỗ trợ Tầm soát"}
              </span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1 pl-4" aria-label="Điều hướng chính">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? activeNavClass
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <IconComponent className={`h-4 w-4 ${isActive ? brandText : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info + logout */}
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end text-right sm:flex">
              <span className="text-sm font-semibold text-slate-900 leading-tight">{userName}</span>
              <span className={`badge text-[10px] mt-0.5 ${roleBadgeClass}`}>{roleBadge}</span>
            </div>
            <button
              id="btn-logout"
              type="button"
              onClick={handleLogout}
              className="btn-ghost flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-red-600"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== Page content ===== */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            OncoScreen AI: Hệ thống hỗ trợ đánh giá nguy cơ và lập kế hoạch tầm soát ung thư.
          </span>
          <span className="text-slate-500 flex items-center gap-1.5">
            <span>Không chẩn đoán trực tiếp</span>
            <span className="inline-block h-2 w-px bg-slate-300" aria-hidden="true" />
            <span>Kế hoạch cần bác sĩ xác nhận</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
