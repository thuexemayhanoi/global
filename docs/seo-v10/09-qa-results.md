# 09 · QA Results

Ngày: 2026-10-20. Nhánh: `seo/v10-global-engine-20261020` trên nền `main` `fc4fbb6c`. Hai vòng QA: baseline trước khi sửa và vòng cuối sau khi sửa và tạo lại toàn bộ HTML.

## 1. Bộ lệnh bắt buộc

| Lệnh | Baseline (`fc4fbb6c`) | Sau sửa (vòng cuối) | Ghi chú |
|---|---|---|---|
| `node scripts/build.mjs` | Generated 954 static files | Generated 954 static files | |
| `node scripts/build.mjs --check` | Verified 954 | Verified 954 | byte-identical với HTML đã commit |
| `node --test tests/*.test.mjs` | 264 pass, 0 fail | **273 pass, 0 fail** | thêm 9 test trong `tests/seo-v10.test.mjs` |
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

## 3. Test mới (`tests/seo-v10.test.mjs`, 9 test)

1. Hub: breadcrumb Global › Ngôn ngữ › Hub, 3 mục, không lặp URL, có `<nav class="crumb">` bắt đầu bằng Global.
2. Supporting: breadcrumb 3 mục duy nhất, kết thúc tại chính trang.
3. Mọi Hub và Supporting có `og:site_name`, `og:image`, `twitter:card`, Article có `publisher`, `isPartOf`, `datePublished` đúng bằng `publication.approved_at` (hoặc không có ngày khi không có bản ghi).
4. Liên kết anh em: mỗi bài nhận ít nhất min(6, n−1) liên kết, khối có đúng min(6, n−1) liên kết, không tự trỏ, không lặp.
5. `topicLinks` đơn vị: 8 bài, 2 silo, thứ tự chính xác, 6 liên kết tới mỗi bài.
6. `renderArticle` đơn vị: đường dẫn cho Hub và bài de, ngày, logo, `og:image:width`.
7. Thanh liên quan: bắt đầu tại trang chủ ngôn ngữ, tối đa 5, không lặp, không tự trỏ.
8. Alt ảnh: gốc và 10 trang chủ ngôn ngữ, mọi ảnh có alt từ 3 ký tự, alt ảnh chủ đề vi bằng tiêu đề thẻ bản địa.
9. `sitemapFilePattern`: nhận `sitemap-vi-10.xml`, `sitemap-de-123.xml`; từ chối `sitemap-xx.xml`, `-1`, `-01`, `.gz`.

## 4. Những gì QA không chứng minh

- Không chứng minh thứ hạng, lập chỉ mục hay lưu lượng.
- Không chứng minh production đã đổi: cần merge, GitHub Pages deploy, rồi `post-publish-qa.yml` và crawler connector chạy lại (xem 10).
- Không kiểm tra nội dung đúng sai về mặt biên tập; đó là việc của G1 đến G5, G7 và fact-guard trên từng bài.

Nhật ký đầy đủ của vòng cuối (có thể tạo lại bằng cách chạy các lệnh trên): kết quả tóm tắt ở bảng 1; nhật ký thô nằm ngoài repo.
