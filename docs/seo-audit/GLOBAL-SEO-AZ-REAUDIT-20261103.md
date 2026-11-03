# Global SEO A–Z — tái kiểm toán 03/11/2026

Kiểm toán lại `main` @ `b983d68` sau vòng thực thi A–Z (PR #169–#188). Đây là bước tiếp theo theo checkpoint (`docs/seo-matrix/CHECKPOINT.json`): chạy lại pipeline và chỉ thêm nhiệm vụ cho lỗi mới **đã xác minh** trên URL hiện có. Báo cáo đầy đủ của đợt trước: `GLOBAL-SEO-AZ-AUDIT-20261101.md`.

## Bằng chứng mới (đều lưu trong `reports/seo/data/raw/`)

| Kiểm tra | 01/11 | 03/11 | File |
|---|---|---|---|
| Live markup QA (production = bản build) | 1.081/1.081 | 1.081/1.081 (run 41403725587) | `live-qa-20261103.json` |
| Post-publish QA | 1.094 mục, 0 lỗi | 1.094 mục, 0 lỗi (run 41403728499) | `live-qa-20261103.json` |
| Trình duyệt, 1.081 trang (axe WCAG A/AA) | 0 vi phạm | 0 vi phạm | `browser-audit-20261103.json` |
| Ảnh lazy trong màn hình đầu (mobile / desktop mẫu 127) | 10 / 98 | 0 / 82 | như trên |
| W3C Nu validator, 1.081 trang | 0 lỗi, 1.064 cảnh báo | 0 lỗi, 0 cảnh báo | `html-validation-20261103.json` |
| Lighthouse 15 URL × 2 (trung vị) | LCP mobile 1,50 s; SI 1,35 s; LCP desktop 0,44 s | LCP mobile 1,50 s; SI 1,05 s; LCP desktop 0,38 s | `lighthouse-20261103.json` |
| Link nguồn tham khảo (1.420 link) | 1 link chết | 0 link chết (run 41613703764) | `reference-links-20261103.json` |
| Chuỗi giao diện tiếng Anh trên trang không phải EN | 977 trang | 0 | `deep-audit.json` |
| Nguồn có in ngày kiểm tra | 23 | 5.629/5.629 | như trên |
| Trang hiển thị ngày | 0 | 1.064 | như trên |
| Câu hỏi FAQ trùng nguyên văn | 4 | 0 | như trên |

`tech_reaudit.py` không tìm thấy lỗi kỹ thuật mới; khác biệt duy nhất là 46 trang bài viết nay có hreflang (không x-default) theo TECH-10.

## Kết quả

- Tổng số lỗi do pipeline báo: **933 (gốc 27/10) → 769 (01/11) → 737**.
- Đã hết hẳn: `S-UI-UNTRANSLATED`, `S-ARIA-LABEL-SPAN`, `S-REF-DATES-HIDDEN`, `U-FAQ-REPEATED-Q`, `U-DEAD-REFERENCE`, `S-HREFLANG-EQUIV`.
- Quyết định có số đo, ghi `WONT_FIX` kèm lý do trong `findings.csv`:
  - `S-LAZY-LCP`: ảnh bìa bài viết giữ lazy (IMG-LCP: eager làm LCP mobile chậm khoảng 0,45 s, desktop không nhanh hơn);
  - `S-NO-VISIBLE-DATE`: chỉ còn 10 Pillar (trang ngôn ngữ) không hiện ngày, theo quyết định CONTENT-03;
  - `S-COVER-SRCSET`: ảnh bìa còn thừa 13–16 KiB sau khi có bản 800 px;
  - `S-RENDER-BLOCKING-CSS`: còn một file CSS, Lighthouse ước lượng tiết kiệm 10–60 ms;
  - `S-HERO-ART-TEXT`: chữ trang trí trong ảnh, `aria-hidden`, đã dịch.
- **Lỗi mới đã xác minh (P3):** `S-TOPIC-IMG-SIZES`. Bốn ảnh chủ đề trên 10 Pillar và trang gốc có `sizes` không khớp kích thước hiển thị đo trong Chromium:
  - **Thẻ Pillar:** khai báo 565 px nhưng hiển thị 509 px. Bộ ảnh chỉ có 480/720/960 px nên trình duyệt tải bản 720 px. Lighthouse ước lượng thừa tới 160 KiB mỗi lượt xem Pillar trên desktop, 140 KiB trên mobile.
  - **Thẻ ở trang gốc:** trên điện thoại khai báo 171 px nhưng hiển thị 352 px, nên tải bản 480 px cho chỗ cần 704 px ở DPR 2 (bị mờ). Trên desktop hiển thị 272 px nhưng tải bản 480 px.
  - Nhiệm vụ mới **IMG-TOPIC-SIZES** (TODO) trong `docs/seo-matrix/TASKS.json`; checkpoint chỉ vào nhiệm vụ này.

## Công cụ

- `analyze.py` và `build_workbook.py` tự lấy file bằng chứng mới nhất (`raw/<loại>-YYYYMMDD.json`); file cũ giữ làm lịch sử.
- `deep_audit.py`:
  - nhận ngày kiểm tra nguồn trong `<time datetime>`;
  - dùng `AUDIT_DATE` của lần chạy;
  - phân loại hreflang theo `data/seo/hreflang-equivalents.json` (67 trang có bản tương đương, 74 bài độc lập đã xét).
- Các lỗi đã có quyết định ghi `WONT_FIX` kèm lý do, không tính là việc mở.

## Chưa kiểm chứng

Index, thứ hạng, CTR và Core Web Vitals thực tế (Search Console, GA4, CrUX chưa kết nối); số đo Lighthouse là lab trên server local HTTP/1.0, không phải dữ liệu người dùng.
