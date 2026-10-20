# 02 · Technical SEO Audit Matrix (P0 đến P3)

Ngày: 2026-10-20. Phạm vi: 928 tệp HTML (926 URL PUBLISHED, `/search/`, `404.html`), 10 ngôn ngữ, 3 sitemap cấp (index, 10 shard ngôn ngữ, `sitemap-main.xml`). Mỗi dòng ghi rõ trạng thái sau khi sửa: IMPLEMENTED (đã sửa trong mã), TESTED (có test hoặc QA chạy xanh), DEPLOYED (đã lên production), VERIFIED (đã kiểm tra lại trên production), BLOCKED (không làm được và lý do). Tại thời điểm viết, PR chưa merge nên không hạng mục nào là DEPLOYED hay VERIFIED.

## 1. Ma trận hạng mục

| Mức | Hạng mục | Trước | Sau | Cách sửa (tận nguồn) | Trạng thái |
|---|---|---|---|---|---|
| P0 | Canonical sai hoặc thiếu | 0 | 0 | không cần | OK |
| P0 | `lang` lệch locale | 0 | 0 | không cần | OK |
| P0 | Trang PUBLISHED bị noindex | 0 | 0 | không cần | OK |
| P0 | Sitemap lệch Matrix (926 URL) | 0 | 0 | không cần | OK |
| P0 | URL trùng lặp, thiếu H1, nhiều H1, thiếu title hoặc description, thiếu viewport | 0 | 0 | không cần | OK |
| P0 | Liên kết nội bộ hỏng (đích không tồn tại) | 0 | 0 | không cần | OK |
| P0 | CNAME, robots.txt, shard sitemap thiếu | 0 | 0 | không cần | OK |
| P1 | BreadcrumbList lặp URL trên Hub | 40 | 0 | `scripts/articles.mjs`: Hub có cha là Pillar dùng đường dẫn Global › Ngôn ngữ › Hub; bài Supporting giữ Ngôn ngữ › Hub › Bài | IMPLEMENTED, TESTED |
| P2 | Article thiếu `datePublished` / `dateModified` | 911 | 10 | lấy đúng `publication.approved_at` của packet; không có bản ghi thì không bịa ngày (10 checklist cũ) | IMPLEMENTED, TESTED |
| P2 | Dưới 3 liên kết nội dung trỏ tới | 179 | 0 | cửa sổ liên kết xoay vòng trong `topicLinks` và thanh bài liên quan (xem 06) | IMPLEMENTED, TESTED |
| P2 | Tiêu đề trên 70 ký tự | 321 | 321 | biên tập, trường đóng băng trong `url-freeze.json` | BLOCKED (cần PR biên tập kèm `seo-guard --write`) |
| P2 | Mô tả trên 165 ký tự | 622 | 622 | biên tập, trường đóng băng | BLOCKED (như trên) |
| P3 | Article thiếu `publisher`, `isPartOf`, logo | 911 | 0 | Organization "Vietnam Two-Wheel Guide" với `url` `/about/` và logo `/assets/favicon.svg`, `isPartOf` WebSite | IMPLEMENTED, TESTED |
| P3 | Thiếu `og:image` | 927 | 1 | ảnh xã hội toàn site `/hero-hanoi.webp` 1600×900 trong `head()` của build và trong `renderArticle` | IMPLEMENTED, TESTED |
| P3 | Thiếu `twitter:card` | 902 | 1 | `summary_large_image` trên mọi trang có ảnh | IMPLEMENTED, TESTED |
| P3 | Thiếu `og:site_name` trên bài | 902 | 1 | thêm vào `renderArticle` | IMPLEMENTED, TESTED |
| P3 | Alt ảnh rỗng (hero, 4 ảnh chủ đề, thư viện gốc) | 11 | 0 | `scripts/ultra.mjs`: alt mô tả cho hero, alt theo tiêu đề thẻ chủ đề đã bản địa hóa | IMPLEMENTED, TESTED |
| P3 | Open Graph không đầy đủ | 1 | 1 | `/search/` là trang noindex, bỏ qua có chủ ý | OK |
| P3 | Checklist không có `x-default` | 10 | 10 | theo thiết kế: cụm hreflang chỉ gồm trang tương đương; bản đồ hreflang là trường đóng băng | OK (xem 05) |
| P3 | Tiêu đề 61 đến 70 ký tự | 227 | 227 | biên tập | BLOCKED (biên tập) |
| P3 | Tiêu đề dưới 25 ký tự (zh 45, ja 8, ko 3) | 56 | 56 | ngưỡng ký tự không áp dụng cho chữ CJK; cần đánh giá theo pixel | Không hành động |
| P3 | Mô tả dưới 70 ký tự (zh, ja, ko mỗi locale 2) | 6 | 6 | như trên | Không hành động |
| Hạ tầng | Regex sitemap thuộc sở hữu của build không nhận shard `-10` trở lên | tiềm ẩn | sửa | `sitemapFilePattern` dùng chung ngữ pháp với `SITEMAP_CHILD`; build chỉ xóa shard cũ đúng tên | IMPLEMENTED, TESTED |

Tổng lỗi có thể sửa ở generator: 3.701 lượt trên 928 trang trước, còn 13 lượt sau (10 checklist không có ngày vì không có bản ghi xuất bản, 3 thẻ xã hội trên `/search/` noindex).

## 2. Theo ngôn ngữ: quét, phát hiện, đã sửa, còn lại

Cột "phát hiện" và "đã sửa" đếm các lỗi mức P1 đến P3 có thể sửa ở generator (breadcrumb, ngày, publisher, liên kết tới, og:image, twitter, site_name, alt). Cột "còn lại" là vấn đề biên tập trên trường đóng băng cộng các mục theo thiết kế.

| Ngôn ngữ | URL quét | Lỗi phát hiện | Đã sửa | Còn lại biên tập (tiêu đề dài / mô tả dài) | Còn lại theo thiết kế |
|---|---|---|---|---|---|
| vi | 88 | 458 | 458 | 74 / 84 | checklist: 1 không ngày, 1 không x-default |
| en | 97 | 504 | 504 | 83 / 94 | như trên |
| de | 99 | 514 | 514 | 89 / 93 | như trên |
| fr | 96 | 501 | 501 | 79 / 94 | như trên |
| es | 86 | 443 | 443 | 71 / 83 | như trên |
| nl | 91 | 469 | 469 | 76 / 87 | như trên |
| zh | 91 | 470 | 470 | 0 / 0 (45 tiêu đề và 2 mô tả ngắn theo ký tự, CJK) | như trên |
| pt | 91 | 471 | 471 | 75 / 87 | như trên |
| ko | 91 | 471 | 471 | 0 / 0 (3 tiêu đề và 2 mô tả ngắn theo ký tự, CJK) | như trên |
| ja | 91 | 472 | 472 | 0 / 0 (8 tiêu đề và 2 mô tả ngắn theo ký tự, CJK) | như trên |
| site | 7 | 10 | 7 | 1 tiêu đề 61 đến 70 | 3 thẻ xã hội trên `/search/` noindex |

Cách tính "lỗi phát hiện" theo ngôn ngữ: tổng các cột của bảng 4 trong `01-baseline-10-ngon-ngu.md`. Danh sách URL của phần "còn lại biên tập": `11-phu-luc-url-can-xu-ly.md`.

## 3. Đối chiếu với crawler bên ngoài

| Nguồn | Phạm vi | Phát hiện | Khớp với audit nội bộ? |
|---|---|---|---|
| OpenSEO audit `1dba2554` (2026-10-20) | 50 trang en đầu tiên theo thứ tự crawl, Lighthouse 10 trang | 50 × HTTP 200, 50 indexable, 50 trong sitemap, phản hồi 9 đến 79 ms (trung vị 25 ms), 16 đến 44 liên kết nội bộ mỗi trang; info: title-too-long 43, meta-description-too-long 47 | Khớp: cùng nhóm tiêu đề và mô tả dài; không phát hiện lỗi crawl |
| OpenRush `audit_site` (2026-10-20) | 20 trang mẫu, 19 mẫu template | onpage 98; title_too_long 7; low_content 2 (`/ja/topics/anzen-trouble/`, `/zh/topics/jiage-yajin/`); no_image_alt 1 (trang gốc) | Khớp: alt rỗng đã sửa; low_content do đếm từ kiểu Latin trên chữ CJK, hai Hub này dài 2.400 đến 2.500 ký tự nội dung, không mỏng |
| Ubersuggest `site_audit` | | không chạy được: tính năng trả phí trên gói free | BLOCKED |
| Firecrawl | | tài khoản hết credit (HTTP 402) | BLOCKED |
| Tải trực tiếp production từ sandbox | | proxy chặn kết nối ra ngoài tới site (CONNECT 403) | BLOCKED, thay bằng crawler của connector |

## 4. Những gì cố ý không làm

- Không đổi URL, slug, canonical, CNAME, menu, footer, theme.
- Không đổi tiêu đề, mô tả, H1, hreflang hay loại schema của URL đã đóng băng; vì vậy không có thay đổi nào cần `seo-guard --write`.
- Không thêm schema LocalBusiness, AutoRental, Offer, Review, NAP, giá hay chính sách kinh doanh.
- Không thêm FAQPage schema (xem 07).
- Không can thiệp claims của Writer, bản nháp bất biến, Publisher hay Live QA.
