import { NavigatorChat } from "@/components/navigator/NavigatorChat";

/** Navigator khi đã đăng nhập: phiên gắn tài khoản (Bearer), CTA dẫn thẳng tới đặt lịch. */
export default function PatientChatPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Trợ lý tầm soát</h1>
        <p className="page-subtitle">
          Hỏi về loại ung thư nên tầm soát, độ tuổi và tần suất. Trợ lý dùng thông tin trong hồ sơ của bạn để gợi ý theo
          hướng dẫn; bác sĩ là người quyết định kế hoạch cuối cùng.
        </p>
      </header>
      <NavigatorChat mode="patient" />
    </div>
  );
}
