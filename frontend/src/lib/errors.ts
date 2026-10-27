/** Lỗi HTTP chuẩn hoá từ `{ detail }` của backend (hoặc từ mock). */
export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const STATUS_FALLBACK: Record<number, string> = {
  0: "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.",
  400: "Dữ liệu gửi lên chưa hợp lệ.",
  401: "Phiên đăng nhập hoặc mã truy cập không còn hiệu lực.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu.",
  409: "Trạng thái hiện tại không cho phép thao tác này.",
  429: "Bạn đã gửi quá nhiều tin nhắn trong phiên này. Hãy bắt đầu cuộc trò chuyện mới.",
  502: "Trợ lý AI tạm thời không phản hồi. Vui lòng thử lại sau ít phút.",
};

/** Thông điệp tiếng Việt hiển thị cho người dùng. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    return err.message || STATUS_FALLBACK[err.status] || fallback;
  }
  return fallback;
}

export function isStatus(err: unknown, status: number): boolean {
  return err instanceof ApiRequestError && err.status === status;
}

export function statusFallback(status: number): string | undefined {
  return STATUS_FALLBACK[status];
}
