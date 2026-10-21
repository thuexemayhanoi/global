# 10 · Changelog, GitHub commit/PR và Production Verification

Ngày: 2026-10-20. Nhánh: `seo/v10-global-engine-20261020` (từ `main` `fc4fbb6c`). Pull request: https://github.com/thuexemayhanoi/global/pull/79, đã merge (squash) vào `main` thành `0a048ab4` lúc 04:01 UTC 2026-10-21 sau khi CI xanh trên đầu nhánh `5162d721`, theo ủy quyền của chủ sở hữu ngày 2026-10-21 cho các thay đổi SEO an toàn (không trường đóng băng, không dữ liệu kinh doanh); nhánh `main` không có yêu cầu review bắt buộc nên không có bảo vệ nào bị bỏ qua.

## 1. Trạng thái tổng theo bốn mức

| Mức | Trạng thái | Bằng chứng |
|---|---|---|
| IMPLEMENTED | Hoàn tất | commit `318e865c` (mã, HTML tạo lại, đồ thị, test, báo cáo 01 đến 09 và 11) và các commit tiếp theo trong mục 2b |
| TESTED | Hoàn tất | 291 test xanh tại local trên đầu nhánh cuối; CI `qa.yml` xanh trên `318e865c`, `7926200c`, `52a9aa21`, `c0286253`, `1ce61e0c`, `cb696fce`, `5162d721` và trên `main` sau merge (run 39541765259); hai lần đỏ trên `f62b0768` và `941a1f44` do test Topic Factory phía `main` (sửa ở #80, #81, đã gộp) |
| DEPLOYED | Hoàn tất | GitHub Pages deploy `main` xong lúc 04:05:15 UTC 2026-10-21 (run 39541884028, head `f50bc63a` chứa `0a048ab4`) |
| VERIFIED | Hoàn tất ở mức connector và workflow | `post-publish-qa.yml` PASS 941 URL; OpenSEO crawl 50 trang 200 OK; PageSpeed mobile LCP 2,5 s xuống 1,7 s (mục 6) |

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

## 2b. Các commit tiếp theo trên PR #79

| Commit | Nội dung | Ai làm |
|---|---|---|
| `7926200c` | báo cáo 10, `qa.yml` chạy `tests/seo-v10.test.mjs` | điều phối |
| `52a9aa21` | gộp `main` (10 commit Topic Factory), tạo lại content graph (1.919 dòng, 993 IDEA) | điều phối |
| `c0286253` | `scripts/seo/apply-meta-proposals.mjs` + `tests/meta-proposals.test.mjs`; báo cáo 03 bổ sung nghiên cứu zh và nl | điều phối |
| `f62b0768` | sửa theo review Codex: `siblingPlan` cùng silo trước và cân bằng; ảnh trang trí trở lại `alt=""`; test và báo cáo 01, 02, 06, 07 | điều phối |
| `24cacc49` qua `e07d5c64` | hero đáp ứng `srcset`/`sizes`, hai tệp WebP 800w và 1200w, preload trên trang gốc, `tests/hero-perf.test.mjs` | worker PERF (nhánh `seo/v10-perf`) |
| `941a1f44` | trang gốc tạo lại với hero mới; báo cáo 08 và 09 | điều phối |
| `f2ae3c7e` qua `46d84418` | `tests/seo-site-qa.test.mjs`: 12 test QA toàn site cho 10 ngôn ngữ (lang, canonical, H1, tiêu đề và mô tả duy nhất, liên kết nội bộ, noindex, JSON-LD, hreflang, sitemap, ảnh) chạy dưới 1 giây; đưa vào `qa.yml` | worker QA (nhánh `seo/v10-qa`) |
| `cb696fce` | `qa.yml` chạy thêm `tests/hero-perf.test.mjs` và `tests/meta-proposals.test.mjs` | điều phối |

PR xếp chồng chờ chủ sở hữu duyệt nội dung: https://github.com/thuexemayhanoi/global/pull/82 (nhánh `seo/v10-pillar-sections`, commit `fe626f50`): một mục "cách dùng cẩm nang" bản ngữ trên 10 trang chủ ngôn ngữ, 9 Pillar chuyển UPGRADE thành KEEP trong content graph. Chỉ merge sau PR #79 và sau khi đọc lại từng ngôn ngữ.

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

## 6. Kết quả xác minh production (2026-10-21, sau deploy 04:05 UTC)

| Bước | Công cụ | Thời điểm (UTC) | Kết quả |
|---|---|---|---|
| 1 | GitHub Pages deploy `main` | 04:02:55 đến 04:05:15 | thành công (run 39541884028); lần deploy riêng cho `0a048ab4` bị hủy vì bị thay bởi deploy của commit Topic Factory `f50bc63a` ngay sau, commit này chứa toàn bộ PR #79 |
| 2 | `post-publish-qa.yml` (workflow_dispatch trên `main`) | 04:10:15 đến 04:10:34 | `passed: true`, `issues: []`, `checked: 941` (926 URL PUBLISHED, sitemap, robots, 404, search); artifact `global-live-post-publish-qa` run 39542532902 |
| 3 | OpenSEO site audit `acb45dea-03cb-4f53-be14-427e5c3631a5` (50 trang, không Lighthouse) | 04:09:38 đến 04:10:31 | 50/50 HTTP 200, indexable, trong sitemap; phản hồi 5 đến 43 ms; chỉ còn info title-too-long 43 và meta-description-too-long 47 (biên tập, PR đề xuất riêng); không lỗi liên kết, canonical, trùng lặp hay thin content |
| 4 | Ubersuggest `pagespeed_audit` (`forceUpdate`, URL gốc) | 04:09 | Desktop: FCP 405 ms, LCP 431 ms (trước 608), SI 681 ms, TBT 0, CLS 0. Mobile: FCP 1,3 s, LCP 1,7 s (trước 2,5 s), SI 2,6 s (trước 4,5 s), TTI 1,7 s (trước 2,5 s), TBT 0, CLS 0. Cơ hội còn lại: Redirects 190 ms và 630 ms (lớp HTTPS/apex, ngoài repo) |
| 5 | OpenRush `audit_site` | | BLOCKED: tài khoản hết credit (402) |
| 6 | Tải trực tiếp HTML production từ sandbox | 04:12 | BLOCKED: proxy chặn (mã 000); bằng chứng về markup mới trên production là gián tiếp: `post-publish-qa` đọc HTML live và khớp fingerprint, PageSpeed giảm LCP đúng như kỳ vọng của hero đáp ứng, và `main` sau merge được `qa.yml` xác nhận byte-identical với HTML đã tạo |

Credit sau xác minh: OpenSEO còn 157 (`whoami` 04:14 UTC; 325 lúc bắt đầu phiên); Ubersuggest còn 1 báo cáo PageSpeed trong ngày.

Không có số liệu thứ hạng, lập chỉ mục hay lưu lượng nào được đo hay suy luận.

## 7. Worker song song đã dùng

| Worker | Phạm vi | Kết quả | Trạng thái |
|---|---|---|---|
| Điều phối (phiên này) | audit, sửa generator, gộp nhánh, QA, PR, trả lời review | PR #79, PR #82, 11 báo cáo | hoạt động |
| PERF (subagent, worktree riêng, nhánh `seo/v10-perf`) | hero đáp ứng, preload, test | gộp vào PR #79 | hoàn tất |
| QA (subagent, worktree riêng, nhánh `seo/v10-qa`) | bộ test QA toàn site 10 ngôn ngữ | gộp vào PR #79 | hoàn tất |
| PILLAR A (vi, en, de, fr, es) và PILLAR B (nl, zh, pt, ko, ja) | đề xuất mục mới cho trang chủ ngôn ngữ | PR #82 | hoàn tất, chờ duyệt nội dung |
| META vi, en, de, fr, es, nl, pt | đề xuất rút gọn tiêu đề và mô tả (JSON, kiểm tra bằng `apply-meta-proposals.mjs`) | bị dừng lúc 20:33 UTC vì hạn mức phiên (HTTP 429), chạy lại từ 03:45 UTC 2026-10-21 | đang chạy, xem mục 8 khi có kết quả |
| W1, W2, W3 (Writer) | không dùng cho SEO: cả ba đang giữ 10 claim bài viết mỗi slot, theo quy tắc không chiếm Writer đang có claim | không tham gia | không dùng |

Khả năng song song thật: subagent trong cùng container (mỗi worker một worktree git hoặc một tệp đầu ra riêng, điều phối gộp tuần tự các thay đổi generator). Không có phiên AI độc lập nào khác đang chạy trên máy này (`ListAgents` trống); không giả định thêm.

## 8. Việc còn lại và chủ sở hữu quyết định

- Biên tập 321 tiêu đề trên 70 ký tự và 622 mô tả trên 165 ký tự (trường đóng băng, cần PR riêng với `seo-guard --write`); danh sách trong 11.
- `distinct_from` cho 4 IDEA trùng ý định với trang live (04) trước khi Writer nhận.
- Hình hero nhẹ hơn hoặc `srcset` để cải thiện LCP mobile (08).
- Thêm property Google Search Console cho `global.rentbikehanoi.com` để các báo cáo sau có số liệu trường; cho tới lúc đó, không có số liệu thứ hạng hay lưu lượng nào được ghi.
- BLOCKED trong phiên: Firecrawl (402), OpenRush sau lần gọi zh (402), Ubersuggest site audit (trả phí), tải trực tiếp production từ sandbox (proxy chặn), điểm Lighthouse của OpenSEO (chỉ xem trong giao diện).
