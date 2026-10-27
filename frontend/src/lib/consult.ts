/**
 * Ghi nhớ phiên tư vấn Navigator hiện tại `{ id, access_token }` ở localStorage.
 * - Ẩn danh: khoá chung `cs_consult` (token gửi lại qua header X-Consult-Token; backend chỉ trả token 1 lần).
 * - Đã đăng nhập (patient): khoá theo user để /patient/chat khôi phục đúng cuộc trò chuyện của tài khoản.
 */
export interface StoredConsult {
  id: string;
  access_token: string;
}

const ANON_KEY = "cs_consult";
const keyFor = (userId?: string | null) => (userId ? `cs_consult_u_${userId}` : ANON_KEY);

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getStoredConsult(userId?: string | null): StoredConsult | null {
  try {
    const raw = storage()?.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsult>;
    return typeof parsed.id === "string" && typeof parsed.access_token === "string"
      ? { id: parsed.id, access_token: parsed.access_token }
      : null;
  } catch {
    return null;
  }
}

export function saveConsult(consult: StoredConsult, userId?: string | null): void {
  try {
    storage()?.setItem(keyFor(userId), JSON.stringify(consult));
  } catch {
    /* storage bị chặn: phiên tư vấn chỉ sống trong tab hiện tại */
  }
}

export function clearConsult(userId?: string | null): void {
  try {
    storage()?.removeItem(keyFor(userId));
  } catch {
    /* ignore */
  }
}

/** Token của phiên ẩn danh nếu đúng id đang lưu (dùng khi đăng ký / đăng nhập để gắn phiên). */
export function anonymousConsultToken(id: string): string | null {
  const stored = getStoredConsult(null);
  return stored && stored.id === id ? stored.access_token : null;
}
