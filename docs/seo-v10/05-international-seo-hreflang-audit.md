# 05 · International SEO / Hreflang Audit

Ngày: 2026-10-20. Nguồn: HTML đã sinh trên nhánh `seo/v10-global-engine-20261020` (giống `main` ở các trường hreflang vì chúng là trường đóng băng), `data/seo/url-freeze.json`, `content/locales.json`, `tests/premium.test.mjs`, `tests/seo-v10.test.mjs`.

## 1. Kiến trúc đa ngôn ngữ

- Một tên miền, thư mục con theo ngôn ngữ: `/vi/`, `/en/`, `/de/`, `/fr/`, `/es/`, `/nl/`, `/zh/`, `/pt/`, `/ko/`, `/ja/`. Trang gốc `/` là bộ chọn ngôn ngữ bằng liên kết HTML thật, không dịch bằng JavaScript.
- `lang` của từng trang lấy từ `content/locales.json` (`htmlLang`); audit V10: 0 trang lệch `lang`.
- Canonical: 926/926 URL tự canonical, tuyệt đối, HTTPS, có dấu gạch chéo cuối.
- Sitemap: `sitemap.xml` là index trỏ tới 10 shard ngôn ngữ cộng `sitemap-main.xml`; 926 URL trong sitemap khớp 926 URL PUBLISHED; không có IDEA, không có `/search/`, không có 404.

## 2. Phạm vi hreflang (đo trên HTML)

| Nhóm trang | Số trang | Có hreflang | `x-default` | Thành phần cụm |
|---|---|---|---|---|
| Gốc `/` | 1 | 1 | trỏ về chính nó | 10 trang chủ ngôn ngữ |
| Trang chủ ngôn ngữ (Pillar) | 10 | 10 | 10 (trỏ về `/`) | 10 trang chủ ngôn ngữ cộng gốc |
| Checklist `/xx/checklist/` | 10 | 10 | 0 | 10 bản checklist tương đương |
| Hub `/xx/topics/*` | 40 | 0 | | nội dung riêng từng ngôn ngữ, không có bản tương đương |
| Supporting `/xx/guides/*` | 861 | 0 | | như trên |
| Tiện ích `/about/`, `/contact/`, `/privacy/`, `/terms/` | 4 | 0 | | chỉ có bản tiếng Anh |

Kết quả kiểm tra đối ứng: 0 lỗi. Mỗi thẻ hreflang trỏ tới một URL PUBLISHED và URL đó trỏ ngược lại đúng ngôn ngữ (script kiểm tra toàn bộ 926 trang; chạy lại được bằng `node --test tests/premium.test.mjs`).

Theo ngôn ngữ: mỗi ngôn ngữ có đúng 2 trang mang hreflang (Pillar và checklist) và đúng 1 trang có `x-default` (Pillar).

## 3. Đánh giá và quyết định

| Mục | Hiện trạng | Đánh giá | Quyết định |
|---|---|---|---|
| Chỉ liên kết hreflang giữa trang tương đương | đúng | đúng chuẩn: Hub và bài hướng dẫn mỗi ngôn ngữ là bài gốc khác nhau, không phải bản dịch, nên không được nhận hreflang | giữ nguyên |
| Checklist không có `x-default` | 10 trang | `x-default` là tùy chọn; cụm checklist không có trang trung lập ngôn ngữ nào phù hợp (gốc `/` không phải checklist) | giữ nguyên; bản đồ hreflang là trường đóng băng, đổi cần PR biên tập với `seo-guard --write` |
| Mã ngôn ngữ | `vi, en, de, fr, es, nl, zh, pt, ko, ja` | hợp lệ ISO 639-1; không gắn vùng vì nội dung không phân vùng | giữ nguyên |
| Tiện ích chỉ có tiếng Anh | 4 trang | chấp nhận: trang pháp lý và liên hệ ở thư mục gốc, có liên kết từ footer mọi ngôn ngữ | giữ nguyên |
| Sitemap mang hreflang | không | không bắt buộc khi HTML đã có; giữ sitemap nhỏ | không thêm |
| Chuyển hướng theo IP hoặc trình duyệt | không có | đúng khuyến nghị Google cho site tĩnh | giữ nguyên |
| Trang chủ ngôn ngữ trùng nội dung với gốc | không | mỗi Pillar có nội dung bản ngữ riêng, FAQ riêng | |

## 4. Rủi ro còn lại và cách theo dõi

- Google có thể chọn canonical khác cho các trang có cùng chủ đề giữa /global và các tên miền chị em (ví dụ `ko.rentbikehanoi.com`, `ja.rentbikehanoi.com` xuất hiện trong SERP ko và ja, xem 03). /global không có bản ghi GSC nên không xác nhận được. Hành động: chủ sở hữu thêm property GSC cho `global.rentbikehanoi.com`; repo không giả định gì cho tới khi đó.
- `seo-guard` giữ bản đồ hreflang của từng URL đóng băng; mọi thay đổi đều phải qua PR có xem xét. `post-publish-qa.yml` kiểm tra lại hreflang và canonical trên production sau mỗi lần deploy.

Trạng thái: không có thay đổi mã trong hạng mục này. Audit TESTED (273 test xanh, trong đó `tests/premium.test.mjs` và `tests/seo-v10.test.mjs` kiểm tra hreflang và breadcrumb).
