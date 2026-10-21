# 07 · AEO / GEO / Entity Audit

Ngày: 2026-10-20. Mục tiêu: trang dễ được máy trả lời trích dẫn đúng, thực thể rõ ràng, không bịa thực thể kinh doanh. Nguồn: HTML đã sinh, `scripts/articles.mjs`, `scripts/build.mjs`, `scripts/seo/audit-ai-search.mjs`, `fact-guard`.

## 1. Thực thể của site

| Thực thể | Cách khai báo | Ghi chú |
|---|---|---|
| Site: "Vietnam Two-Wheel Guide" | `WebSite` trên `/`; `isPartOf` WebSite trên mọi Article; `og:site_name` | không đổi tên thương hiệu đã dùng từ trước |
| Nhà xuất bản | `Organization` {name, url `/about/`, logo `/assets/favicon.svg`} làm `author` và `publisher` của mọi Article | không có NAP, điện thoại, địa chỉ, giờ mở cửa, giá |
| Địa điểm | `about` Hanoi với Wikidata Q1858 trên 10 Pillar | thực thể công khai, kiểm chứng được |
| Doanh nghiệp cho thuê | không khai báo | `publication.business_schema_approved` là false; `fact-guard` chặn mọi LocalBusiness, AutoRental, Offer, Review, NAP |

## 2. Dữ liệu có cấu trúc theo loại trang (sau khi sửa)

| Loại trang | Số trang | JSON-LD | Thay đổi trong PR |
|---|---|---|---|
| Gốc `/` | 1 | WebSite | không |
| Pillar `/xx/` | 10 | WebPage + BreadcrumbList (Global › Ngôn ngữ) | không |
| Checklist `/xx/checklist/` | 10 | Article + BreadcrumbList 3 cấp | thêm `isPartOf`, `author.url`, `publisher` với logo |
| Hub `/xx/topics/*` | 40 | Article + BreadcrumbList | breadcrumb hết lặp URL; thêm `publisher`, `isPartOf`, `datePublished`/`dateModified` từ `publication.approved_at` |
| Supporting `/xx/guides/*` | 861 | Article + BreadcrumbList | như Hub |
| `/about/` | 1 | AboutPage | không |
| `/search/` (noindex) | 1 | WebSite + WebPage | không |
| `/contact/`, `/privacy/`, `/terms/` | 3 | WebPage | không |

`audit-ai-search`: 926/926 JSON-LD hợp lệ. `@type` của từng URL là trường đóng băng và không đổi; các thuộc tính mới được thêm bên trong cùng loại.

Ngày tháng: 901 packet có `publication.approved_at` nên Article nhận đúng mốc đó; 10 checklist cũ không có bản ghi xuất bản nên không có ngày. Không bịa `dateModified` khác `datePublished` vì repo không lưu lịch sử chỉnh sửa nội dung.

## 3. Tín hiệu cho máy trả lời (AEO) trên từng bài

| Tín hiệu | Hiện trạng | Phạm vi |
|---|---|---|
| Đoạn dẫn ngay dưới H1 trùng mô tả meta, trả lời trực tiếp | có | 901 bài |
| H2 có `id` và mục lục (TOC) | có (premium) | 901 bài |
| Nguồn chính thức inline cho khẳng định pháp lý, tiền tệ, an toàn | bắt buộc bởi G3 và fact-guard | mọi bài xuất bản theo policy |
| Mục "Tài liệu tham khảo" cuối bài | có | 901 bài |
| Ghi chú xuất xứ AI (bản địa hóa) | có trên mọi xuất bản theo policy | 901 bài |
| Trang không có liên kết nguồn ngoài | 25: gốc, 10 Pillar, 10 checklist, 4 tiện ích | trang khung, không phải bài có khẳng định |
| FAQ hiển thị | 10 Pillar (phần FAQ bằng `<details>`) | không có FAQPage schema, xem bên dưới |
| Ảnh xem trước mạng xã hội | `og:image` 1600×900, `twitter:card summary_large_image` | 927 trang, trừ `/search/` |
| Alt ảnh | hero trang gốc có alt mô tả tác phẩm; 44 ảnh thẻ chủ đề và thư viện giữ `alt=""` vì là ảnh trang trí đứng cạnh tiêu đề | 45 ảnh trên 11 trang |

## 4. Quyết định có chủ ý

- Không thêm `FAQPage`: Google chỉ hiển thị rich result FAQ cho site chính phủ và y tế có thẩm quyền (từ tháng 8/2023), và FAQ của Pillar là nội dung giới thiệu. Thêm schema không đổi kết quả và làm tăng lượng JSON-LD cần bảo vệ.
- Không thêm `sameAs`: repo không có hồ sơ mạng xã hội hoặc Wikidata đã xác minh cho "Vietnam Two-Wheel Guide"; không bịa liên kết.
- Không thêm `Person` tác giả: không có cá nhân nào được ghi nhận; `Organization` là trung thực hơn.
- Không thêm ảnh riêng cho bài: không packet nào có `cover_image`; dùng ảnh toàn site cho xem trước. Khi Writer thêm ảnh có bản quyền rõ ràng, `renderArticle` đã sẵn sàng hiển thị `cover_image`, `cover_alt`, `image_credit`.
- Không khai báo `speakable`, `Review`, `AggregateRating`, `Offer`.

## 5. GEO (sẵn sàng cho công cụ sinh câu trả lời)

Quan sát từ SERP ngày 2026-10-20 (xem 03): AI Overview có mặt ở de, zh, ko, ja; PAA ở en, fr, nl, ja. Những gì repo kiểm soát được và đã có:
- câu trả lời ngắn ở đầu bài, cấu trúc H2 theo câu hỏi, bảng và danh sách;
- nguồn chính thức dẫn ra ngoài (luật, nghị định, trang đại sứ quán), có ngày;
- thực thể nhất quán (site, nhà xuất bản, Hà Nội);
- ngày xuất bản thật trên Article.

Những gì không thể đo trong repo: tần suất được trích dẫn, lượt hiển thị trong AI Overview. `OpenSEO`/`OpenRush` có công cụ AI visibility nhưng cần credit và bộ prompt đã duyệt; chưa chạy trong phiên này (BLOCKED theo credit, không phải theo kỹ thuật).

## 6. Theo ngôn ngữ

| Ngôn ngữ | Bài có Article đầy đủ (publisher, isPartOf) | Bài có ngày xuất bản | Trang có FAQ hiển thị | Bài không có nguồn ngoài |
|---|---|---|---|---|
| vi | 87 | 86 | 1 (Pillar) | 0 (ngoài Pillar và checklist) |
| en | 96 | 95 | 1 | 0 |
| de | 98 | 97 | 1 | 0 |
| fr | 95 | 94 | 1 | 0 |
| es | 85 | 84 | 1 | 0 |
| nl | 90 | 89 | 1 | 0 |
| zh | 90 | 89 | 1 | 0 |
| pt | 90 | 89 | 1 | 0 |
| ko | 90 | 89 | 1 | 0 |
| ja | 90 | 89 | 1 | 0 |

Cột 2 gồm Hub, Supporting và checklist; cột 3 trừ checklist (không có bản ghi xuất bản).

Trạng thái: IMPLEMENTED, TESTED (`tests/seo-v10.test.mjs` kiểm tra publisher, isPartOf, ngày đúng theo `approved_at`, breadcrumb duy nhất, og:image, twitter:card).
