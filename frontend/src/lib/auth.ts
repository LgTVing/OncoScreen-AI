/** Lưu token + user ở localStorage (đủ cho demo local). Mọi truy cập localStorage đều bọc try/catch. */
import type { UserOut } from "@/types/api";

const TOKEN_KEY = "cs_token";
const USER_KEY = "cs_user";

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  try {
    return storage()?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function getUser(): UserOut | null {
  try {
    const raw = storage()?.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserOut) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: UserOut): void {
  try {
    storage()?.setItem(TOKEN_KEY, token);
    storage()?.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage bị chặn: phiên chỉ tồn tại trong bộ nhớ trình duyệt hiện tại */
  }
}

export function clearSession(): void {
  try {
    storage()?.removeItem(TOKEN_KEY);
    storage()?.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

export function homeFor(role: UserOut["role"]): string {
  return role === "doctor" ? "/doctor" : "/patient";
}

/** Chỉ cho phép đường dẫn nội bộ khi redirect sau đăng nhập (tránh open redirect). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
