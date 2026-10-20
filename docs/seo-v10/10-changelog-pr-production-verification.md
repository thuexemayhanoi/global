# 10 · Changelog, GitHub commit/PR và Production Verification

Ngày: 2026-10-20. Nhánh: `seo/v10-global-engine-20261020` (từ `main` `fc4fbb6c`). Pull request: https://github.com/thuexemayhanoi/global/pull/79 (mở, chưa merge; chủ sở hữu merge theo đúng quy trình, phiên này không tự merge).

## 1. Trạng thái tổng theo bốn mức

| Mức | Trạng thái | Bằng chứng |
|---|---|---|
| IMPLEMENTED | Hoàn tất | commit `318e865c` (mã, HTML tạo lại, đồ thị, test, báo cáo 01 đến 09 và 11) |
| TESTED | Hoàn tất tại local | 273/273 test, mọi guard xanh (xem 09); CI `qa.yml` chạy trên PR #79 |
| DEPLOYED | Chưa | GitHub Pages chỉ deploy từ `main`; cần merge PR #79 |
| VERIFIED | Chưa | sau deploy: `post-publish-qa.yml` + crawler connector (mục 5) |

## 2. Changelog mã nguồn (commit `318e865c`)

| Tệp | Thay đổi | Ảnh hưởng |
|---|---|---|
| `scripts/articles.mjs` | `BRAND`, `SOCIAL_IMAGE`; `topicLinks` dùng cửa sổ xoay vòng theo silo; `renderArticle` dựng đường dẫn breadcrumb 3 cấp không lặp, Article có `publisher`, `isPartOf`, ngày từ `publication.approved_at`, thẻ `og:site_name`, `og:image`, `twitter:card` | 901 trang Hub và Supporting |
| `scripts/premium.mjs` | thanh bài liên quan: Pillar trước rồi cửa sổ xoay vòng 4 bài cùng cha hoặc bài con | 901 trang |
| `scripts/build.mjs` | `head()` thêm ảnh xã hội và `summary_large_image`; checklist Article có `isPartOf`, `author.url`, `publisher`; `ownedSitemap` dùng `sitemapFilePattern` | gốc, 10 Pillar, 10 checklist, 4 tiện ích, `/search/` không đổi, `404.html` |
| `scripts/sitemaps.mjs` | `sitemapFilePattern(codes)` | build chỉ xóa đúng shard cũ, kể cả `-10` trở lên |
| `scripts/ultra.mjs` | alt mô tả cho hero, thư viện gốc, thẻ chủ đề theo tiêu đề bản địa | gốc và 10 Pillar |
| `tests/seo-v10.test.mjs` | 9 test hồi quy mới | CI |
| 926 × `index.html`, `404.html` | tạo lại bằng `node scripts/build.mjs` | production sau merge |
| `data/seo/content-graph.json` | tạo lại (`--write`), 3.526 cạnh | `--check` xanh; `docs/GLOBAL-SITE-MATRIX.md` không đổi byte |
| `docs/seo-v10/*` | 10 báo cáo và 1 phụ lục | tài liệu |

Không đổi: `CNAME`, `robots.txt`, `sitemap*.xml`, `data/seo/url-freeze.json`, `data/seo/master-matrix.json`, `content/`, `factory/`, `scripts/navigation.mjs`, `assets/`, menu, footer, theme.

## 3. Điều kiện an toàn đã kiểm

| Bảo vệ | Kết quả |
|---|---|
| 926 URL đóng băng: lang, canonical, robots, title, description, H1, hreflang, loại schema, outline H2, số từ | `seo-guard` fail 0 |
| NAP, giá, schema kinh doanh | `fact-guard` fail 0; không thêm LocalBusiness, AutoRental, Offer, Review |
| Menu và footer byte-identical | `nav-qa` PASS, test navigation xanh |
| Không liên kết IDEA, không URL mới | sitemap 926 = Matrix 926 |
| Claims, bản nháp bất biến, Publisher, Live QA | không có tệp nào trong `factory/` thay đổi |
| Không force-push | nhánh mới, push thường |

## 4. Những gì CI của PR kiểm tra

`qa.yml` chạy trên `pull_request`: build và `--check`, bộ test hồi quy (PR này thêm `tests/seo-v10.test.mjs` vào danh sách của workflow), content-graph `--check`, CNAME và canonical, validate-plan, seo-guard, fact-guard, Topic Factory và topical authority ở chế độ chỉ đọc, nav-qa, audit-static `--fail-p0`, audit-ai-search và `engine.mjs`. Không có API mô hình hay khóa AI nào trong Actions (`tests/no-ai-api.test.mjs`). Kết quả CI được theo dõi từ phiên này; nếu đỏ, nguyên nhân được tìm, sửa tại nguồn, test lại và push lên cùng nhánh.

## 5. Kế hoạch xác minh production (sau khi chủ sở hữu merge)

| Bước | Lệnh hoặc công cụ | Tiêu chí đạt |
|---|---|---|
| 1 | GitHub Pages deploy từ `main` | trang `/` phục vụ commit mới |
| 2 | Workflow thủ công `post-publish-qa.yml` | 926 URL live: status, lang, canonical, sitemap, fingerprint freeze, không NAP/schema kinh doanh |
| 3 | OpenSEO `run_site_audit` 50 trang (khoảng 55 credit, còn 235) | 0 lỗi mới; title/description info không đổi |
| 4 | OpenRush `audit_site` 20 trang | cần nạp credit (hiện 402); nếu không, bỏ qua và ghi BLOCKED |
| 5 | Ubersuggest `pagespeed_audit` trang gốc + 1 Hub + 1 bài | CLS 0, không tăng LCP so với 08 |
| 6 | Kiểm tra mẫu bằng crawler connector: 1 Hub mỗi ngôn ngữ | breadcrumb 3 mục, `og:image`, Article có publisher và ngày |

Mỗi bước ghi kết quả vào mục 6 của tài liệu này trong một commit sau, với ngày giờ và công cụ. Không ghi "đã xác minh" trước khi có kết quả thật.

## 6. Kết quả xác minh production

Chưa có (PR chưa merge).

## 7. Việc còn lại và chủ sở hữu quyết định

- Biên tập 321 tiêu đề trên 70 ký tự và 622 mô tả trên 165 ký tự (trường đóng băng, cần PR riêng với `seo-guard --write`); danh sách trong 11.
- `distinct_from` cho 4 IDEA trùng ý định với trang live (04) trước khi Writer nhận.
- Hình hero nhẹ hơn hoặc `srcset` để cải thiện LCP mobile (08).
- Thêm property Google Search Console cho `global.rentbikehanoi.com` để các báo cáo sau có số liệu trường; cho tới lúc đó, không có số liệu thứ hạng hay lưu lượng nào được ghi.
- BLOCKED trong phiên: Firecrawl (402), OpenRush sau lần gọi zh (402), Ubersuggest site audit (trả phí), tải trực tiếp production từ sandbox (proxy chặn), điểm Lighthouse của OpenSEO (chỉ xem trong giao diện).
