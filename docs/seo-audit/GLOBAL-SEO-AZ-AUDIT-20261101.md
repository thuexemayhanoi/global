# Global SEO A–Z: tái kiểm toán toàn website, 01/11/2026

**Website:** https://global.rentbikehanoi.com · **Repo:** thuexemayhanoi/global · **Phạm vi:** toàn site, 10 ngôn ngữ (vi, en, de, fr, es, nl, zh, pt, ko, ja)
**Trạng thái được kiểm toán:** `main` @ `b5b6d26` (PR #167, 29/10/2026) · **Branch kiểm toán:** `audit/seo-az-20261101` · **Ngày dữ liệu:** 01/11/2026 (UTC)
**Lần kiểm toán trước:** baseline 27/10/2026 ([báo cáo](GLOBAL-SEO-AZ-AUDIT-20261027.md), PR #119), sau đó là các đợt sửa A–Y và nhiệm vụ A–Z (PR #120–#167, [ledger](EXECUTION-LEDGER.md)).
**Chế độ vận hành:** SEO-only (chỉ thị chủ sở hữu 28/10/2026). Không bài mới, không URL mới. Lần kiểm toán này chỉ đọc; không sửa trang nào trên production.

**Sản phẩm bàn giao**

| Tệp | Nội dung |
|---|---|
| [`reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx`](../../reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx) | Master SEO Matrix: 19 sheet (14 sheet bắt buộc, README & LEGEND, LISTS, IMAGE SEO MATRIX, CONTENT SEO MATRIX, SEO TASK BOARD), 17 bảng, 2.152 dòng URL/Matrix, 767 lỗi, 76 nhiệm vụ, 219 công thức (0 lỗi sau khi LibreOffice tính lại), 3 biểu đồ |
| [`reports/seo/data/audit-master-matrix.csv`](../../reports/seo/data/audit-master-matrix.csv) | Master Matrix kiểm toán dạng CSV. Không ghi đè `data/seo/master-matrix.json` |
| [`reports/seo/data/findings.csv`](../../reports/seo/data/findings.csv), [`tasks.csv`](../../reports/seo/data/tasks.csv), [`locale-matrix.csv`](../../reports/seo/data/locale-matrix.csv) | Lỗi, nhiệm vụ và bảng 10 ngôn ngữ |
| [`reports/seo/data/deep-audit.json`](../../reports/seo/data/deep-audit.json) | Kết quả kiểm tra sâu từng URL (mới trong lần này) |
| [`reports/seo/data/raw/`](../../reports/seo/data/raw/) | Bằng chứng gốc: output của 10 công cụ QA, các run live, axe, W3C validator, Lighthouse, tương phản màu, kiểm tra giá, từ khóa |
| [`docs/seo-matrix/TASKS.json`](../seo-matrix/TASKS.json), [`CHECKPOINT.md`](../seo-matrix/CHECKPOINT.md) | 8 nhiệm vụ TODO mới cho các lỗi đã xác minh; checkpoint chỉ nhiệm vụ tiếp theo |
| [`docs/seo-audit/tools/`](tools/) | Công cụ chỉ đọc: thêm `deep_audit.py` và `site_browser_audit.cjs`; mở rộng `analyze.py`, `ledger.py`, `build_workbook.py` |

---

## 1. Tóm tắt điều hành

**Kỹ thuật: rất tốt, không có lỗi P0.** Production khớp từng byte với bản build đã commit: 1.081/1.081 route (1.079 URL đã xuất bản, `/search/`, `/404.html`) trả HTTP 200 và HTML giống hệt ([live markup QA 41326939112](https://github.com/thuexemayhanoi/global/actions/runs/41326939112)). Post-publish QA chạy 1.094 kiểm tra, 0 lỗi ([run 41326941613](https://github.com/thuexemayhanoi/global/actions/runs/41326941613)). Lần này đã đo thêm bằng trình duyệt trên **toàn bộ 1.081 trang**: 0 vi phạm WCAG A/AA (axe-core), 0 trang tràn ngang ở 390 px, 0 lỗi JavaScript. W3C validator báo 0 lỗi HTML. Lighthouse lab cho trung vị 100 điểm ở cả 4 hạng mục. Mọi trang cách trang chủ tối đa 3 click. Không có link nội bộ hỏng, không có link qua redirect, không có trang trùng lặp. Không trang nào trích dẫn văn bản luật đã hết hiệu lực mà không nêu văn bản thay thế.

**Vấn đề nằm ở độ hiển thị, đo lường và độ tin cậy, không nằm ở kỹ thuật:**

1. **(P1) Không thấy độ hiển thị nào.** Theo Ubersuggest (01/11): 0 từ khóa xếp hạng và 0 lượt truy cập organic trong cả 12 tháng gần nhất, DA 3, 58 backlink từ 53 tên miền (28/10: DA 2, 37/32). Đây là ước tính của bên thứ ba (INFERRED).
2. **(P1) Không đo được Google.** Chưa kết nối Search Console và GA4 (kiểm tra lại 01/11). Không biết bao nhiêu URL đã được index.
3. **(P1, mới) Rủi ro "scaled content".** 1.054 bài do AI soạn được duyệt trong 12 ngày, trong đó 873 bài chỉ trong 15–16/10, trên một host mới có DA thấp. Không bài nào được người kiểm tra sự thật (`facts_reviewed_by_human=false`). Hệ thống chất lượng của Google có thể để nhiều bài ở trạng thái "Crawled/Discovered – currently not indexed". Không xác minh được khi chưa có GSC. Chỉ thị SEO-only đã dừng xuất bản thêm, nên rủi ro không tăng.
4. **(P2, mới) Trang không hiển thị ngày.** 0/1.074 trang Pillar/Hub/Supporting in ngày đăng hoặc ngày cập nhật, dù JSON-LD và sitemap đều có ngày. Với nội dung về luật, mức phạt và giá, ngày hiển thị là tín hiệu tin cậy mà Google khuyến nghị.
5. **(P2, mới) Trang About hứa một điều không có trên trang.** Trang About viết "Each guide lists its references with the date they were checked". Thực tế, cả 5.629 nguồn đều có trường `checked_on` trong dữ liệu bài viết nhưng không nguồn nào được in ngày ra trang.
6. **(P2, mới) Chuỗi giao diện tiếng Anh trên 977 trang không phải tiếng Anh.** Link "Skip to content", `aria-label="Breadcrumb"` và nhãn "Estimated reading time" chưa được dịch (WCAG 2.2 SC 3.1.2). Khung minh họa hero của 10 Pillar cũng có chữ "10 LANGUAGES", "4 TOPIC HUBS".
7. **(P2, mới) Ảnh bìa nằm trong màn hình đầu nhưng `loading="lazy"`.** Gặp ở 98/127 trang desktop được kiểm tra và ở 10 trang checklist trên mobile. Ở 20 trang desktop và 3 trang mobile, chính ảnh lazy này là phần tử LCP. Lighthouse báo `lcp-lazy-loaded`. LCP mobile lab của trang checklist là 1,95 s, các template khác 1,43–1,50 s.
8. **(P3, mới) 12 cụm chủ đề có mặt ở cả 10 ngôn ngữ nhưng chưa có hreflang.** Gồm 4 Hub (H01–H04) và 8 bài khởi đầu (S01–S08), tổng 120 URL. Sáu cụm (S01–S04, S06, S08) dùng chung phần lớn nguồn. Đây **không phải lỗi**: chúng giữ trạng thái NO_EQUIVALENT_BY_DESIGN cho tới khi biên tập viên xác nhận là các phiên bản của cùng một trang.
9. **(P3, mới) Tối ưu nhỏ:** 4 câu hỏi FAQ trùng nguyên văn trên 8 trang (de, en, fr, nl). 4 file CSS chặn render. Ảnh bìa thiếu kích thước trung gian trong `srcset` (phí 47–63 KB/trang trên mobile). `aria-label` đặt trên `<span>` (W3C cảnh báo ở 1.064 trang). Slug zh/ko/ja lẫn tiếng Anh. Thiếu header X-Content-Type-Options/CSP (giới hạn của GitHub Pages).

| KPI (công thức trong EXECUTIVE DASHBOARD) | Giá trị | Bằng chứng |
|---|---:|---|
| URL PUBLISHED | 1.079 | VERIFIED |
| Live HTTP 200 + HTML khớp byte | 1.079 (+ `/search/`, `/404.html`) | VERIFIED (run 41326939112) |
| Indexable + self-canonical / trong sitemap / frozen | 1.079 / 1.079 / 1.079 | VERIFIED |
| Độ sâu click tối đa từ `/` | 3 | VERIFIED |
| Lỗi HTML (W3C) / vi phạm axe WCAG A/AA / tràn ngang 390 px / lỗi console | 0 / 0 / 0 / 0 | VERIFIED (1.081 trang) |
| Lighthouse lab trung vị, mobile | LCP 1,50 s · CLS 0,004 · TBT 0 ms · điểm 100/100/100/100 | VERIFIED (lab) |
| Cặp trang trùng lặp gần (≥ 0,5) | 0 (cao nhất 0,254) | VERIFIED |
| Tham chiếu pháp lý lỗi thời | 0 (51 trang có cờ đều được đọc và đúng) | VERIFIED |
| Trang in ngày đăng hoặc cập nhật | 0 / 1.074 | VERIFIED |
| Trang có chuỗi giao diện tiếng Anh (locale khác en) | 977 | VERIFIED |
| Hàng IDEA: READY / CLAIMED / SUBMITTED chưa xuất bản | 1.041 / 30 / 0 | VERIFIED |
| Từ khóa xếp hạng / DA / backlink / RD | 0 / 3 / 58 / 53 | INFERRED (Ubersuggest) |
| Search Console, GA4, CrUX, AI visibility | — | NOT_CONNECTED |
| Lỗi: P0 / P1 / P2 / P3 (tổng 767) | 0 / 3 / 148 / 616 | — |
| Lỗi đang mở / chờ chủ sở hữu / bị chặn / đã xong hoặc đã thẩm định | 36 / 17 / 1 / 713 | — |
| Nhiệm vụ: đang mở / chờ chủ sở hữu / bị chặn / xong hoặc N/A | 13 / 10 / 1 / 52 (tổng 76) | — |

---

## 2. Phương pháp và bằng chứng

### 2.1 Nguồn dữ liệu

| Nguồn | Trạng thái | Kết quả |
|---|---|---|
| Bản build đã commit (1.081 trang HTML), Matrix, bài viết, sitemap, url-freeze, content graph, bản đồ chủ đề, claims, trạng thái publisher | VERIFIED | `collect.py` và `deep_audit.py` (mới) đo từng URL |
| 10 công cụ QA của repo | VERIFIED | Tất cả PASS, 0 FAIL. `seo-guard`: 197 WARN đa dạng anchor. `fact-guard`: 743 WARN (740 cảnh báo giá trên 95 bài, mỗi bài đếm cả dữ liệu và trang HTML; 3 xung đột doanh nghiệp C1–C3). `language-audit`: 1.081 trang, 0 FAIL/0 WARN |
| Live Markup QA (GitHub Actions) | VERIFIED | [41326939112](https://github.com/thuexemayhanoi/global/actions/runs/41326939112): 1.081/1.081 giống hệt, 0 lệch |
| Post-Publish QA + host probe | VERIFIED | [41326941613](https://github.com/thuexemayhanoi/global/actions/runs/41326941613): 1.094 kiểm tra, 0 lỗi; http→https 301, `/vi`→`/vi/` 301, `www` không phân giải, HSTS `max-age=31556952`, `cache-control: max-age=600` |
| Kiểm tra lại giá bên thứ ba | VERIFIED | [41331401025](https://github.com/thuexemayhanoi/global/actions/runs/41331401025): 95 bài, 177 đoạn: 116 VERIFIED, 18 PARTIAL, 2 NOT_FOUND (cả hai đã kiểm tay ngày 28/10 và đúng), 41 UNREACHABLE (thuvienphapluat.vn trả 403) |
| Kiểm tra liên kết nguồn ngoài | VERIFIED | REFLINK_RESULT |
| Audit trình duyệt (Playwright Chromium + axe-core 4.10.3) | VERIFIED (lab) | 1.081 trang ở 390 px, 127 trang ở 1366 px |
| W3C Nu Html Checker | VERIFIED | 1.081 trang: 0 lỗi, 1.064 cảnh báo (cùng một mẫu `aria-label`) |
| Lighthouse 12.6.1 | VERIFIED (lab) | 15 URL mẫu × mobile/desktop (30 lần chạy) |
| Đo tương phản màu các nút axe "cần xem xét" | VERIFIED (mẫu) | 6 template × 2 viewport, đo theo computed style và theo pixel |
| Volume từ khóa | VERIFIED / NOT_CHECKED | DataForSEO 27/10 (vi, en, fr, ko, ja đủ; de, es một phần). Ubersuggest 01/11: "motorbike rental hanoi" toàn cầu 2.900/tháng; "alugar moto hanoi" (Bồ Đào Nha) 0. nl, pt, zh: không đủ dữ liệu |
| Backlink, DA (Ubersuggest) | INFERRED | DA 3, 58 backlink, 53 RD, 0 từ khóa |
| GSC, GA4, CrUX, theo dõi thứ hạng, AI visibility | NOT_CONNECTED | OpenSEO: 0 tài khoản Google; OpenRush: chưa kết nối gì |
| PageSpeed Insights API | NOT_AVAILABLE | HTTP 429 (hết quota ẩn danh trong ngày) |
| Firecrawl, OpenRush, OpenSEO | NOT_AVAILABLE | Hết credit (OpenSEO còn 4) |

### 2.2 Giới hạn (không tuyên bố đã kiểm toán 100%)

- **Container kiểm toán không truy cập trực tiếp được production** (egress proxy trả 403), và cũng không tải được artifact của Actions. Dữ liệu live lấy từ các workflow chỉ đọc của repo; giá trị được chép từ log của job.
- Audit trình duyệt, Lighthouse và W3C chạy trên server tĩnh cục bộ phục vụ đúng bản build đã commit. Kết quả áp dụng cho production vì live markup QA đã chứng minh hai bên giống nhau từng byte. Các chỉ số phụ thuộc mạng (nén, cache, độ trễ server) phản ánh server cục bộ nên đã bỏ qua.
- Desktop chỉ đo 127 trang mẫu (mọi Pillar, Hub, checklist, trang tiện ích và 6 bài Supporting mỗi ngôn ngữ). Mobile đo đủ 1.081 trang. Lighthouse đo 15 URL mẫu.
- Độ chính xác nội dung: chỉ quét tự động văn bản luật và giá, rồi đọc tay các câu bị gắn cờ. **Không có người đọc lại toàn bộ 1.054 bài.**
- Cannibalization và trùng lặp được đo bằng từ vựng (shingle, token của query, độ giống tiêu đề), không dựa trên SERP.
- Không xác minh được: index của Google, thứ hạng, CTR, INP thực tế, trích dẫn từ AI.

---

## 3. Kiểm kê URL (Phase 1)

Đã đối chiếu 7 nguồn: Matrix, HTML đã build, sitemap index và 11 shard, `url-freeze.json`, content graph, dữ liệu bài viết và claims ledger, search index. Kết quả khớp hoàn toàn.

| | Tổng | vi | en | de | fr | es | nl | zh | pt | ko | ja | root |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| PUBLISHED | 1.079 | 91 | 101¹ | 249 | 96 | 86 | 91 | 91 | 91 | 91 | 91 | 1 |
| Hub / Supporting² | 40 / 1.024 | 4/86 | 4/92 | 4/244 | 4/91 | 4/81 | 4/86 | 4/86 | 4/86 | 4/86 | 4/86 | — |
| IDEA → READY | 1.041 | 123 | 102 | 107 | 101 | 101 | 101 | 101 | 101 | 102 | 102 | — |
| IDEA → CLAIMED | 30 | — | — | 30 | — | — | — | — | — | — | — | — |

¹ Gồm 4 trang tiện ích `/about/`, `/contact/`, `/privacy/`, `/terms/`. ² Supporting gồm cả trang checklist.

- **Phân loại trạng thái:** 1.079 PUBLISHED; 1.071 hàng IDEA (1.041 READY, 30 CLAIMED, 0 SUBMITTED chưa xuất bản); ứng viên Topic Factory: 711 PROPOSED và 690 ARCHITECTURE_BLOCKED (chỉ là năng lực, không phải URL). 2 trang noindex theo thiết kế: `/search/` và `/404.html`. Không có redirect nội bộ. Redirect chỉ có ở mức host: http→https và URL thiếu `/`→có `/`, đều 301. Route lạ trả 404 thật.
- **Đối chiếu nguồn ↔ production:** 1.081/1.081 trang giống từng byte. Sitemap = Matrix = url-freeze = 1.079 URL. Content graph: 1.079 KEEP. Claims: 1.054 SUBMITTED, bằng đúng số dữ liệu bài viết, và tất cả đã live. Search index: en có 97 mục vì 4 trang tiện ích không nằm trong index (đúng thiết kế).
- **Không phát hiện:** URL thiếu, trùng, mồ côi (0 trang không có link vào), sai trạng thái, hoặc URL dự kiến bị lộ (3.406 URL dự kiến đều được guard chặn).

---

## 4. Technical SEO (Phase 2)

| Hạng mục | Kết quả | Mức |
|---|---|---|
| HTTP, SSL, robots.txt | 1.079 × 200 live. HSTS bật. robots: `Allow: /` cho mọi bot (kể cả bot AI) và trỏ sitemap index | OK |
| Redirect, chuỗi redirect | 0 link nội bộ đi qua redirect, 0 dạng URL không chuẩn. Ở mức host: 1 bước 301 http→https và thêm `/` | OK |
| Indexability, canonical | 1.079 self-canonical, `og:url` = canonical, `max-image-preview:large` trên mọi trang indexable | OK |
| Title, meta, heading | 0 trùng, H1 = 1 trên mọi trang, 0 nhảy cấp heading, 0 title quá 65 độ rộng. 193 description zh/ko/ja vượt 165 độ rộng nhưng nằm trong khoảng CJK đã chấp nhận (đã thẩm định ở đợt C/M) | OK |
| Link nội bộ, anchor, trang mồ côi | 0 link hỏng, độ sâu tối đa 3 (932 trang ở độ sâu 3), 0 trang mồ côi. Pillar có PageRank nội bộ cao nhất ở mỗi ngôn ngữ. 197 cảnh báo đa dạng anchor (đã thẩm định) | OK / P3 |
| Link ngoài | 26.497 link ngoài, tất cả `rel="noopener noreferrer"`, 0 link `http://`. REFLINK_SHORT | OK |
| Dữ liệu có cấu trúc | 1.079 graph hợp lệ. Article trên 1.064 trang, FAQPage trên 1.074 trang (mọi câu hỏi đều hiển thị trên trang). `dateModified` = sitemap lastmod, `mainEntityOfPage` = canonical, file ảnh Article tồn tại, headline ≤ 110 ký tự, BreadcrumbList kết thúc ở chính trang: 0 lỗi | OK |
| Breadcrumb, điều hướng, phân trang | Breadcrumb hiển thị + JSON-LD trên mọi trang con. Menu dùng chung (nav-qa PASS). Site không có trang phân trang | OK |
| Mobile | 0 trang tràn ngang ở 390 px. Có viewport meta | OK |
| Core Web Vitals | Lab tốt (mục 1). Field (CrUX, INP): NOT_CONNECTED. **Ảnh bìa lazy làm LCP** (`S-LAZY-LCP`). 4 CSS chặn render, Lighthouse ước tính tiết kiệm 0,3–0,5 s (`S-RENDER-BLOCKING-CSS`) | P2 / P3 |
| Hình ảnh | 1.109 lượt dùng ảnh, tất cả WebP, alt đạt, dung lượng đạt. og:image 1.079/1.079 đúng file và kích thước. `srcset` chỉ có 640w và 1200w (`S-COVER-SRCSET`) | OK / P3 |
| Accessibility, HTML | axe 0 vi phạm. W3C 0 lỗi. **Chuỗi tiếng Anh trên 977 trang** (`S-UI-UNTRANSLATED`). `aria-label` trên `<span>` (`S-ARIA-LABEL-SPAN`). Tương phản: các nút có nền đặc đều ≥ 5,23:1; chỉ các nhãn nhỏ của khung hero trang trí là 3,9–4,4:1 (`S-HERO-ART-TEXT`) | P2 / P3 |
| Thin content, soft 404 | 0 trang dưới 50% trung vị cùng ngôn ngữ và vai trò. Route lạ trả 404 thật | OK |
| Crawl budget, sitemap | 11 shard, 1.079 URL, 0 trùng, 0 URL chưa xuất bản. lastmod có trên 1.074 URL; 5 URL không có (`/` và 4 trang tiện ích) vì không ghi nhận ngày sửa nội dung, đúng thiết kế | OK |
| Header bảo mật | Không có X-Content-Type-Options và CSP. GitHub Pages không cho đặt header (`S-SECURITY-HEADERS`) | P3 (chủ sở hữu) |
| JavaScript | 0 lỗi console, 0 request 4xx cùng origin | OK |

---

## 5. SEO đa ngôn ngữ (Phase 3)

| Locale | URL | `lang` đúng | Self-canonical | Hreflang (bản dịch thật) | Ứng viên tương đương | Trang có chuỗi EN | Slug EN/lẫn | Trung vị độ dài | Dữ liệu từ khóa |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| vi | 91 | 91 | 91 | 2 | 12 | 91 | 1 | 1.931 từ | 9/91 có volume |
| en | 101 | 101 | 101 | 2 | 12 | — | — | 1.470 từ | 4/97; head term toàn cầu 2.900 |
| de | 249 | 249 | 249 | 2 | 12 | 249 | 0 | 1.998 từ | 4/13 (một phần) |
| fr | 96 | 96 | 96 | 2 | 12 | 96 | 0 | 1.573 từ | 0/97 |
| es | 86 | 86 | 86 | 2 | 12 | 86 | 0 | 1.595 từ | 2/9 (một phần) |
| nl | 91 | 91 | 91 | 2 | 12 | 91 | 0 | 1.475 từ | NOT_CHECKED |
| zh | 91 | 91 | 91 | 2 | 12 | 91 | 11 | 2.348 ký tự | NOT_CHECKED |
| pt | 91 | 91 | 91 | 2 | 12 | 91 | 0 | 1.562 từ | probe 0 (Bồ Đào Nha) |
| ko | 91 | 91 | 91 | 2 | 12 | 91 | 23 | 1.011 từ³ | 2/91 |
| ja | 91 | 91 | 91 | 2 | 12 | 91 | 29 | 3.180 ký tự | 3/91 |

³ Tiếng Hàn được đếm theo cụm cách bằng khoảng trắng, nên con số thấp hơn các ngôn ngữ khác. Đây không phải dấu hiệu thin content.

- **Hreflang:** 21 trang là bản dịch thật (`/` với x-default, 10 trang chủ ngôn ngữ, 10 checklist), tất cả hai chiều và mã hợp lệ (zh-CN khớp nội dung giản thể). **120 trang là ứng viên tương đương** (12 slot chủ đề có ở cả 10 ngôn ngữ, cùng cluster và silo): 60 STRONG (S01–S04, S06, S08, trung vị Jaccard nguồn chung 0,67–1,0) và 60 TOPIC_ONLY (H01–H04, S05, S07). **938 trang còn lại** được viết riêng cho từng ngôn ngữ và xếp loại NO_EQUIVALENT_BY_DESIGN. Không trang nào trong số này bị coi là lỗi. Không ghép hreflang chỉ để đủ số lượng: cụm nào được nối hreflang phải do biên tập viên quyết định (nhiệm vụ TECH-10).
- **Ngôn ngữ nội dung:** `language-audit` PASS trên 1.081 trang. Không trang nào sai hoặc trộn ngôn ngữ ở thân bài (nguồn tiếng Việt được trích nguyên tiêu đề, đây là cách trích dẫn đúng). Không có trùng lặp xuyên ngôn ngữ: các bài được viết bản địa, cả những cụm dùng chung nguồn.
- **Giao diện (mới):** 3 chuỗi template là tiếng Anh trên mọi trang không phải tiếng Anh: "Skip to content" (977 trang), `aria-label="Breadcrumb"` (977), "Estimated reading time" (968). Screen reader đọc các chuỗi này bằng âm vị của ngôn ngữ trang (WCAG 3.1.2). Nhãn của menu ngôn ngữ đã được dịch, nên có sẵn bảng dịch để dùng lại.
- **URL:** Slug được bản địa hóa (vi không dấu; zh pinyin; ko và ja romanized). Tuy vậy 11 slug zh, 23 slug ko và 29 slug ja là tiếng Anh hoặc lẫn tiếng Anh, ví dụ `/ko/guides/horn-rules-motorbike-vietnam/`. Các phân đoạn `/guides/`, `/topics/`, `/checklist/` là tiếng Anh ở mọi ngôn ngữ. **Không đổi URL đang live:** URL đã bị đóng băng và GitHub Pages không trả được 301. Chỉ cần quy ước cho URL tương lai (`S-URL-LOCALIZATION`).
- **Chuyển ngôn ngữ, sitemap:** Bộ chuyển ngôn ngữ dùng link HTML thật, `hreflang` trên link khớp ngôn ngữ đích. Mỗi ngôn ngữ có shard sitemap riêng.
- **Độ phủ:** DE có 249 URL, khoảng 2,7 lần các ngôn ngữ khác (86–101). Lệch này được giữ nguyên vì chỉ thị SEO-only không cho viết bài mới (`S-LOCALE-IMBALANCE`, chờ chủ sở hữu). Mỗi ngôn ngữ đều đủ 4 Hub và 8 bài khởi đầu.

---

## 6. Nội dung, từ khóa và topical authority (Phase 4)

### 6.1 Ý định tìm kiếm và từ khóa

- **Từ khóa thương mại chính:** 10/10 Pillar có head term của thị trường trong primary query, title và H1 (`data/seo/commercial-head-terms.json`). Theo chỉ thị 28/10/2026, /global cạnh tranh độc lập và không nhường từ khóa cho tên miền nào. Để không cạnh tranh sai ý định, /global không có đặt xe, giá riêng hay NAP (cờ doanh nghiệp vẫn tắt). Vì vậy Pillar và Hub nhắm ý định *commercial investigation*: cách chọn cửa hàng và xe, cọc, giấy tờ, bước kiểm tra. Bài Supporting nhắm ý định *informational*.
- **Dữ liệu mới:** "motorbike rental hanoi" có **2.900 lượt/tháng trên toàn cầu**, tăng từ 1.900 (06–07/2026) lên 2.400 (08) và 2.900 (09/2026); CPC 0,32 USD. Trong khi đó chỉ có 110/tháng ở Mỹ. Trang EN nên được đánh giá theo nhu cầu toàn cầu, không theo riêng thị trường Mỹ. Tại Bồ Đào Nha, "alugar moto hanoi" có volume 0.
- **Độ phủ query trên trang:** trung vị độ phủ token của primary query trong đoạn mở đầu là 0,6 (Supporting) và 0,635 (Hub). Trong H2 là 0,33 và 0,4. Có 332 bài Supporting mà đoạn mở đầu chứa dưới một nửa token của query. Đây là tín hiệu tham khảo (INFERRED), không phải lỗi: các lần sửa trước đã căn title và H1 theo query.
- **Cannibalization:** 0 cặp URL có phần đặc trưng của primary query trùng ≥ 0,8. 284 cặp chỉ trùng các từ chung như "Vietnam", "motorbike", "rules"; chủ thể khác nhau (còi và xi nhan, trẻ em và chó). 33 cặp tiêu đề tương tự đã được thẩm định trước đó. 34 cặp REVIEW trong content graph chỉ liên quan tới ứng viên chưa xuất bản.
- **Trùng lặp nội dung:** 0 cặp trùng lặp gần trong cùng ngôn ngữ. Độ chứa shingle 5 từ cao nhất là 0,254 (8 ký tự với zh/ja).

### 6.2 Topical authority và liên kết nội bộ

- **Kiến trúc:** Pillar → 4 Hub mỗi ngôn ngữ (chọn xe, giấy tờ và hợp đồng, giá và cọc, an toàn và hỗ trợ) → 330 silo (chỉ là section, không phải URL) → Supporting. Sáu domain mới đang ARCHITECTURE_BLOCKED (690 ứng viên). PR #118 không được merge khi đang ở chế độ SEO-only.
- **Liên kết nội bộ:** mọi Hub link tới toàn bộ bài con và bài con link ngược lại. PageRank nội bộ: Pillar chiếm ưu thế (≈ 30‰ mỗi ngôn ngữ), sau đó là checklist và 4 Hub (≈ 2–3‰). Hub giá và cọc (H02) đứng thấp nhất trong 4 Hub ở mọi ngôn ngữ (hạng 9–17 trong ngôn ngữ, các Hub khác hạng 3–10), dù đây là Hub thương mại nhất. Có thể thêm link ngữ cảnh từ các bài về chi phí tới H02 (khuyến nghị, không phải lỗi).

### 6.3 Độ mới và độ chính xác

- **Văn bản pháp luật:** 0 trang trích Nghị định 100/2019, Nghị định 123/2021, Luật Giao thông đường bộ 23/2008 hay Thông tư 12/2017/TT-BGTVT. 51 trang nhắc A1 ≤ 175 cm³ hoặc Thông tư 12/2025/TT-BCA. Đã đọc từng câu: tất cả trình bày đúng là quy định cũ hoặc chuyển tiếp (Điều 89 Luật 36/2024/QH15) và đều nêu văn bản thay thế (Thông tư 108/2026/TT-BCA, hiệu lực từ 01/07/2026). 34 trang nhắc giấy phép quốc tế theo Công ước 1949; đã đọc từng câu: tất cả nhất quán rằng Việt Nam chỉ công nhận giấy phép theo Công ước Vienna 1968, ngoại lệ là Hàn Quốc theo hiệp định song phương 2023.
- **Giá bên thứ ba:** 116/177 đoạn VERIFIED, 18 PARTIAL. 2 đoạn NOT_FOUND là do trình kiểm tra tự động gán nhầm nguồn, đã xác minh tay ngày 28/10. 41 đoạn UNREACHABLE (403 từ thuvienphapluat.vn). `fact-guard` vẫn giữ cảnh báo có chủ đích cho 95 bài có giá.

### 6.4 E-E-A-T, AEO/GEO và CTR

- **E-E-A-T:** tác giả là tổ chức. Ghi chú trung thực "AI-assisted, not reviewed by a human editor" có trên mọi bài. Có trang About và Contact. Trung vị 4 nguồn mỗi bài (DE: 8). 63 bài không có nguồn thuộc tên miền chính phủ (đã thẩm định). **Hai điểm yếu mới:** (1) không trang nào hiển thị ngày; (2) trang About hứa in ngày kiểm tra nguồn nhưng các bài không in.
- **AEO/GEO:** FAQ hiển thị cùng FAQPage trên 1.074 trang. Mỗi bài có đoạn mở đầu trả lời ngay, mục lục và danh sách nguồn. 4 câu hỏi FAQ trùng nguyên văn trên 2 trang mỗi câu, ví dụ "Does this apply to electric scooters?". Trong SERP đo ngày 28/10, AI Overview xuất hiện ở 7/9 thị trường. Khả năng được AI trích dẫn: NOT_CONNECTED.
- **CTR:** title nằm trong độ rộng hiển thị. og:image riêng cho từng bài (1.064 ảnh bìa 1200×675). Description CJK nằm trong khoảng đã chấp nhận.

### 6.5 Off-page

DA 3, 58 backlink, 53 referring domain, 0 từ khóa (INFERRED, Ubersuggest 01/11). Kế hoạch hợp lệ (không mua link, không PBN) có sẵn trong [`COMPETITOR-GAP-AND-OFFPAGE-PLAN.md`](COMPETITOR-GAP-AND-OFFPAGE-PLAN.md). Việc triển khai cần tài khoản thật của chủ sở hữu.

---

## 7. Master SEO Matrix và Excel (Phase 5–6)

| # | Sheet | Thay đổi trong lần này |
|---|---|---|
| 1 | EXECUTIVE DASHBOARD | Thêm KPI tái kiểm toán (độ sâu click, ngày hiển thị, ứng viên hreflang, chuỗi EN, axe, ảnh lazy, W3C), KPI "chờ chủ sở hữu", nguồn dữ liệu mới, CWV lab có cột Lighthouse. KPI live hiện 1.079 (bản trước hiển thị 0 vì run live khi đó ứng với commit khác) |
| 2 | MASTER URL INVENTORY | 2.152 dòng, 66 cột. Cột mới: `click_depth`, `internal_pagerank`, `visible_date`, `hreflang_class`, `slug_class`, `near_dup_containment`, `a11y_violations`, `lazy_image_first_viewport` |
| 3 | 10 LANGUAGE MATRIX | Thêm số trang có chuỗi EN, slug EN/lẫn, ứng viên hreflang, trang lỗi a11y, trang có ảnh lazy, độ sâu tối đa |
| 4 | TECHNICAL SEO | 45 cột: phần tử LCP mobile/desktop, ảnh lazy trong màn hình đầu, vi phạm axe và mục cần xem xét, tràn ngang, console/4xx, W3C, kiểm tra og:image, link không chuẩn, link ngoài |
| 5 | HREFLANG & CANONICAL | `equivalence_class` có thêm loại EQUIVALENT_CANDIDATE kèm bằng chứng |
| 6 | CONTENT AUDIT | Ngày hiển thị, số nguồn có ngày kiểm tra, trang giống nhất và điểm trùng, độ mới pháp lý, độ phủ query trong mở đầu và H2, số câu FAQ |
| 7 | KEYWORD MATRIX | Thêm dữ liệu thị trường 01/11 (head term EN toàn cầu, probe PT) |
| 8–11 | TOPICAL AUTHORITY, INTERNAL LINK MATRIX, SCHEMA & AEO GEO, INDEXING & SITEMAPS | Thêm độ sâu click (toàn bộ link và link trong `<main>`), PageRank và hạng trong ngôn ngữ, độ nhất quán ngày JSON-LD và sitemap, `lastmod = dateModified` |
| 12 | ERRORS & BLOCKERS | 767 lỗi. Trạng thái lấy từ ledger (baseline) hoặc là OPEN/OWNER_DECISION (lỗi mới) |
| 13 | SEO ACTION PLAN | 76 nhiệm vụ. Việc còn lại xếp trước (P1 chờ chủ sở hữu, rồi P2/P3 đang mở), việc đã xong xếp cuối |
| 14 | AUDIT CHANGELOG | Thêm các dòng ngày 01/11: tái kiểm toán, 2 run live, audit sâu, audit trình duyệt, W3C, Lighthouse, độ hiển thị, từ khóa, nguồn dữ liệu |
| + | README & LEGEND, LISTS, IMAGE SEO MATRIX, CONTENT SEO MATRIX, SEO TASK BOARD | Hướng dẫn, danh sách giá trị và 3 sheet A–Z (task board có 8 nhiệm vụ TODO mới) |

Kiểm tra workbook: mở và tính lại bằng LibreOffice, **219 công thức, 0 lỗi**. 0 `finding_id`, `task_id` hay `audit_id` bị trùng. Mọi lỗi đều gắn với một nhiệm vụ và mọi nhiệm vụ đều có lỗi. 17 bảng với tiêu đề cột duy nhất. Freeze pane, bộ lọc, màu theo mức ưu tiên và theo trạng thái bằng chứng, dropdown trạng thái và hyperlink được giữ nguyên sau khi tính lại. `check_owner_strategy.py` (CI) PASS: 16 + 3 sheet, không khuyến nghị nhường từ khóa.

---

## 8. Kế hoạch SEO A–Z (Phase 7)

Thứ tự: P0 → P1 → P2 → P3, sau đó theo công sức (S → L). Chi tiết từng nhiệm vụ (kết quả mong đợi, cách kiểm tra, điều kiện hoàn thành, phụ trách) nằm trong sheet **SEO ACTION PLAN**. Các nhiệm vụ thực thi được trong repo đã được đưa vào [`docs/seo-matrix/TASKS.json`](../seo-matrix/TASKS.json) theo thứ tự của chương trình: ảnh → nội dung → kỹ thuật.

### 8.1 Cần xử lý ngay

| # | Nhiệm vụ | Mức | Phụ trách | Kết quả mong đợi | Cách kiểm tra | Hoàn thành khi |
|---|---|---|---|---|---|---|
| 1 | Kết nối Search Console, gửi sitemap (`T-S-GSC-NOT-CONNECTED`) | P1 | Chủ sở hữu | Đo được index, query, CWV field | Báo cáo Pages và Performance | Property đã xác minh, sitemap xử lý không lỗi, baseline coverage được lưu vào workbook |
| 2 | Đo index theo ngôn ngữ và Hub, xử lý rủi ro scaled content (`T-S-SCALED-CONTENT-RISK`) | P1 | Chủ sở hữu + biên tập | Biết tỷ lệ index; ưu tiên nâng chất lượng cụm không được index | GSC Pages theo thư mục ngôn ngữ | Có baseline; mỗi cụm không được index có kế hoạch: người kiểm tra sự thật cho bài luật/phạt/bảo hiểm/giá, bổ sung trải nghiệm thật, gộp bài chồng lấn chỉ qua kế hoạch redirect đã duyệt |
| 3 | Uy tín ngoài trang (`T-S-LOW-VISIBILITY`) | P1 | Chủ sở hữu | Referring domain tăng hằng tháng, từ khóa đầu tiên xuất hiện | Ubersuggest/GSC hằng tháng | Xu hướng được ghi vào AUDIT CHANGELOG |
| 4 | Dịch 3 chuỗi giao diện; bỏ `aria-label` trên `<span>`; nhãn hero (TECH-08: `T-S-UI-UNTRANSLATED`, `T-S-ARIA-LABEL-SPAN`, `T-S-HERO-ART-TEXT`) | P2 | `scripts/navigation.mjs`, `scripts/ultra.mjs` | 0 chuỗi EN trên trang không phải EN; 0 cảnh báo W3C | `deep_audit.py` (`ui_leak_pages` = 0); W3C validator | PR đã review được merge; build --check, nav-qa, language-audit, tests PASS; live markup QA khớp |
| 5 | Ảnh bìa trong màn hình đầu: `loading="eager"` và `fetchpriority="high"` (IMG-LCP: `T-S-LAZY-LCP`) | P2 | `scripts/articles.mjs` | LCP không còn chờ ảnh lazy | `site_browser_audit.cjs` (`lazy_first_viewport` = 0); Lighthouse `lcp-lazy-loaded` đạt | PR merge; cập nhật test `seo-az` (hiện yêu cầu ảnh bìa lazy); Lighthouse chạy lại |
| 6 | In ngày đăng/cập nhật bằng `<time>` (CONTENT-03: `T-S-NO-VISIBLE-DATE`) | P2 | Template bài viết | Ngày hiển thị = JSON-LD = sitemap lastmod | `deep_audit.py` (`visible_date`) | PR merge; 1.074 trang có ngày; không ngày nào bị đặt ra hoặc bị đẩy lên |
| 7 | In ngày kiểm tra của từng nguồn (CONTENT-04: `T-S-REF-DATES-HIDDEN`) | P2 | Danh sách nguồn | Lời hứa trên trang About đúng trên mọi bài | `deep_audit.py` (`refs_checked_on_rendered` = `packet_sources_checked_on`) | PR merge; live QA khớp |

### 8.2 Tối ưu theo từng URL

Lọc MASTER URL INVENTORY theo `top_severity`, `finding_ids` và `task_ids` để có danh sách sửa cho từng URL. Lọc TECHNICAL SEO với `lazy_image_first_viewport = YES` để có danh sách ảnh cần sửa. Lọc CONTENT AUDIT theo `legal_freshness` và `near_dup_url` để rà nội dung, và HREFLANG & CANONICAL với `equivalence_class` bắt đầu bằng `EQUIVALENT_CANDIDATE` để lấy 120 URL cần biên tập viên quyết định.

### 8.3 Kế hoạch theo mảng

| Mảng | Nội dung (task ID) | Thứ tự |
|---|---|---|
| **Technical** | IMG-LCP; TECH-11 gộp CSS và bỏ rule không dùng (`T-S-RENDER-BLOCKING-CSS`); IMG-SRCSET thêm cỡ ảnh 800w/960w (`T-S-COVER-SRCSET`); header bảo mật cần chủ sở hữu quyết định (`T-S-SECURITY-HEADERS`) | P2 → P3 |
| **On-page** | Giữ title và description đang đạt chuẩn. Viết lại 4 câu FAQ trùng thành câu tự đủ nghĩa (CONTENT-05: `T-U-FAQ-REPEATED-Q-*`). Khi sửa nội dung, đưa query vào đoạn mở đầu ở những bài độ phủ thấp, nhưng không nhồi từ khóa | P3 |
| **Nội dung** | CONTENT-03 (ngày), CONTENT-04 (ngày kiểm tra nguồn). Dispatch `source-recheck.yml` mỗi tháng. Cần người kiểm tra sự thật cho bài luật và giá (chủ sở hữu, mục 2) | P2 |
| **Internal linking** | Thêm link ngữ cảnh tới Hub giá/cọc H02 từ các bài về chi phí (tùy chọn). Giữ link hai chiều Hub↔bài con. Không dùng anchor exact-match lặp lại | P3 |
| **Topical authority** | Giữ nguyên 4 Hub. 6 domain mới và PR #118 chờ chủ sở hữu (không làm khi đang SEO-only). Ứng viên PROPOSED/IDEA giữ ở hàng đợi | Chờ |
| **Cân bằng 10 ngôn ngữ** | Dịch chuỗi giao diện (TECH-08). Quyết định hreflang cho 12 cụm (TECH-10). Quy ước slug cho URL tương lai (`T-S-URL-LOCALIZATION`). Khi được phép viết bài lại: ưu tiên es, vi, nl, zh, pt, ko, ja (`T-S-LOCALE-IMBALANCE`) | P2 → P3 |
| **Off-page** | Theo `COMPETITOR-GAP-AND-OFFPAGE-PLAN.md`: tài nguyên du lịch, cộng đồng, đối tác có thật. Không mua link, không PBN | Chủ sở hữu |
| **AEO/GEO** | Giữ đoạn trả lời ngay, FAQ có nguồn. Thêm ngày hiển thị (CONTENT-03), vì câu trả lời có ngày dễ được trích dẫn hơn. Chỉ theo dõi AI visibility khi chủ sở hữu duyệt chi phí | P2 |
| **E-E-A-T** | Ngày hiển thị, ngày kiểm tra nguồn, người kiểm tra sự thật có tên thật khi có (không bịa tác giả). Giữ ghi chú provenance | P2 |

### 8.4 Theo dõi và tái kiểm toán

- **Sau mỗi PR sửa lỗi:** QA → merge → deploy → `live-markup-qa.yml` và `post-publish-qa.yml` → chuyển task sang LIVE_VERIFIED trong `TASKS.json` → chạy lại `az_matrix.py`.
- **Hằng tuần (khi đã có GSC):** coverage và performance theo ngôn ngữ.
- **Mỗi 2 tuần (lần tới: 15/11/2026):** `collect.py` → `deep_audit.py` → audit trình duyệt, W3C, Lighthouse → `analyze.py` → `ledger.py` → `az_matrix.py` → `build_workbook.py --carry` → LibreOffice tính lại → thêm dòng AUDIT CHANGELOG.
- **Hằng tháng:** `source-recheck.yml`, `reference-link-check.yml`, volume từ khóa (khi có credit), backlink và referring domain.
- **Ngưỡng cảnh báo:** xuất hiện P0; live markup QA có trang lệch; `seo-guard` hoặc `fact-guard` FAIL; axe có vi phạm; W3C có lỗi; trang tràn ngang; URL dự kiến bị lộ; liên kết nguồn chết.

---

## 9. Đã kiểm chứng và chưa kiểm chứng

**Đã kiểm chứng (VERIFIED)**
- 1.079/1.079 URL: HTTP 200 live, HTML giống từng byte, self-canonical, indexable, có trong sitemap, đã đóng băng. Redirect và header ở mức host. Route lạ trả 404. `/search/` noindex.
- Toàn bộ 1.081 trang: 0 lỗi W3C, 0 vi phạm axe A/AA (390 px), 0 tràn ngang, 0 lỗi console. 127 trang mẫu ở desktop cho kết quả tương tự.
- Độ sâu click ≤ 3, 0 trang mồ côi, 0 link hỏng hoặc không chuẩn, 26.497 link ngoài có `rel` an toàn. REFLINK_SHORT.
- JSON-LD: 1.079 graph hợp lệ, ngày nhất quán, FAQPage khớp nội dung hiển thị.
- 0 trang trùng lặp gần. 0 cặp primary query trùng ý định. Tham chiếu pháp lý đúng hiện hành (51 câu đã đọc tay). Giá: 116 đoạn VERIFIED.
- Các lỗi mới: chuỗi EN (977 trang), không hiển thị ngày (1.074), ngày nguồn không in (5.629 nguồn), ảnh bìa lazy làm LCP (mẫu), FAQ trùng (8 trang), slug tiếng Anh hoặc lẫn (64: zh 11, ko 23, ja 29, vi 1), header.
- Lighthouse lab (15 URL × 2) và tương phản màu (6 template).

**Suy luận, cần xác nhận (INFERRED)**
- Rủi ro scaled content và việc index. Ứng viên hreflang tương đương (cần biên tập viên). Độ phủ query trong đoạn mở đầu. Độ hiển thị và backlink (Ubersuggest). Các phát hiện heuristic cũ (title tương tự, nguồn không thuộc chính phủ, anchor).

**Chưa kiểm tra (NOT_CHECKED)**
- Desktop cho 954 bài Supporting không nằm trong mẫu (cùng template với mẫu). Lighthouse cho các URL ngoài mẫu.
- Volume từ khóa nl, zh và phần lớn pt, de, es. Thứ hạng thật.
- Người đọc lại toàn bộ nội dung để kiểm tra sự thật.
- Nội dung của 41 nguồn giá bị chặn 403 (đã kiểm tay một phần ngày 28/10).
- Trùng lặp với website bên ngoài (kể cả các site cùng chủ sở hữu): container không truy cập được các host đó và không có công cụ còn credit.
- Chất lượng từng backlink (58 backlink): hết lượt tra cứu Ubersuggest trong ngày.

**Chưa kết nối (NOT_CONNECTED)**
- Google Search Console (index, query, CTR, crawl stats), GA4, CrUX/INP field, theo dõi thứ hạng, theo dõi AI citation. GitHub Pages không cung cấp log truy cập, nên không phân tích được log bot.

---

## 10. An toàn và QA của lần kiểm toán này

- **Không sửa production:** diff so với `main` chỉ gồm `docs/seo-audit/`, `docs/seo-matrix/` và `reports/seo/`. Không đụng tới HTML site, Matrix sản xuất, claims, sitemap, canonical, hreflang, CNAME, NAP, giá hay dữ liệu doanh nghiệp.
- **QA trên branch:** `node --test tests/*.test.mjs`: 352 pass, 0 fail, 1 skip. `build.mjs --check`: 1.108 file khớp. `seo-guard`, `fact-guard`, `content-graph --check`, `nav-qa`, `validate-plan`, `check_owner_strategy.py`, `az_matrix.py --check`: tất cả PASS.
- **Workflow đã dispatch** (đều chỉ có quyền `contents: read`): `live-markup-qa.yml`, `post-publish-qa.yml`, `source-recheck.yml`, `reference-link-check.yml`.
- PR kiểm toán dùng để lưu lịch sử và đối chiếu. Không tự merge.

## OWNER_ACTIONS_LAST

Nguồn: [`OWNER-ACTIONS.md`](OWNER-ACTIONS.md).

1. Dữ liệu Google Search Console cho global.rentbikehanoi.com
2. Analytics (GA4 hoặc không dùng)
3. Link off-page từ tài khoản thật (DA 3 / 53 RD, 0 từ khóa)
4. Volume từ khóa es, zh, pt, nl và biến thể ko/ja; theo dõi thứ hạng
5. Xung đột dữ liệu doanh nghiệp C1–C3
6. Người biên tập hoặc kiểm tra sự thật có tên thật (tùy chọn), trước hết cho bài luật, phạt, bảo hiểm và giá
7. Kiến trúc Hub mới và PR #118 (hoãn theo chỉ thị SEO-only)
8. Header phản hồi ngoài mặc định của GitHub Pages (tùy chọn)
9. Quy ước slug cho URL tương lai (khi được phép viết bài lại)
