# 09 · QA Results

Ngày: 2026-10-20. Nhánh: `seo/v10-global-engine-20261020` trên nền `main` `fc4fbb6c`. Hai vòng QA: baseline trước khi sửa và vòng cuối sau khi sửa và tạo lại toàn bộ HTML.

## 1. Bộ lệnh bắt buộc

| Lệnh | Baseline (`fc4fbb6c`) | Sau sửa (vòng cuối) | Ghi chú |
|---|---|---|---|
| `node scripts/build.mjs` | Generated 954 static files | Generated 954 static files | |
| `node scripts/build.mjs --check` | Verified 954 | Verified 954 | byte-identical với HTML đã commit |
| `node --test tests/*.test.mjs` | 264 pass, 0 fail | **279 test: 278 pass, 0 fail, 1 bỏ qua có chủ ý** | thêm `tests/seo-v10.test.mjs` (9), `tests/hero-perf.test.mjs` (4), `tests/meta-proposals.test.mjs` (2, một test bỏ qua khi chưa có tệp đề xuất) |
| `node scripts/seo/validate-plan.mjs` | SEO MATRIX VALID | SEO MATRIX VALID | 1.781 dòng, 926 published, 855 planned |
| `node scripts/seo/seo-guard.mjs` | PASS, fail 0, warn 69 | PASS, fail 0, warn 159 | warn chỉ là ANCHOR_DIVERSITY (xem 06); 926 URL đóng băng không đổi fingerprint |
| `node scripts/seo/fact-guard.mjs` | PASS, fail 0, warn 709 | PASS, fail 0, warn 709 | không thay đổi; không có NAP, giá hay schema kinh doanh mới |
| `node scripts/seo/content-graph.mjs --check` | CONTENT_GRAPH_VALID | CONTENT_GRAPH_VALID | đã `--write` lại vì cạnh liên kết đổi; 3.526 cạnh |
| `node scripts/nav-qa.mjs` | PASS | PASS | menu và footer byte-identical |
| `node scripts/seo/audit-static.mjs --fail-p0` | P0 0, P1 0, P2 0, P3 0 | P0 0, P1 0, P2 0, P3 0 | |
| `node scripts/seo/topical-authority.mjs validate` | hợp lệ | hợp lệ | 1.844 cảnh báo T4/T8 trên ứng viên, không đổi |
| `node scripts/seo/audit-ai-search.mjs` | 926 schema hợp lệ, 25 trang không có liên kết nguồn | như baseline | 25 trang là gốc, Pillar, checklist, tiện ích |
| `audit-v10` (audit V10 toàn site) | 3.701 lỗi có thể sửa ở generator | 13 còn lại, đều theo thiết kế | xem 02 |

## 2. Sự cố trong quá trình và cách xử lý

| Sự cố | Nguyên nhân | Xử lý |
|---|---|---|
| Vòng QA giữa: 1 test fail "graph and site-matrix report are deterministic and committed in sync" và `content-graph --check` lệch | cạnh liên kết nội bộ đổi sau khi sửa `topicLinks` và thanh liên quan, đồ thị dẫn xuất chưa tạo lại | chạy `content-graph.mjs --write`, rồi `--check` xanh, chạy lại toàn bộ test |
| Vá `articles.mjs` bằng script khớp nhầm vị trí và làm hỏng tệp (SyntaxError) | neo chuỗi trùng với hàm `checkArticle` | `git checkout` tệp, vá lại neo vào `export function renderArticle(` có kiểm tra |
| Audit nội bộ báo nhầm NOT_FROZEN 926 ở vòng đầu | đọc sai khóa của `url-freeze.json` | sửa audit; số liệu trong các tài liệu này là số sau khi sửa |
| ANCHOR_DIVERSITY tăng 69 → 159 | mỗi bài nhận 6 liên kết anh em với anchor là tiêu đề | chấp nhận, ghi nhận trong 06; không chặn |
| Codex review trên PR #79: cửa sổ xoay vòng bỏ rơi bài cùng silo ở cuối silo (ví dụ DE-S96 có 4 bài cùng silo nhưng không trỏ tới bài nào) | thuật toán vòng đầu chỉ xoay theo thứ tự silo | `siblingPlan` theo Hub: cùng silo trước, tỏa đều, cân bằng; đo lại 861 bài: tới 4 đến 7 liên kết, 706 bài đúng 6 (commit `f62b0768`) |
| Codex review: alt ảnh thẻ chủ đề lặp đúng tiêu đề bên cạnh | bản đầu đặt alt bằng tiêu đề thẻ | ảnh trang trí trở lại `alt=""`, chỉ hero có alt mô tả; test cập nhật (commit `f62b0768`) |
| Worker song song bị dừng vì hạn mức phiên (HTTP 429) lúc 20:33 UTC | 7 worker đề xuất tiêu đề và worker QA chưa kịp ghi kết quả | PERF đã commit xong trước đó và được gộp; các worker còn lại được chạy lại sau khi hạn mức mở (mục 5) |

## 3. Test mới

`tests/hero-perf.test.mjs` (4 test, worker PERF): kích thước thật của ba tệp WebP hero khớp `srcset`, `sizes` khớp CSS, trang gốc có đúng một preload trước stylesheet, không trang nào khác hiển thị hero hay preload.

`tests/meta-proposals.test.mjs` (2 test): bộ kiểm tra của `scripts/seo/apply-meta-proposals.mjs` (giới hạn 60 ký tự tiêu đề, 120 đến 155 ký tự mô tả, không bịa số, đề xuất null khi trường đã trong giới hạn) và kiểm tra mọi tệp đề xuất khi có.

`tests/seo-v10.test.mjs` (9 test)

1. Hub: breadcrumb Global › Ngôn ngữ › Hub, 3 mục, không lặp URL, có `<nav class="crumb">` bắt đầu bằng Global.
2. Supporting: breadcrumb 3 mục duy nhất, kết thúc tại chính trang.
3. Mọi Hub và Supporting có `og:site_name`, `og:image`, `twitter:card`, Article có `publisher`, `isPartOf`, `datePublished` đúng bằng `publication.approved_at` (hoặc không có ngày khi không có bản ghi).
4. Liên kết anh em: khối có đúng min(6, n−1) liên kết, không tự trỏ, không lặp, bài cùng silo luôn đứng trước, mỗi bài nhận ít nhất min(6, số bài cùng silo) liên kết tới; in phân bố thực tế vào nhật ký.
5. `topicLinks` đơn vị: 8 bài, 2 silo, thứ tự chính xác, tổng 48 liên kết, tối thiểu 5 liên kết tới mỗi bài.
6. `renderArticle` đơn vị: đường dẫn cho Hub và bài de, ngày, logo, `og:image:width`.
7. Thanh liên quan: bắt đầu tại trang chủ ngôn ngữ, tối đa 5, không lặp, không tự trỏ.
8. Alt ảnh: gốc và 10 trang chủ ngôn ngữ, hero có alt mô tả từ 20 ký tự, mọi ảnh trang trí có `alt=""` và đứng cạnh tiêu đề `<h3>` của nó.
9. `sitemapFilePattern`: nhận `sitemap-vi-10.xml`, `sitemap-de-123.xml`; từ chối `sitemap-xx.xml`, `-1`, `-01`, `.gz`.

## 4. Những gì QA không chứng minh

- Không chứng minh thứ hạng, lập chỉ mục hay lưu lượng.
- Không chứng minh production đã đổi: cần merge, GitHub Pages deploy, rồi `post-publish-qa.yml` và crawler connector chạy lại (xem 10).
- Không kiểm tra nội dung đúng sai về mặt biên tập; đó là việc của G1 đến G5, G7 và fact-guard trên từng bài.

Nhật ký đầy đủ của vòng cuối (có thể tạo lại bằng cách chạy các lệnh trên): kết quả tóm tắt ở bảng 1; nhật ký thô nằm ngoài repo.

## 5. Cập nhật 2026-10-21 (sau khi gộp PR #79, #82, #84, #85; PR #86 mở chờ duyệt — PR #86 đóng ngày 2026-10-25, SUPERSEDED bởi V11)

| Lệnh | `main` `74be8b4d` | Nhánh PR #86 `d1c309b7` | Ghi chú |
|---|---|---|---|
| `node --test tests/*.test.mjs` | 295 test: 294 pass, 0 fail, 1 bỏ qua | 295 test: 295 pass, 0 fail, 0 bỏ qua | thêm `tests/seo-site-qa.test.mjs` (12, worker QA) và `tests/live-markup-qa.test.mjs` (4, PR #84); test bỏ qua trên `main` là kiểm tra tệp đề xuất, tệp này chỉ có trên nhánh PR #86 |
| `node scripts/build.mjs --check`, `seo-guard`, `fact-guard`, `content-graph --check`, `nav-qa`, `validate-plan`, `audit-static --fail-p0`, `apply-meta-proposals.mjs` (dry-run) | không áp dụng cho tệp đề xuất; các lệnh còn lại chạy trong `qa.yml` | xanh tại local trên `d1c309b7`; dry-run 7 tệp, 632 mục, 546 tiêu đề, 622 mô tả, `errors: []` | PR #86 đóng băng lại 632 URL với tiêu đề và mô tả mới, mọi URL khác giữ nguyên fingerprint |

- `qa.yml` chạy thêm `tests/live-markup-qa.test.mjs` từ PR tài liệu này; trước đó tệp test này chỉ chạy khi gọi `node --test tests/*.test.mjs` tại local.
- Điểm "không chứng minh production đã đổi" ở mục 4 đã được giải quyết: `post-publish-qa.yml` PASS 941 route và `live-markup-qa.yml` 928/928 route trùng từng byte, hai lần (báo cáo 10 mục 6, hàng 2, 10 và 11).
