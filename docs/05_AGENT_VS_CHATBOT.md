# OncoScreen AI khác chatbot thông thường ở điểm nào?

## Tóm tắt

OncoScreen AI là prototype hỗ trợ quy trình tầm soát ung thư. Hệ thống tiếp nhận hồ sơ và câu trả lời khảo sát, kiểm tra dấu hiệu cảnh báo, tìm tài liệu hướng dẫn phù hợp, tạo bản nháp có nguồn và chuyển bác sĩ xem xét. Đây không phải công cụ chẩn đoán và cũng không thay thế bác sĩ.

So với chatbot hỏi đáp thông thường, điểm khác biệt chính của OncoScreen AI nằm ở quy trình nhiều bước, dữ liệu có cấu trúc, kết nối với phần mềm quản lý phiên và cơ chế bác sĩ duyệt trước khi trả kế hoạch chính thức. Điều đó không có nghĩa hệ thống hiểu biết rộng hơn hoặc luôn trả lời đúng hơn ChatGPT.

## Khác nhau ở cách xử lý

| Khía cạnh | Chatbot hỏi đáp thông thường | OncoScreen AI trong prototype này |
|---|---|---|
| Mục tiêu | Trả lời hội thoại theo yêu cầu chung | Hỗ trợ quy trình tầm soát theo phiên: khảo sát, kiểm tra cảnh báo, tìm nguồn, lập bản nháp và chuyển bác sĩ |
| Dữ liệu đầu vào | Chủ yếu là nội dung người dùng gõ trong cuộc trò chuyện | Hồ sơ có cấu trúc như tuổi, giới, tiền sử gia đình, lối sống và câu trả lời khảo sát |
| Cách tạo khuyến nghị | Có thể sinh câu trả lời dựa trên kiến thức đã học của mô hình | Agent tìm guideline qua RAG; mỗi mục kế hoạch phải có nguồn, nếu thiếu nguồn phù hợp thì không tạo kế hoạch |
| Kiểm soát y tế | Phụ thuộc vào cách người dùng hỏi và chính sách của chatbot | Có kiểm tra red flag bằng luật, giới hạn không chẩn đoán, disclaimer và bước bác sĩ duyệt |
| Trạng thái và theo dõi | Thường tập trung vào cuộc trò chuyện | Lưu phiên, trạng thái duyệt, ghi chú bác sĩ và nhắc lịch trong ứng dụng |
| Kết quả cho bệnh nhân | Có thể xuất hiện ngay trong cuộc trò chuyện | Bản nháp chỉ dành cho bác sĩ; bệnh nhân chỉ xem kết quả chính thức sau khi được duyệt |

Đây là so sánh về thiết kế và phạm vi của prototype. Các chatbot khác nhau có khả năng, chính sách nguồn và tính năng khác nhau; không nên hiểu bảng này là đánh giá mọi phiên bản ChatGPT hay chatbot nói chung.

## Agent có Human-in-the-Loop (HITL) không?

Có. HITL là một phần cốt lõi của luồng xử lý:

1. Bệnh nhân đăng nhập, cập nhật hồ sơ và trả lời bộ câu hỏi.
2. Hệ thống kiểm tra red flag. Nếu phát hiện dấu hiệu cần lưu ý, phiên dừng luồng lập kế hoạch và hiển thị khuyến cáo đi khám.
3. Nếu không có red flag, AI Core đánh giá sơ bộ, truy xuất guideline và tạo bản nháp nếu tìm được căn cứ phù hợp.
4. Phiên chuyển sang `pending_review`. Bác sĩ xem hồ sơ, câu trả lời, bản nháp, nguồn và trace; bác sĩ có thể sửa, duyệt hoặc từ chối.
5. Backend chỉ cung cấp `final_plan` cho bệnh nhân khi trạng thái là `approved`. Nếu không đủ căn cứ, bác sĩ có thể duyệt trạng thái không có kế hoạch kèm ghi chú.

Như vậy, AI không tự đưa ra quyết định cuối cùng về kế hoạch tầm soát. HITL vẫn phụ thuộc vào việc bác sĩ thực sự xem xét nội dung và cần được kiểm thử trong quy trình sử dụng thực tế.

## Hệ thống giảm hallucination bằng cách nào?

Không có cơ chế nào trong prototype bảo đảm loại bỏ hoàn toàn hallucination. OncoScreen AI áp dụng nhiều lớp để giảm khả năng tạo thông tin không có căn cứ:

- **RAG trên guideline:** agent truy xuất các đoạn từ tài liệu hướng dẫn đã nạp vào kho dữ liệu trước khi tạo khuyến nghị.
- **Ràng buộc nguồn:** mỗi mục trong kế hoạch phải có nguồn. Guardrail từ chối kế hoạch không có nguồn hoặc chứa một số mẫu câu mang tính chẩn đoán.
- **Thiếu bằng chứng thì dừng:** nếu không tìm được nguồn phù hợp hoặc dịch vụ mô hình gặp lỗi, agent không tự bịa kế hoạch mà trả trạng thái thiếu căn cứ để bác sĩ xử lý.
- **Red flag chạy trước LLM:** bộ kiểm tra dựa trên luật kiểm tra câu trả lời trước bước gọi LLM; phát hiện dấu hiệu cảnh báo sẽ ngắt luồng lập kế hoạch.
- **Đầu ra có cấu trúc:** dữ liệu như đánh giá nguy cơ, nguồn và kế hoạch được kiểm tra theo schema thay vì chỉ trả một đoạn hội thoại tự do.
- **Bác sĩ xem trước:** kết quả AI là bản nháp; bệnh nhân không nhận bản nháp như kết luận chính thức.

Các lớp này giảm rủi ro nhưng không xác nhận rằng tài liệu nguồn luôn đầy đủ, hiện hành hoặc được truy xuất đúng. Mô hình vẫn có thể hiểu sai câu trả lời, phân loại sai nguy cơ hoặc diễn giải sai nguồn; bộ phát hiện red flag dựa trên luật cũng có thể bỏ sót. Bác sĩ cần kiểm tra nội dung và nguồn trước khi duyệt.

## Giới hạn hiện tại

- Kho guideline trong repo hiện có một tài liệu mẫu ngắn về tầm soát ung thư vú; dữ liệu này chưa bao phủ đầy đủ các loại ung thư, nhóm tuổi, mức nguy cơ hoặc hướng dẫn tại Việt Nam.
- Dự án là prototype chạy local để trình diễn và phát triển. Chưa có bằng chứng đánh giá lâm sàng, đánh giá hiệu quả trên quần thể bệnh nhân hoặc chứng nhận là thiết bị/phần mềm y tế.
- Hệ thống không chẩn đoán ung thư, không đọc kết quả xét nghiệm/hình ảnh và không thay thế tư vấn y tế.
- Chế độ mock dùng dữ liệu minh họa. Khi tích hợp LLM bên ngoài, chỉ nên dùng hồ sơ giả trong demo và phải xem xét chính sách bảo mật của nhà cung cấp.
- Nhắc lịch là tính năng mô phỏng trong ứng dụng; chưa tích hợp HIS/EMR, SMS hoặc email thực.

## Kết luận

Giá trị thiết kế của OncoScreen AI không nằm ở việc trò chuyện tự do hơn chatbot tổng quát. Hệ thống tập trung vào một quy trình chuyên biệt, có dữ liệu và trạng thái rõ ràng, truy xuất nguồn, phát hiện một số tình huống cần chuyển hướng và yêu cầu bác sĩ phê duyệt trước khi công bố kế hoạch. Các biện pháp này hỗ trợ khả năng kiểm soát và truy vết, nhưng không làm cho AI trở nên không thể sai; phạm vi tài liệu và đánh giá chuyên môn vẫn cần được mở rộng trước mọi ứng dụng thực tế.

## Tham khảo nội bộ

- [Tổng quan dự án](00_OVERVIEW.md)
- [Kiến trúc hệ thống](01_ARCHITECTURE.md)
- [Luồng nghiệp vụ](02_BUSINESS_FLOW.md)
- [Hướng dẫn tích hợp](guides/GUIDE_INTEGRATION.md)
- [Hợp đồng API và quy tắc HITL](protocols/API_CONTRACT.md)
