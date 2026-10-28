# Global SEO A–Z: báo cáo kiểm toán toàn website, 27/10/2026

**Website:** https://global.rentbikehanoi.com · **Repo:** thuexemayhanoi/global · **Phạm vi:** toàn site, 10 ngôn ngữ (vi, en, de, fr, es, nl, zh, pt, ko, ja)
**Trạng thái site được kiểm toán:** `main` @ `5adb7cd` · **Branch kiểm toán:** `audit/seo-az-20261027` · **Ngày dữ liệu:** 27/10/2026 (UTC)

**Sản phẩm bàn giao**

| Tệp | Nội dung |
|---|---|
| [`reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx`](../../reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx) | Master SEO Matrix: 16 sheet (14 sheet bắt buộc, README & LEGEND, LISTS), 2.132 dòng URL, 933 lỗi, 95 nhiệm vụ, 232 công thức, 0 lỗi công thức |
| [`reports/seo/data/audit-master-matrix.csv`](../../reports/seo/data/audit-master-matrix.csv) | Master Matrix kiểm toán ở dạng CSV (riêng, không ghi đè `data/seo/master-matrix.json`) |
| [`reports/seo/data/findings.csv`](../../reports/seo/data/findings.csv), [`tasks.csv`](../../reports/seo/data/tasks.csv), [`locale-matrix.csv`](../../reports/seo/data/locale-matrix.csv) | Lỗi, nhiệm vụ và bảng 10 ngôn ngữ ở dạng CSV |
| [`reports/seo/data/raw/`](../../reports/seo/data/raw/) | Bằng chứng gốc: output của 10 công cụ QA, bằng chứng live, dữ liệu từ khóa |
| [`docs/seo-audit/README.md`](README.md) | Cách dùng, cập nhật và chạy lại kiểm toán |
| [`docs/seo-audit/tools/`](tools/) | `collect.py` → `analyze.py` → `build_workbook.py` (chỉ đọc, không sửa site) |

---

## 1. Tóm tắt điều hành

**Kỹ thuật: tốt. Không có lỗi P0.** 1.079 URL PUBLISHED đều trả HTTP 200 trên production và HTML live khớp từng byte với bản build đã commit (live markup QA, run [40604722403](https://github.com/thuexemayhanoi/global/actions/runs/40604722403)). Tất cả đều self-canonical, indexable, có trong sitemap đúng shard ngôn ngữ và được đóng băng trong `url-freeze.json`. Kết quả đo được trên toàn site: 0 link nội bộ hỏng, 0 title hoặc meta description trùng, 0 trang có số H1 khác 1, 0 lỗi nhảy cấp heading, 0 ID trùng, 0 anchor rỗng, 0 script chặn render trong `<head>`. Hreflang đúng và hai chiều trên 21 trang có bản dịch thật. Toàn bộ 10 công cụ QA của repo đều PASS.

**Vấn đề nằm ở chiến lược, đo lường và độ hiển thị, không nằm ở kỹ thuật:**

1. **(P1) Trang Pillar của từng ngôn ngữ đang nhắm từ khóa thuê xe giao dịch.** Pillar `/vi/` có primary query là "thuê xe máy Hà Nội": 8.100 lượt tìm/tháng tại Việt Nam, intent *commercial*. Pillar `/en/` nhắm "motorbike rental hanoi" (110/tháng tại Mỹ, intent *transactional*). Theo `AGENTS.md`, các từ khóa này thuộc về thuexemaynguyentu.com (vi) và rentbikehanoi.com (en). /global đang cạnh tranh với chính các site cùng hệ thống.
2. **(P2) Anchor thương mại lặp lại trên toàn site.** Khối "Related guides" của 1.054 bài viết đều trỏ về trang chủ ngôn ngữ bằng cùng một anchor giao dịch, ví dụ "thuê xe máy Hà Nội" hay "Motorrad mieten Hanoi". Điều này củng cố vấn đề 1 và đúng là kiểu anchor exact-match bị coi là tối ưu quá mức.
3. **(P1) Không đo được gì từ Google.** Chưa kết nối Search Console và GA4, nên không biết bao nhiêu URL đã được index.
4. **(P1) Độ hiển thị gần như bằng 0 theo dữ liệu bên thứ ba.** Ubersuggest ghi nhận 0 từ khóa xếp hạng, Domain Authority 2, 37 backlink từ 32 domain. Đây là ước tính (INFERRED), cần GSC để xác nhận.
5. **(P2) Phần lớn primary query không có nhu cầu tìm kiếm đo được.** Khi tra dữ liệu thật: VI có 9/91 query có volume, EN 4/97, FR 0/97, KO 2/91, JA 3/91. Matrix chủ yếu là giả thuyết long-tail (`serp_evidence: NOT_VALIDATED`). Long-tail hữu ích cho AEO, nhưng hàng đợi Writer chưa được xếp theo nhu cầu thật.
6. **(P2) Nội dung lệch giữa các ngôn ngữ và lệch chủ đề.** DE có 249 URL, gấp khoảng 2,7 lần các ngôn ngữ khác, trong đó 32 bài so sánh dòng mô tô phân khối lớn (BMW, Triumph, Harley…), liên quan yếu tới chủ đề thuê xe và di chuyển ở Hà Nội. ES ít bài nhất (86).
7. **(P2) Sitemap không có `<lastmod>`** trên cả 1.079 URL.
8. **(P2) 361 cảnh báo giá của bên thứ ba cần kiểm tra lại** trên 95 bài đã xuất bản (fact-guard `THIRD_PARTY_PRICE_REVIEW`).

| KPI (công thức trong sheet EXECUTIVE DASHBOARD) | Giá trị | Bằng chứng |
|---|---:|---|
| URL PUBLISHED | 1.079 | VERIFIED |
| Live HTTP 200 + HTML khớp byte | 1.079 | VERIFIED (run 40604722403) |
| Indexable + self-canonical / trong sitemap / frozen | 1.079 / 1.079 / 1.079 | VERIFIED |
| Hàng IDEA: READY / CLAIMED / SUBMITTED chưa xuất bản | 1.021 / 30 / 0 | VERIFIED |
| Ứng viên chủ đề ARCHITECTURE_BLOCKED (không phải URL) | 690 (69 mỗi ngôn ngữ) | VERIFIED |
| Lỗi: P0 / P1 / P2 / P3 | 0 / 12 / 169 / 752 | — |
| Nhiệm vụ: P1 / P2 / P3 | 3 / 33 / 59 | — |
| Bằng chứng của lỗi: VERIFIED / INFERRED / NOT_CHECKED / NOT_CONNECTED | 369 / 560 / 1 / 3 | — |

---

## 2. Phương pháp và bằng chứng

### 2.1 Nguồn dữ liệu

| Nguồn | Trạng thái | Kết quả |
|---|---|---|
| Bản build đã commit (1.081 trang HTML), Matrix, articles, sitemap, url-freeze, content graph, topical maps, claims ledger, publisher state | VERIFIED | Phân tích từng URL bằng `collect.py` |
| 10 công cụ QA của repo: `build --check`, `seo-guard`, `fact-guard`, `nav-qa`, `validate-plan`, `audit-static`, `audit-ai-search`, `language-audit`, `topical-authority validate`, `content-graph --check` | VERIFIED | Tất cả PASS, 0 FAIL (output trong `reports/seo/data/raw/`) |
| Live Markup QA (GitHub Actions, mọi URL PUBLISHED + `/search/` + `/404.html`) | VERIFIED | [run 40604722403](https://github.com/thuexemayhanoi/global/actions/runs/40604722403) success @ `5adb7cd`: HTTP 200, HTML giống từng byte |
| Post-Publish Live HTTP QA (status, lang, canonical, sitemap so với Matrix, robots, route lạ trả 404, `/search/` noindex, fingerprint, NAP) | VERIFIED | [run 40604724823](https://github.com/thuexemayhanoi/global/actions/runs/40604724823) success |
| Crawl ngoài bằng OpenSEO (giới hạn gói: 50 trang) | VERIFIED (mẫu) | 50/50 trả 200, indexable, có trong sitemap; 2 lỗi mức info (title dài). Lighthouse lỗi 8/8 |
| PageSpeed (lab, trang chủ, Ubersuggest) | VERIFIED (lab) | Mobile: LCP 1,7 s, CLS 0, TBT 14 ms, Speed Index 4,3 s. Desktop: LCP 0,53 s. Gợi ý: một redirect tốn khoảng 630 ms |
| Volume từ khóa (OpenSEO / DataForSEO) | VERIFIED | vi, en, fr, ko, ja: toàn bộ query đã xuất bản. de, es: Pillar/Hub + head term. nl, pt, zh: NOT_CHECKED (hết credit; zh không có thị trường Google phù hợp) |
| Backlink / DA (Ubersuggest) | INFERRED | DA 2, 37 backlink, 32 referring domain, 0 từ khóa xếp hạng |
| Google Search Console, GA4, CrUX, theo dõi thứ hạng, AI visibility | NOT_CONNECTED | Không có property hay tracker nào được kết nối |

### 2.2 Giới hạn của lần kiểm toán (không tuyên bố đã kiểm toán 100%)

- **Container kiểm toán không truy cập trực tiếp được global.rentbikehanoi.com** (network policy của môi trường trả 403). Vì vậy dữ liệu live lấy qua GitHub Actions và crawler bên ngoài. Các mục chưa kiểm tra: redirect http→https, www, URL không có dấu `/` cuối, và response header (HSTS, cache, content-type). Ghi là NOT_CHECKED (lỗi `S-REDIRECT-HEADERS`).
- Firecrawl và OpenRush hết credit. OpenSEO hết credit sau khi tra DE/ES.
- Độ chính xác về nội dung (luật, mức phạt, giá) **không được người kiểm tra lại** trong lần này. Audit chỉ đo cấu trúc, nguồn dẫn và các cờ của fact-guard.
- Phát hiện cannibalization dựa trên chồng lấp query của content graph và độ tương đồng trigram của tiêu đề, là phép đo từ vựng. Kết luận cuối cùng cần biên tập viên xác nhận.

---

## 3. Kiểm kê URL (Phase 1)

Đã đối chiếu năm nguồn: Matrix, HTML đã build, sitemap index và 11 shard, url-freeze, và đồ thị link nội bộ.

| | Tổng | vi | en | de | fr | es | nl | zh | pt | ko | ja | root |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| PUBLISHED | 1.079 | 91 | 101¹ | 249 | 96 | 86 | 91 | 91 | 91 | 91 | 91 | 1 |
| IDEA → READY | 1.021 | 123 | 102 | 87 | 101 | 101 | 101 | 101 | 101 | 102 | 102 | — |
| IDEA → CLAIMED | 30 | — | — | 30 | — | — | — | — | — | — | — | — |

¹ Gồm 4 trang tiện ích `/about/`, `/contact/`, `/privacy/`, `/terms/` (locale `en` trong Matrix).

- `/search/` và `/404.html` là trang `noindex,follow` theo thiết kế, không có trong sitemap. Kết luận: đúng.
- **Không có trang thiếu, trang trùng, trang orphan hay trang sai trạng thái.** Mọi URL PUBLISHED đều có trang HTML, có mặt đúng một lần trong sitemap và có link vào. Không URL IDEA nào có trang, có trong sitemap, có hreflang hay có link (1.051/1.051 PASS trong sheet INDEXING & SITEMAPS).
- Claims ledger: 1.054 SUBMITTED (đều đã live và qua Live QA), 30 CLAIMED (DE), 40 RELEASED. Publisher: stage CONTINUOUS, không bị pause, 560 lần chạy sạch.

---

## 4. Technical SEO (Phase 2)

| Hạng mục | Kết quả | Mức |
|---|---|---|
| HTTP status, SSL, robots.txt | 1.079 × 200 (live). robots: `Allow: /` + sitemap index. Route lạ trả 404 thật (post-publish QA) | OK |
| Indexability, canonical | 1.079 self-canonical, `og:url` = canonical, không có noindex nhầm | OK |
| Redirect, chuỗi redirect | Không có URL nội bộ nào redirect. Biến thể http/www/không có `/` chưa đo được | NOT_CHECKED |
| Title / meta / heading | 0 trùng, H1 = 1 trên mọi trang, 0 nhảy cấp heading. **55 title** và **241 meta description** có thể bị cắt trên SERP (tính theo độ rộng hiển thị, ký tự CJK/Hangul tính gấp đôi), tập trung ở ja/ko/zh. 8 description quá ngắn | P3 (INFERRED) |
| Link nội bộ | 0 link hỏng. Mọi Hub/Supporting có link hai chiều với trang cha. 197 cảnh báo `ANCHOR_DIVERSITY`. Anchor thương mại trên toàn site trong khối related | P2 / P3 |
| Structured data | 1.079 graph JSON-LD hợp lệ, `inLanguage` đúng, có BreadcrumbList. Article **không có `image`**. Không có FAQPage. Không có schema LocalBusiness (đúng chủ trương) | P3 |
| Hình ảnh | 45 `<img>` (trang chủ, Pillar). Tất cả có thuộc tính alt; 44 alt rỗng là ảnh trang trí đi kèm tiêu đề dạng chữ. Có width/height, lazy, WebP. **Mọi trang dùng chung một `og:image`** | P3 |
| Core Web Vitals | Lab: mobile LCP 1,7 s, CLS 0, TBT 14 ms (đạt), Speed Index 4,3 s (chưa đạt ≤ 3,4 s). Chưa có dữ liệu field (CrUX, INP) | P3 / NOT_CONNECTED |
| Accessibility / HTML | `lang` đúng, có skip link, 1 `<main>`, 0 ID trùng, 0 nút không có tên, 0 anchor rỗng | OK |
| Thin content / soft 404 | 0 trang dưới 50% trung vị của cùng ngôn ngữ và vai trò. Không có soft 404 (route lạ trả 404 thật) | OK |
| Crawl budget / sitemap | Sitemap index gồm 11 shard, 0 URL trùng, 0 URL chưa xuất bản. **Không có `<lastmod>`** | P2 |

---

## 5. SEO đa ngôn ngữ (Phase 3)

| Locale | URL | Hub | Supporting | READY | `html lang` đúng | Self-canonical | Trang có hreflang | Trung vị độ dài | Title dài | Description dài | Volume từ khóa |
|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---|
| vi | 91 | 4 | 86 | 123 | 91 | 91 | 2 | 1.736 từ | 0 | 0 | 9/91 có volume |
| en | 101 | 4 | 92 | 102 | 101 | 101 | 2 | 1.282 từ | 0 | 0 | 4/97 |
| de | 249 | 4 | 244 | 87 | 249 | 249 | 2 | 1.795 từ | 8 | 1 | 4/13 (một phần) |
| fr | 96 | 4 | 91 | 101 | 96 | 96 | 2 | 1.401 từ | 0 | 0 | 0/97 |
| es | 86 | 4 | 81 | 101 | 86 | 86 | 2 | 1.443 từ | 0 | 0 | 2/9 (một phần) |
| nl | 91 | 4 | 86 | 101 | 91 | 91 | 2 | 1.313 từ | 0 | 0 | NOT_CHECKED |
| zh | 91 | 4 | 86 | 101 | 91 | 91 | 2 | 2.203 ký tự | 4 | 68 | NOT_CHECKED |
| pt | 91 | 4 | 86 | 101 | 91 | 91 | 2 | 1.402 từ | 0 | 0 | NOT_CHECKED |
| ko | 91 | 4 | 86 | 102 | 91 | 91 | 2 | 966 từ² | 19 | 85 | 2/91 |
| ja | 91 | 4 | 86 | 102 | 91 | 91 | 2 | 2.920 ký tự | 24 | 87 | 3/91 |

² Tiếng Hàn được đếm theo cụm cách bằng khoảng trắng nên con số thấp hơn các ngôn ngữ khác. Không phải dấu hiệu thin content.

- **`html lang`, canonical, hreflang:** đạt cả 10 ngôn ngữ. Hreflang chỉ đặt giữa các bản dịch thật: `/` (x-default) cùng 10 trang chủ ngôn ngữ và 10 trang checklist, tổng 21 trang, tất cả hai chiều. **1.058 trang còn lại (bài Hub/Supporting và 4 trang tiện ích) được viết riêng cho từng ngôn ngữ**, không phải bản dịch của nhau, nên được xếp loại `NO_EQUIVALENT_BY_DESIGN` và không coi là lỗi. Không ghép hreflang giữa các bài không tương đương.
- **Ngôn ngữ nội dung:** `language-audit` PASS trên 1.081 trang (0 FAIL, 0 WARN). Không có trang nào sai hoặc trộn ngôn ngữ ngoài phần trích nguồn tiếng Việt.
- **Biến thể tiếng Bồ Đào Nha (P3):** thân bài cả 91 trang là pt-PT (vietname, conduzir, travão, telemóvel), nhưng query của Pillar và anchor trong khối related dùng pt-BR ("aluguel de motos Hanói").
- **Cân bằng nội dung (P2):** DE chiếm 23,3% số bài hướng dẫn. Các ngôn ngữ khác từ 8,0% (es) đến 9,0% (en).
- **Trùng lặp xuyên ngôn ngữ:** không có. Các bài được viết bản địa hóa, và `language-audit` xác nhận đúng ngôn ngữ thân bài.

---

## 6. Nội dung, từ khóa và topical authority (Phase 4)

- **Kiến trúc:** Entity Hub (Pillar) → 4 Hub mỗi ngôn ngữ (chọn xe, giấy tờ và hợp đồng, giá và cọc, an toàn và hỗ trợ) → 330 silo (chỉ là section, không phải URL) → Supporting. Sáu domain chủ đề mới ở trạng thái ARCHITECTURE_BLOCKED, chờ PR kiến trúc Hub. Mọi Hub link đến toàn bộ bài con; mọi bài con link ngược về Hub.
- **Nguồn dẫn và E-E-A-T:** bài viết có trung vị 4 nguồn (DE: 8). 66 bài không có nguồn thuộc domain chính phủ (theo heuristic, INFERRED). 10 trang checklist không có nguồn nào. Tác giả của mọi Article là Organization, `facts_reviewed_by_human=false`, và điều này được công khai trung thực bằng ghi chú AI-provenance. Không đề xuất tạo tác giả giả.
- **Từ khóa:** chi tiết trong sheet KEYWORD MATRIX (2.130 dòng Matrix) và bảng KEYWORD MARKET DATA. Các query có volume thật đáng chú ý:

  | Thị trường | Từ khóa | Volume/tháng | Intent | Dùng ở |
  |---|---|---:|---|---|
  | VN | thuê xe máy hà nội | 8.100 | commercial | Pillar VI ← **xung đột với site thương mại** |
  | VN | nộp phạt vi phạm giao thông online | 5.400 | transactional | VI-S (bài nộp phạt) |
  | VN | lỗi không xi nhan xe máy phạt bao nhiêu | 590 | informational | VI-S |
  | VN | hiệu lệnh của người điều khiển giao thông | 320 | informational | VI-S |
  | VN | biển báo cấm xe máy / bao nhiêu tuổi được đi xe máy | 260 / 210 | informational | VI-S |
  | US | motorbike rental hanoi | 110 | transactional | Pillar EN ← **xung đột** |
  | DE | motorrad mieten vietnam / hanoi | 140 / 30 | transactional | (Pillar DE: "Motorrad mieten Hanoi") |
  | JP | ベトナム バイク 何歳から | 50 | informational | JA-S |

  Không có volume ở đây nghĩa là cơ sở dữ liệu của công cụ không ghi nhận, không có nghĩa là bằng 0. Không con số nào trong báo cáo là ước đoán.
- **Cannibalization:** content graph có 43 cặp REVIEW (13 URL đã xuất bản có cờ REVIEW, 9 có cờ UPGRADE). Ngoài ra có 33 cặp tiêu đề tương đồng từ 0,5 trở lên trong cùng ngôn ngữ (INFERRED). Cả hai nhóm cần biên tập viên quyết định: phân biệt rõ intent hay gộp bài kèm kế hoạch redirect đã review.
- **Dữ liệu Matrix:** 80 primary query của DE là cả câu hỏi dài hơn 80 ký tự, không dùng được làm từ khóa theo dõi. Pillar được gắn nhãn `informational` trong khi dữ liệu thị trường cho thấy intent thương mại.
- **AEO/GEO:** 444 trang có phần FAQ hiển thị nhưng không có FAQPage (Google hiện chỉ hiển thị FAQ rich result cho site chính phủ và y tế, nên lợi ích chủ yếu là AEO). Bài viết có đoạn lead trả lời ngay, có mục lục và nguồn dẫn. Khả năng được AI trích dẫn: NOT_CONNECTED.

---

## 7. Master SEO Matrix và Excel (Phase 5–6)

`reports/seo/GLOBAL-SEO-AZ-MASTER-MATRIX.xlsx`:

| # | Sheet | Nội dung |
|---|---|---|
| 1 | EXECUTIVE DASHBOARD | 27 KPI (công thức), bảng theo ngôn ngữ, nguồn dữ liệu, CWV lab, 3 biểu đồ |
| 2 | MASTER URL INVENTORY | 2.132 dòng (1.079 PUBLISHED + 1.051 IDEA + 2 noindex), 58 cột, `audit_id` duy nhất, link tới lỗi và nhiệm vụ |
| 3 | 10 LANGUAGE MATRIX | 31 cột; các cột live, open P1–P3 và tỷ lệ là công thức |
| 4 | TECHNICAL SEO | 1.081 URL × 32 chỉ số kỹ thuật |
| 5 | HREFLANG & CANONICAL | 1.079 URL, lớp tương đương, kiểm tra hai chiều, verdict (1.079 PASS) |
| 6 | CONTENT AUDIT | 1.064 bài: độ sâu, nguồn, provenance, cờ giá, graph |
| 7 | KEYWORD MATRIX | 2.130 dòng Matrix + bảng dữ liệu thị trường thật |
| 8 | TOPICAL AUTHORITY | 330 silo, độ phủ, trạng thái blocked |
| 9 | INTERNAL LINK MATRIX | link vào và ra, kiểm tra cha↔con, cảnh báo anchor |
| 10 | SCHEMA & AEO GEO | loại schema, ngày, tác giả, FAQ, nguồn, AI visibility |
| 11 | INDEXING & SITEMAPS | 2.132 dòng, shard, lastmod, kiểm tra rò rỉ URL dự kiến |
| 12 | ERRORS & BLOCKERS | 933 lỗi, `finding_id` duy nhất, bằng chứng, dropdown trạng thái |
| 13 | SEO ACTION PLAN | 95 nhiệm vụ đã xếp thứ tự; cột `open_findings` là công thức |
| 14 | AUDIT CHANGELOG | lần kiểm toán này, các run QA, các audit trước, lần tái kiểm toán đã lên lịch |
| + | README & LEGEND, LISTS | Hướng dẫn và danh sách giá trị cho dropdown |

Mỗi sheet có bảng chuẩn với bộ lọc, cố định tiêu đề, màu theo mức ưu tiên và theo trạng thái bằng chứng, hyperlink tới URL và tới bằng chứng trên GitHub. Workbook đã được LibreOffice tính lại toàn bộ: **232 công thức, 0 lỗi**. Kiểm tra toàn vẹn: 0 `audit_id` trùng, 0 `finding_id` trùng, mọi lỗi đều gắn với một nhiệm vụ. File mở được bằng Microsoft Excel. Các cột màu vàng (trạng thái, người phụ trách, ngày, ghi chú) là cột để nhập; khi build lại với `--carry` sẽ giữ nguyên nội dung đã nhập.

---

## 8. Kế hoạch SEO A–Z (Phase 7)

Thứ tự ưu tiên: P0 → P1 → P2 → P3, sau đó theo công sức (S → L) và số lỗi. Mỗi nhiệm vụ trong sheet SEO ACTION PLAN có đủ bốn mục: *kết quả mong đợi*, *cách kiểm tra*, *điều kiện hoàn thành* và *người/phân hệ phụ trách*.

### 8.1 Cần xử lý ngay (P0: không có, P1: 3 nhiệm vụ)

| # | Nhiệm vụ | Phụ trách | Hoàn thành khi |
|---|---|---|---|
| 1 | **Kết nối Google Search Console** (Domain property `global.rentbikehanoi.com`), submit `sitemap.xml`, kết nối vào OpenSEO | Chủ site | Property đã xác minh, sitemap xử lý không lỗi, lưu báo cáo coverage đầu tiên vào workbook |
| 2 | **Quyết định phân vai giữa các domain cho 10 Pillar** (cùng các Hub chọn xe): chuyển Pillar sang intent thông tin ("cẩm nang/hướng dẫn thuê và đi xe máy"), giữ từ khóa giao dịch cho thuexemaynguyentu.com / rentbikehanoi.com và link sang đó | Chủ site → PR đã review (Matrix + `seo-guard --write`) | Mỗi Pillar nhắm một query thông tin; fingerprint đóng băng được cập nhật trong PR đã review; `seo-guard` PASS |
| 3 | **Lấy baseline độ hiển thị và lên kế hoạch off-page** khi đã có GSC | Chủ site | Baseline GSC được lưu; số referring domain được theo dõi hằng tháng trong AUDIT CHANGELOG |

### 8.2 Tối ưu theo từng URL

Mỗi dòng trong MASTER URL INVENTORY có `finding_ids`, `actions`, `task_ids`, `top_severity` và `owner_subsystem`. Lọc `top_severity = P2` để có danh sách sửa theo URL: 95 bài cần kiểm tra lại giá (`U-PRICE-REVIEW`), 13 bài REVIEW và 9 bài UPGRADE theo content graph. P3 gồm title và description dài (ja/ko/zh), primary query yếu trong title/H1, và trang có ít link vào.

### 8.3 Kế hoạch theo mảng

| Mảng | Nội dung (task ID trong workbook) | Phase |
|---|---|---|
| **Technical** | Thêm `<lastmod>` thật vào sitemap (`T-S-SITEMAP-LASTMOD`). Thêm `image` cho Article JSON-LD (`T-S-ARTICLE-NO-IMAGE`). Dùng `og:image` theo Hub (`T-S-OG-IMAGE-SINGLE`). Tìm redirect 630 ms và giảm Speed Index mobile (`T-S-PSI-MOBILE`). Đo redirect và header từ mạng truy cập được (`T-S-REDIRECT-HEADERS`) | 2–3 |
| **On-page** | Rút ngắn 55 title và 241 description bị cắt, đã nhóm theo ngôn ngữ (`T-U-TITLE-LONG-*`, `T-U-DESC-LONG-*`), chỉ qua PR metadata đã review vì title đã bị đóng băng. Rà 123 trang có primary query yếu trong title/H1 (`T-U-PQ-WEAK-*`) | 3 |
| **Nội dung** | Kiểm tra lại 361 mức giá của bên thứ ba (`T-U-PRICE-REVIEW-*`). Xử lý 13 REVIEW và 9 UPGRADE của content graph. Thêm nguồn chính thức cho 10 checklist. Rà 66 bài không có nguồn chính phủ có nội dung pháp lý. Mọi sửa đổi bài đã live đều qua PR đã review; Auto Publisher không sửa trang đã xuất bản | 2–3 |
| **Internal linking** | Thay anchor giao dịch trong khối related bằng anchor mô tả (`T-S-RAIL-ANCHOR`, sửa một chỗ trong `scripts/premium.mjs`). Đa dạng anchor cho 197 cảnh báo (`T-U-ANCHOR-DIVERSITY-*`). Đưa trang có ít hơn 3 link vào vào các nhóm related | 2–3 |
| **Topical authority** | Sắp xếp IDEA/READY theo nhu cầu thật và khoảng trống chủ đề (`T-S-KW-NO-DEMAND`). Rà 32 bài DE so sánh mô tô phân khối lớn (`T-S-DE-TOPIC-DRIFT`). Hoàn tất PR kiến trúc cho 6 domain đang blocked (cần từ 8 Supporting hợp lệ trở lên mỗi Hub) | 2 |
| **Cân bằng 10 ngôn ngữ** | Ưu tiên claim của Writer cho es, vi, nl, zh, pt, ko, ja. DE đang `RESEARCH_NEEDED`, tạm dừng mở rộng (`T-S-LOCALE-IMBALANCE`). Thống nhất pt-PT (`T-S-PT-VARIANT`). Mục tiêu: mỗi ngôn ngữ nằm trong khoảng ±25% trung vị | 2 |
| **Off-page** | Link từ các bài hướng dẫn liên quan trên site cùng hệ thống, trả lời diễn đàn du lịch, trang tài nguyên. Không dùng link trả tiền hay PBN (`T-S-LOW-VISIBILITY`) | 1–3 |
| **AEO/GEO** | Giữ lead trả lời ngay, có nguồn và ngày. Tùy chọn FAQPage khi Q&A hiển thị khớp hoàn toàn (`T-S-FAQ-SCHEMA`). Theo dõi AI visibility nếu chủ site duyệt chi phí | 3 |
| **E-E-A-T** | Giữ ghi chú provenance trung thực. Bổ sung phương pháp biên tập và chính sách đính chính vào trang About. Chỉ ghi tên người duyệt khi có người duyệt thật (`T-S-AUTHOR-ORG-ONLY`) | 2 |
| **Dữ liệu doanh nghiệp** | Chủ site xử lý các xung đột C1 (giờ mở cửa), C2 (ngưỡng giao xe), C3 (tên GBP) bên ngoài repo. /global vẫn không hiển thị NAP (`T-S-BUSINESS-CONFLICTS`) | 3 |

### 8.4 Theo dõi và tái kiểm toán

- **Hằng tuần:** GSC coverage và hiệu suất (sau khi kết nối); `post-publish-qa.yml` sau các đợt xuất bản lớn.
- **Mỗi 2 tuần (lần tới: 10/11/2026):** chạy lại `collect.py` → `analyze.py` → `build_workbook.py --carry <file cũ>`, recalc, thêm một dòng vào AUDIT CHANGELOG, so sánh KPI.
- **Hằng tháng:** volume từ khóa cho cả 10 thị trường (khi có credit), backlink và referring domain, PageSpeed cho 5 loại template.
- **Ngưỡng cảnh báo:** có P0 bất kỳ; live markup QA mismatch khác 0; URL IDEA bị lộ; `seo-guard` hoặc `fact-guard` FAIL; một ngôn ngữ lệch quá ±25% trung vị.

---

## 9. Đã kiểm chứng và chưa kiểm chứng

**Đã kiểm chứng (VERIFIED)**
- Đủ 1.079 URL PUBLISHED: HTTP 200 live, HTML live khớp từng byte, self-canonical, indexable, có trong sitemap, đã đóng băng.
- Route lạ trả 404; `/search/` noindex; robots.txt đúng; sitemap index và 11 shard khớp Matrix.
- 0 link nội bộ hỏng; link cha↔con hai chiều; hreflang hai chiều trên 21 trang bản dịch thật.
- `html lang` và ngôn ngữ thân bài đúng trên 1.081 trang; 1.079 graph JSON-LD hợp lệ.
- Trạng thái pipeline của từng hàng IDEA (READY, CLAIMED); không URL dự kiến nào bị lộ.
- Volume và intent từ khóa thật cho vi, en, fr, ko, ja (toàn bộ query đã xuất bản), de và es (Pillar/Hub/head term).
- CWV lab của trang chủ; crawl ngoài 50 trang.

**Suy luận, cần xác nhận (INFERRED)**
- Title và description bị cắt (heuristic độ rộng hiển thị); primary query yếu (độ trùng token); cannibalization theo độ tương đồng tiêu đề; phân loại nguồn chính phủ theo domain.
- Độ hiển thị và backlink theo Ubersuggest; mức độ lệch chủ đề của 32 bài DE.

**Chưa kiểm tra (NOT_CHECKED)**
- Redirect http/www/không có `/` và response header (network policy chặn host).
- Volume từ khóa nl, pt, zh và phần còn lại của de, es (hết credit).
- Lighthouse trên nhiều template (công cụ lỗi); độ đúng về nội dung pháp lý và giá (cần người duyệt).

**Chưa kết nối (NOT_CONNECTED)**
- Google Search Console (index, query, CTR), GA4, CrUX/INP field, theo dõi thứ hạng, theo dõi AI citation.

---

## 10. Cam kết an toàn

- Không sửa bài viết, Matrix, claims, sitemap, canonical, hreflang, CNAME, NAP, giá hay dữ liệu doanh nghiệp. Diff so với `main` chỉ gồm `docs/seo-audit/`, `reports/seo/` và một dòng `.gitignore` (bỏ ignore `reports/seo/` để lưu được sản phẩm kiểm toán).
- `node scripts/build.mjs --check`: 1.108 file khớp. Bộ test CI (37 file): 274 pass, 0 fail.
- Hai workflow live đã chạy (`live-markup-qa.yml`, `post-publish-qa.yml`) đều chỉ có quyền `contents: read`.
- PR kiểm toán dùng để lưu lịch sử và đối chiếu; không tự merge.
