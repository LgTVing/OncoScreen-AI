# Raw data — tài liệu nguồn

Thư mục này dành cho tài liệu gốc dùng để kiểm tra và biên tập guideline, ví dụ PDF/HTML tải từ cơ quan phát hành. Các file ở đây **không được ingest trực tiếp**; RAG hiện chỉ đọc Markdown trong `../guidelines/`.

## Cấu trúc lưu

Mỗi nguồn/phiên bản nằm trong một thư mục riêng:

```text
raw_data/
└── <cancer_type>/
    └── <publisher>/
        └── <year>/
            ├── <publisher>_<topic>_<year>.<pdf|html|...>
            └── source.yaml
```

Ví dụ: `breast/uspstf/2024/uspstf_breast_screening_2024.pdf`. Dùng chữ thường, không dấu; giữ nguyên file gốc và không ghi đè phiên bản cũ khi nguồn cập nhật.

## Ghi xuất xứ

Tạo `source.yaml` cạnh từng tài liệu bằng cách sao chép [source.yaml.example](source.yaml.example). Ghi URL chính thức, ngày xuất bản/cập nhật, ngày tải, phạm vi áp dụng, giấy phép và điều kiện tái sử dụng. Có thể ghi SHA-256 để nhận biết chính xác bản đã rà soát (`sha256sum <file>`).

Chỉ đưa bản sao tài liệu vào Git khi giấy phép cho phép phân phối lại. Nếu quyền chưa rõ hoặc tài liệu chỉ được cấp quyền truy cập nội bộ, không commit bản toàn văn; giữ nguồn ở nơi lưu trữ được phép và chỉ ghi metadata cần thiết. Không vượt paywall, đăng nhập, CAPTCHA hoặc giới hạn truy cập để lấy tài liệu. Không lưu bệnh án, dữ liệu bệnh nhân hoặc thông tin cá nhân ở đây.

Sau khi rà soát, biên tập bản tóm tắt có cấu trúc và trích dẫn sang `../guidelines/<cancer_type>_<source>_<year>.md`. Không chép nguyên văn dài nếu giấy phép không cho phép; luôn giữ lại thông tin đủ để truy về nguồn gốc.
