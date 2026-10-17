"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Role } from "@/types/api";
import { homeFor, saveSession } from "@/lib/auth";
import { HeartPulse, User, Activity, AlertTriangle, CheckCircle2 } from "@/components/icons";

type Tab = "login" | "register";

const DEMO_ACCOUNTS = [
  { label: "Bệnh nhân demo (Lan)", email: "lan@demo.vn", password: "123456", role: "patient" as Role },
  { label: "Bác sĩ demo", email: "doctor@demo.vn", password: "123456", role: "doctor" as Role },
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");

  // --- Login state ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // --- Register state ---
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await api.login({ email: loginEmail, password: loginPassword });
      saveSession(res.access_token, res.user);
      router.replace(homeFor(res.user.role));
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setRegError(null);
    setRegLoading(true);
    try {
      await api.register({
        email: regEmail,
        password: regPassword,
        full_name: regFullName,
        role: "patient",
      });
      setRegSuccess(true);
      setTimeout(() => {
        setTab("login");
        setLoginEmail(regEmail);
        setLoginPassword(regPassword);
        setRegSuccess(false);
        setRegFullName("");
        setRegEmail("");
        setRegPassword("");
      }, 1200);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setRegLoading(false);
    }
  }

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[0]) {
    setLoginEmail(account.email);
    setLoginPassword(account.password);
    setLoginError(null);
    setTab("login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-md shadow-teal-700/20">
            <HeartPulse className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            OncoScreen <span className="text-teal-700">AI</span>
          </h1>
          <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
            Hệ thống hỗ trợ tầm soát ung thư thông minh có bác sĩ phê duyệt
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setLoginError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                tab === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setRegError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                tab === "register"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tạo tài khoản
            </button>
          </div>

          {/* Form Content */}
          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label" htmlFor="login-email">
                  Địa chỉ Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="name@example.vn"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="login-password">
                  Mật khẩu
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="input"
                />
              </div>

              {loginError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="btn-primary w-full py-2.5 text-sm font-semibold"
              >
                {loginLoading ? (
                  <>
                    <span className="spinner h-4 w-4" />
                    <span>Đang xác thực…</span>
                  </>
                ) : (
                  "Đăng nhập hệ thống"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label" htmlFor="reg-name">
                  Họ và tên
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="reg-email">
                  Địa chỉ Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  placeholder="name@example.vn"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="reg-password">
                  Mật khẩu
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Tối thiểu 6 ký tự"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="input"
                />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Tài khoản đăng ký mới dành cho Bệnh nhân. Bác sĩ và chuyên viên y tế được cấp tài khoản qua Quản trị viên.
              </p>

              {regSuccess && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Đăng ký thành công! Đang chuyển sang màn đăng nhập…</span>
                </div>
              )}

              {regError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={regLoading || regSuccess}
                className="btn-primary w-full py-2.5 text-sm font-semibold"
              >
                {regLoading ? (
                  <>
                    <span className="spinner h-4 w-4" />
                    <span>Đang tạo tài khoản…</span>
                  </>
                ) : (
                  "Tạo tài khoản bệnh nhân"
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Access */}
          <div className="mt-8 border-t border-slate-100 pt-5">
            <p className="text-xs font-medium text-slate-500 text-center mb-3">
              Tài khoản dùng thử nhanh
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-left text-xs font-medium text-slate-700 hover:border-teal-500 hover:bg-teal-50/50 transition-colors"
                >
                  {acc.role === "doctor" ? (
                    <Activity className="h-4 w-4 text-indigo-600 shrink-0" />
                  ) : (
                    <User className="h-4 w-4 text-teal-600 shrink-0" />
                  )}
                  <span className="truncate">{acc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
