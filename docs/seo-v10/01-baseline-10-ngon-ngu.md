# 01 · Baseline 10 ngôn ngữ (trước khi sửa)

Ngày đo: 2026-10-20. Điểm xuất phát: `main` tại commit `fc4fbb6c`. Nhánh làm việc: `seo/v10-global-engine-20261020`. Site: https://global.rentbikehanoi.com. Mọi số liệu dưới đây đo trực tiếp trên mã nguồn, Matrix và HTML đã sinh trong repo; không có số liệu GSC, GA4, thứ hạng, lưu lượng, CTR hay backlink.

## 1. Quy mô theo ngôn ngữ

Nguồn: `data/seo/master-matrix.json` (1.781 dòng: 926 PUBLISHED, 855 IDEA).

| Ngôn ngữ | URL PUBLISHED | Pillar / Hub / Supporting / Utility | IDEA chờ viết | Số từ trung vị bài | Bài ngắn nhất (từ) |
|---|---|---|---|---|---|
| vi | 88 | 1 / 4 / 83 / 0 | 89 | 2.115 | 428 |
| en | 101 | 1 / 4 / 92 / 4 | 84 | 1.571 | 286 |
| de | 99 | 1 / 4 / 94 / 0 | 81 | 1.460 | 257 |
| fr | 96 | 1 / 4 / 91 / 0 | 85 | 1.714 | 286 |
| es | 86 | 1 / 4 / 81 / 0 | 83 | 1.717 | 273 |
| nl | 91 | 1 / 4 / 86 / 0 | 87 | 1.587 | 244 |
| zh | 91 | 1 / 4 / 86 / 0 | 87 | 2.498 | 441 |
| pt | 91 | 1 / 4 / 86 / 0 | 87 | 1.673 | 252 |
| ko | 91 | 1 / 4 / 86 / 0 | 86 | 3.091 | 532 |
| ja | 91 | 1 / 4 / 86 / 0 | 86 | 3.326 | 520 |
| gốc `/` | 1 | bộ chọn ngôn ngữ | 0 | 118 | 22 (trang tiện ích) |
| **Tổng** | **926** | 10 / 40 / 871 / 4 + 1 | **855** | | |

Ghi chú:
- Supporting của mỗi ngôn ngữ gồm 1 trang checklist cũ (`/xx/checklist/`) và các bài `/xx/guides/*`; 4 Hub là `/xx/topics/*`.
- 4 trang Utility (`/about/`, `/contact/`, `/privacy/`, `/terms/`) được Matrix gán locale `en` nhưng audit xếp vào nhóm "site". Vì vậy audit đếm `en` = 97 trang.
- HTML quét được 928 tệp: 926 URL PUBLISHED cộng `/search/` (noindex, tiện ích) và `404.html`.
- Số từ của zh, ja, ko do cách đếm của audit nội bộ ước lượng; chỉ dùng để so sánh trong cùng ngôn ngữ, không so sánh chéo ngôn ngữ.

## 2. Trạng thái QA của repo tại baseline

| Kiểm tra | Kết quả tại `fc4fbb6c` |
|---|---|
| `node scripts/build.mjs` và `--check` | 954 tệp sinh, byte-identical |
| `node --test tests/*.test.mjs` | 264 / 264 pass |
| `node scripts/seo/validate-plan.mjs` | SEO MATRIX VALID |
| `node scripts/seo/seo-guard.mjs` | PASS, fail 0, warn 69 (ANCHOR_DIVERSITY) |
| `node scripts/seo/fact-guard.mjs` | PASS, fail 0, warn 709 (số tiền chưa có nguồn trong bản nháp Writer, không phải trang live) |
| `node scripts/seo/content-graph.mjs --check` | CONTENT_GRAPH_VALID |
| `node scripts/nav-qa.mjs` | PASS, 10 locale, 4 hub và 8 nhãn con mỗi locale, 0 liên kết IDEA |
| `node scripts/seo/audit-static.mjs --fail-p0` | P0 0, P1 0, P2 0, P3 0 |
| `node scripts/seo/topical-authority.mjs validate` | hợp lệ, 1.844 cảnh báo T4/T8 trên ứng viên (không phải trang live) |

## 3. Lỗi kỹ thuật phát hiện tại baseline (audit V10, toàn site)

Audit V10 (`audit-v10`) đọc từng HTML: head, canonical, robots, hreflang, H1, Open Graph, Twitter card, JSON-LD, breadcrumb, alt ảnh, liên kết nội bộ trong nội dung, đối chiếu Matrix, sitemap và freeze.

| Mức | Mã | Số trang | Nguyên nhân gốc |
|---|---|---|---|
| P0 | mọi hạng mục (canonical, lang, noindex, H1, sitemap, CNAME, robots, Matrix lệch, liên kết hỏng) | 0 | |
| P1 | BREADCRUMB_DUPLICATE_ITEM | 40 | Hub lấy cha là Pillar nên BreadcrumbList lặp URL trang chủ ngôn ngữ hai lần |
| P2 | ARTICLE_NO_DATE | 911 | Article schema không có `datePublished` dù packet có `publication.approved_at` |
| P2 | LOW_INBOUND (dưới 3 liên kết nội dung trỏ tới) | 179 | Khối bài liên quan và khối "bài cùng chủ đề" luôn lấy 6 dòng đầu của Hub |
| P2 | TITLE_OVER_70 | 321 | Biên tập, trường đóng băng |
| P2 | DESCRIPTION_OVER_165 | 622 | Biên tập, trường đóng băng |
| P3 | ARTICLE_NO_PUBLISHER | 911 | Article schema thiếu `publisher`, `isPartOf` |
| P3 | NO_OG_IMAGE | 927 | Không trang nào có `og:image` |
| P3 | NO_TWITTER_CARD | 902 | Bài viết không có thẻ Twitter |
| P3 | OG_NO_SITE_NAME | 902 | Bài viết không có `og:site_name` |
| P3 | IMG_EMPTY_ALT | 11 | Ảnh hero và ảnh chủ đề có `alt=""` |
| P3 | OG_INCOMPLETE | 1 | `/search/` (noindex) |
| P3 | HREFLANG_NO_XDEFAULT | 10 | 10 trang checklist, theo thiết kế (xem 05) |
| P3 | TITLE_61_70 | 227 | Biên tập |
| P3 | TITLE_UNDER_25 | 56 | zh, ja, ko: ngưỡng ký tự không phù hợp chữ CJK |
| P3 | DESCRIPTION_UNDER_70 | 6 | zh, ja, ko |

## 4. Baseline theo ngôn ngữ (lỗi có thể sửa ở generator)

| Ngôn ngữ | Trang quét | Breadcrumb lặp | Article thiếu ngày | Article thiếu publisher | Dưới 3 liên kết tới | Thiếu og:image | Thiếu twitter:card | Thiếu og:site_name | Alt rỗng |
|---|---|---|---|---|---|---|---|---|---|
| vi | 88 | 4 | 87 | 87 | 19 | 88 | 86 | 86 | 1 |
| en | 97 | 4 | 96 | 96 | 20 | 97 | 95 | 95 | 1 |
| de | 99 | 4 | 98 | 98 | 20 | 99 | 97 | 97 | 1 |
| fr | 96 | 4 | 95 | 95 | 23 | 96 | 94 | 94 | 1 |
| es | 86 | 4 | 85 | 85 | 14 | 86 | 84 | 84 | 1 |
| nl | 91 | 4 | 90 | 90 | 15 | 91 | 89 | 89 | 1 |
| zh | 91 | 4 | 90 | 90 | 16 | 91 | 89 | 89 | 1 |
| pt | 91 | 4 | 90 | 90 | 17 | 91 | 89 | 89 | 1 |
| ko | 91 | 4 | 90 | 90 | 17 | 91 | 89 | 89 | 1 |
| ja | 91 | 4 | 90 | 90 | 18 | 91 | 89 | 89 | 1 |
| site (`/`, tiện ích, 404) | 7 | 0 | 0 | 0 | 0 | 6 | 1 | 1 | 1 |
| **Tổng** | **928** | **40** | **911** | **911** | **179** | **927** | **902** | **902** | **11** |

## 5. Baseline theo ngôn ngữ (vấn đề biên tập, không tự sửa)

| Ngôn ngữ | Tiêu đề trên 70 ký tự | Tiêu đề 61 đến 70 | Tiêu đề dưới 25 | Mô tả trên 165 | Mô tả dưới 70 |
|---|---|---|---|---|---|
| vi | 55 | 19 | 0 | 84 | 0 |
| en | 41 | 42 | 0 | 94 | 0 |
| de | 50 | 39 | 0 | 93 | 0 |
| fr | 36 | 43 | 0 | 94 | 0 |
| es | 38 | 33 | 0 | 83 | 0 |
| nl | 51 | 25 | 0 | 87 | 0 |
| zh | 0 | 0 | 45 | 0 | 2 |
| pt | 50 | 25 | 0 | 87 | 0 |
| ko | 0 | 0 | 3 | 0 | 2 |
| ja | 0 | 0 | 8 | 0 | 2 |
| site | 0 | 1 | 0 | 0 | 0 |

Danh sách URL cụ thể: `11-phu-luc-url-can-xu-ly.md`.

## 6. Baseline từ connector bên ngoài (trước khi sửa)

| Công cụ | Phạm vi | Kết quả chính | Thời điểm |
|---|---|---|---|
| OpenRush `audit_site` | 20 trang mẫu trên 926 URL phát hiện qua robots và sitemap | onpage_score 98; high 0, medium 1 (low_content 2 trang ja/zh Hub theo cách đếm từ Latin), low 2 (title_too_long 7, no_image_alt 1 trang gốc); 0 lỗi tải, không cảnh báo render | 2026-10-20 19:39 UTC |
| OpenRush `inspect_domain` (Vietnam, English) | tên miền | không có từ khóa, trang hay đối thủ nào trong chỉ mục của nhà cung cấp cho tên miền này; `summary` rỗng | 2026-10-20 19:39 UTC |
| Ubersuggest `pagespeed_audit` | URL gốc | Desktop LCP 608 ms, CLS 0; Mobile LCP 2,5 s, Speed Index 4,5 s, CLS 0 (chi tiết trong 08) | 2026-10-20 19:39 UTC |
| OpenSEO site audit `1dba2554-015c-4903-a9ef-ebd093c87cd2` | 50 trang (giới hạn gói), Lighthouse 10 trang | 50/50 HTTP 200, 50 indexable, 50 có trong sitemap; info: title-too-long 43, meta-description-too-long 47; không có lỗi mức warning hay error | 2026-10-20 19:48 đến 19:50 UTC |

Không công cụ nào trong số này đo thứ hạng, lưu lượng hay chỉ mục Google của site; chúng chỉ crawl và chấm cấu trúc trang.
