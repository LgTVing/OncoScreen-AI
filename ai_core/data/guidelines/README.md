# Hướng dẫn tìm, thu thập và chuẩn hóa guideline

> Thư mục này chứa bản Markdown đã được biên tập để ingest vào RAG. Đây là dữ liệu nghiên cứu/demo, không phải nguồn để tự động đưa ra quyết định lâm sàng.

## Cấu trúc thư mục `ai_core/data/`

```text
ai_core/data/
├── raw_data/                       # Tài liệu nguồn đã tải/thu thập; không ingest trực tiếp
│   ├── README.md                   # Quy ước lưu nguồn và metadata
│   └── source.yaml.example         # Mẫu ghi xuất xứ, phiên bản, giấy phép
├── guidelines/                     # Bản Markdown đã biên tập; đầu vào hiện tại của RAG
│   ├── README.md                   # Hướng dẫn thu thập và chuẩn hóa (tài liệu này)
│   └── breast_uspstf_2024.md       # Ví dụ guideline đã chuẩn hóa
├── questionnaire.json              # Câu hỏi đánh giá nguy cơ
├── red_flags.json                  # Quy tắc cảnh báo dấu hiệu nguy hiểm
└── vector_store/                   # Chroma sinh khi ingest; không commit
```

Luồng dữ liệu là `raw_data/` → người phụ trách kiểm tra nguồn, giấy phép và nội dung → biên tập thành `guidelines/*.md` → chạy ingest để tạo `vector_store/`. Raw data giữ tài liệu gốc để đối chiếu; RAG hiện chỉ đọc Markdown trong `guidelines/`, không đọc PDF/HTML ở `raw_data/`. Không lưu bệnh án hay dữ liệu cá nhân trong hai thư mục này.

## 1. Dữ liệu nào được đưa vào?

Chỉ thu thập **khuyến nghị sàng lọc/tầm soát cho người chưa có triệu chứng**, bao gồm đối tượng, độ tuổi, phương pháp, chu kỳ, mức khuyến nghị và ngoại lệ. Tách rõ nội dung về chẩn đoán, điều trị, tiên lượng và sàng lọc triệu chứng; không biến những nội dung đó thành lịch tầm soát.

Không thu thập hồ sơ bệnh nhân, dữ liệu định danh, bệnh án, thông tin từ tài khoản cần đăng nhập hoặc dữ liệu cá nhân. Không dùng bài quảng cáo gói khám, bài SEO, diễn đàn hay nội dung mạng xã hội làm căn cứ khuyến nghị.

## 2. Tìm nguồn ở đâu?

Ưu tiên nguồn theo thứ tự:

1. **Việt Nam:** hướng dẫn/quyết định của Bộ Y tế và tài liệu chuyên môn của cơ quan y tế công lập. Ví dụ, Bộ Y tế đã đăng hướng dẫn sàng lọc phát hiện sớm ung thư vú kèm Quyết định 3898/QĐ-BYT năm 2025: [trang hướng dẫn chính thức](https://mch.moh.gov.vn/cong-tac-cham-soc-suc-khoe-sinh-san/huong-dan-sang-loc-phat-hien-som-ung-thu-vu.html).
2. **Tổ chức y tế quốc tế:** WHO, IARC và cơ quan y tế quốc gia có guideline công khai. Ghi rõ quốc gia/vùng áp dụng; khuyến nghị của nước khác không tự động áp dụng cho Việt Nam.
3. **Hiệp hội chuyên môn:** USPSTF, ACS và các hội chuyên ngành. Chỉ dùng tài liệu có ngày/phiên bản và nhóm áp dụng rõ ràng; giữ riêng từng guideline nếu khuyến nghị khác nhau.
4. **Nghiên cứu gốc/tổng quan:** dùng để hiểu bằng chứng hoặc đối chiếu, không thay cho guideline hiện hành khi đã có guideline phù hợp.

Điểm bắt đầu chính thức:

- [Bộ Y tế Việt Nam — hướng dẫn sàng lọc ung thư vú 2025](https://mch.moh.gov.vn/cong-tac-cham-soc-suc-khoe-sinh-san/huong-dan-sang-loc-phat-hien-som-ung-thu-vu.html)
- [USPSTF — khuyến nghị sàng lọc ung thư vú 2024](https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening)
- [WHO — hướng dẫn sàng lọc và điều trị tổn thương tiền ung thư cổ tử cung, bản 2 (2021)](https://www.who.int/publications/i/item/9789240030824)
- [WHO — hướng dẫn ngắn về chương trình sàng lọc ung thư (2022)](https://www.who.int/publications/i/item/9789289057561)

Đây là nguồn tham khảo để bắt đầu tìm kiếm, không phải danh sách đầy đủ hoặc xác nhận rằng các tài liệu vẫn là bản mới nhất. Trước khi thêm, mở trang của tổ chức phát hành và tìm phiên bản/errata/thông báo thay thế mới hơn.

## 3. Tiêu chí duyệt từng tài liệu

Trước khi viết file `.md`, ghi lại và xác minh:

- Cơ quan ban hành, tên guideline, số quyết định hoặc phiên bản, năm ban hành và ngày cập nhật gần nhất.
- Quốc gia/vùng áp dụng và đối tượng cụ thể: độ tuổi, giới/tình trạng cơ quan liên quan, nguy cơ trung bình hay nguy cơ cao, có triệu chứng hay không.
- Loại khuyến nghị: tầm soát, theo dõi sau bất thường, chẩn đoán hay điều trị. Chỉ lấy phần tầm soát cho dataset này.
- Phương pháp, chu kỳ, tuổi bắt đầu/kết thúc, mức khuyến nghị/chất lượng bằng chứng, ngoại lệ và nhóm không áp dụng.
- URL chính thức, ngày truy cập, tình trạng hiệu lực và điều khoản bản quyền/tái sử dụng.
- Mọi con số trong bản tóm tắt đã được đối chiếu với tài liệu gốc. Nếu có thể, người thứ hai rà lại trước khi ingest.

Không gộp các khuyến nghị xung đột vào cùng một câu trả lời tổng quát. Lưu thành các file theo từng nguồn và nêu khác biệt về quốc gia, năm, nhóm nguy cơ hoặc phương pháp để bác sĩ có thể rà soát.

## 4. Quy tắc tải xuống và crawl

Ưu tiên tải PDF/HTML trực tiếp từ trang xuất bản chính thức, API hoặc kho dữ liệu được cung cấp. Với số lượng nhỏ, tải thủ công và kiểm tra nội dung thường đáng tin cậy hơn crawler.

Nếu cần crawler:

1. Chỉ dùng danh sách URL/domain cho phép đã được người phụ trách chọn; không crawl toàn bộ site hay tìm theo liên kết vô hạn.
2. Đọc điều khoản sử dụng, giấy phép và `robots.txt` trước khi tải. Tôn trọng giới hạn truy cập; `robots.txt` là quy tắc crawler cần tuân theo, không phải giấy phép bản quyền hay quyền truy cập.
3. Gửi User-Agent mô tả crawler và thông tin liên hệ; mặc định giới hạn tối đa 1 request/giây/domain, cache nội dung và tránh tải lại file không đổi. Đây là mức thận trọng nội bộ, cần giảm thêm nếu chủ site yêu cầu.
4. Dừng khi gặp 403, 429, CAPTCHA, trang đăng nhập hoặc yêu cầu quyền truy cập. Không vòng qua xác thực, paywall, giới hạn tốc độ hay cơ chế chống bot.
5. Lưu URL nguồn và thời điểm truy cập. Kiểm tra thủ công văn bản trích xuất từ PDF/HTML vì bảng, ký hiệu, footnote và phạm vi khuyến nghị dễ bị mất khi parse.
6. Không commit bản sao toàn văn nếu giấy phép không cho phép. Trong repo ưu tiên bản tóm tắt có dẫn nguồn; chỉ giữ đoạn trích ngắn thật sự cần thiết và theo đúng điều khoản nguồn.

Quyền tái sử dụng tùy từng tài liệu. Ví dụ, [USPSTF có thông báo bản quyền riêng](https://www.uspreventiveservicestaskforce.org/uspstf/index.php/recommendation-topics/copyright-notice); WHO cũng yêu cầu xem quyền ở trang/copyright của từng ấn phẩm. Không mặc định tài liệu xem/tải miễn phí đồng nghĩa với được phép sao chép hoặc phân phối lại.

## 5. Tạo file guideline cho ingest

Tên file theo mẫu `<cancer_type>_<source>_<year>.md`, chữ thường, không dấu, ví dụ `breast_uspstf_2024.md`. Mỗi file là một guideline/phiên bản/nguồn. Dùng frontmatter YAML với **giá trị scalar** (chuỗi, số, boolean); không dùng list/object trong metadata vì Chroma cần metadata đơn giản.

```markdown
---
cancer_type: breast
source: "USPSTF 2024 — Breast Cancer Screening"
url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening"
gender: female
min_age: 40
max_age: 74
risk_level: average
language: en
jurisdiction: US
publication_date: "2024-04-30"
reviewed_on: "YYYY-MM-DD"
document_type: guideline
license: "Xem trang bản quyền của nguồn"
---

## Khuyến nghị
Tóm tắt ngắn bằng tiếng Việt; ghi mức khuyến nghị nếu nguồn có.

## Đối tượng
Nêu rõ tuổi, giới, tình trạng triệu chứng và mức nguy cơ áp dụng.

## Phương pháp và khoảng cách
Ghi phương pháp, chu kỳ và giới hạn áp dụng chính xác.

## Ngoại lệ và lưu ý
Ghi nhóm guideline không áp dụng, bằng chứng chưa đủ, hoặc cần quyết định riêng của bác sĩ.

## Nguồn và lịch sử
Tên tài liệu, cơ quan phát hành, phiên bản/ngày, URL và ngày nhóm truy cập/kiểm tra.
```

Các giá trị `cancer_type`: `breast`, `cervical`, `colorectal`, `liver`, `lung`, `prostate`, `other`. `gender`: `female`, `male`, `any`. `risk_level`: `average`, `elevated`, `high`, `any`. `min_age`/`max_age` là số nguyên; chỉ đặt khoảng tuổi khi nguồn nêu rõ. `jurisdiction`, `publication_date`, `reviewed_on`, `document_type` và `license` là metadata bổ sung để truy vết.

Phần nội dung dùng heading cấp hai `## ` vì ingest hiện chia **mỗi heading cấp hai thành một chunk**. Giữ mỗi mục ngắn, đủ ngữ cảnh, khoảng 300–500 token; mã hiện tại **chưa tự chia nhỏ chunk quá dài**. Không để bảng lớn, footnote hoặc điều kiện áp dụng tách khỏi khuyến nghị mà chúng giải thích.

## 6. Crawl không đồng nghĩa với ingest

Repo hiện **không có crawler web**. `ai_core/scripts/ingest.py` chỉ đọc các file `*.md` trong `ai_core/data/guidelines/`, đọc YAML frontmatter, chia chunk theo `## ` và ghi vào Chroma. Quy trình của nhóm là:

1. Tìm và duyệt nguồn chính thức.
2. Tải/đọc tài liệu theo điều khoản nguồn; tóm tắt và kiểm tra thành file Markdown như mẫu.
3. Cài môi trường trong thư mục `ai_core/`. Nếu dùng embedding local, cài extra `local-embed`:

   ```bash
   python -m pip install -e ".[dev,local-embed]"
   ```

4. Chạy ingest từ thư mục `ai_core/`:

   ```bash
   python scripts/ingest.py
   ```

5. Chỉ khi cần tạo lại toàn bộ collection mới chạy:

   ```bash
   python scripts/ingest.py --reset
   ```

`--reset` xóa collection `guidelines` trước khi nạp lại; hãy dùng khi đã xác nhận các file nguồn đúng. Với `EMBEDDING_PROVIDER=local`, cần cài model/dependency embedding; với `openai`, cần cấu hình API key và provider tương ứng.

## 7. Checklist trước khi commit

- [ ] Nguồn là guideline/tài liệu chuyên môn chính thức, có URL truy cập được.
- [ ] Đã kiểm tra phiên bản mới nhất, hiệu lực, errata và phạm vi áp dụng.
- [ ] Tóm tắt không trộn nhiều tổ chức/quốc gia/nhóm nguy cơ; mọi số liệu khớp nguồn.
- [ ] Metadata YAML parse được, dùng đúng enum và chỉ có scalar.
- [ ] Mỗi khuyến nghị có phương pháp, độ tuổi, chu kỳ và ngoại lệ nếu nguồn nêu.
- [ ] Có ngày truy cập/kiểm tra và ghi chú giấy phép; không commit nội dung không được phép phân phối.
- [ ] Người khác đã rà lại nội dung y khoa trước khi dùng cho agent thật.

**Giới hạn hiện tại:** retriever trong `ai_core/ai_core/rag/retriever.py` mới lọc `gender`; metadata tuổi/nguy cơ/loại ung thư chưa được áp dụng thành bộ lọc đầy đủ. Việc ingest thành công không đồng nghĩa tài liệu sẽ được chọn đúng cho hồ sơ cụ thể. Không dùng kết quả RAG hiện tại làm khuyến nghị y tế tự động; mọi plan vẫn phải được bác sĩ xem xét.
