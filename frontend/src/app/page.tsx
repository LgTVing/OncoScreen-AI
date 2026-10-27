import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/Brand";
import { NavigatorChat } from "@/components/navigator/NavigatorChat";
import { CalendarPlus, ClipboardCheck, History, MessageSquare, ShieldCheck } from "@/components/icons";

const JOURNEY = [
  {
    icon: MessageSquare,
    title: "Tìm hiểu",
    text: "Trò chuyện ẩn danh với trợ lý để biết mình nên tầm soát gì, khi nào, theo hướng dẫn có trích nguồn.",
  },
  {
    icon: CalendarPlus,
    title: "Tạo tài khoản và đặt lịch",
    text: "Thông tin đã chia sẻ được gắn sẵn vào hồ sơ, bạn chỉ cần chọn dịch vụ và ngày mong muốn.",
  },
  {
    icon: ClipboardCheck,
    title: "Khám với bác sĩ",
    text: "Bác sĩ xem tóm tắt hồ sơ, khám và quyết định kế hoạch tầm soát phù hợp với riêng bạn.",
  },
  {
    icon: History,
    title: "Theo dõi",
    text: "Xem kết luận, kế hoạch đã duyệt và nhận nhắc lịch tầm soát định kỳ trên hồ sơ xuyên suốt.",
  },
];

/** Trang công khai: lối vào chính là Navigator (không cần đăng nhập). */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <section className="max-w-3xl space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Bạn nên tầm soát ung thư gì, và khi nào?
          </h1>
          <p className="max-w-prose text-base leading-relaxed text-slate-600">
            Hỏi trợ lý tầm soát của bệnh viện, không cần đăng nhập. Gợi ý dựa trên tuổi, giới và yếu tố nguy cơ, đối chiếu
            hướng dẫn chuyên môn có trích nguồn. Trợ lý không chẩn đoán; mọi kế hoạch cá nhân đều do bác sĩ quyết định.
          </p>
          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
            Cuộc trò chuyện ẩn danh chỉ được gắn vào hồ sơ khi bạn chủ động tạo tài khoản.
          </p>
        </section>

        <NavigatorChat mode="public" />

        <section aria-labelledby="journey-title" className="space-y-4">
          <h2 id="journey-title" className="text-lg font-semibold text-slate-900">
            Hành trình tầm soát tại bệnh viện
          </h2>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {JOURNEY.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-800">
                      {i + 1}
                    </span>
                    <Icon className="h-4 w-4 text-teal-700" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
                </li>
              );
            })}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
