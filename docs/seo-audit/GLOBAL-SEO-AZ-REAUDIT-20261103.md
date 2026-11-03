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

## Cập nhật chiều 03/11: snapshot `be44224` sau IMG-TOPIC-SIZES

### IMG-TOPIC-SIZES: LIVE_VERIFIED
Nhiệm vụ làm qua hai PR:
- **#190:** `sizes` theo bề rộng đo thực tế; thêm bản 320w và 600w.
- **#191:** breakpoint chính xác (đo theo bước 1 px) và thêm bản 520w cho thẻ Pillar 509 px trên desktop.

Ảnh mới là bản thu nhỏ của chính ảnh cũ, cùng cách nén. Cách nén này tạo lại bản 480w trùng từng byte.

Kiểm chứng:
- Chromium: 0 trên 3.242 bề rộng (300–1920 px, cả hai template) có `sizes` lệch kích thước hiển thị. Chạy cùng script trên bản build trước #190 thì lệch 3.242/3.242.
- Chọn file: 176/176 trường hợp (22 bề rộng biên × DPR 1/1,75/2/3 × 2 template) tải file nhỏ nhất đủ phủ kích thước hiển thị.
- Production:
  - 24/24 file mà srcset có thể chọn trả về 200 `image/webp` (reference-link-check run 41626256034);
  - live markup QA 41625548441: 1.081/1.081 trang khớp bản build;
  - post-publish QA 41625530908: 1.094 mục, 0 lỗi.

### Bằng chứng của snapshot `be44224`

| Kiểm tra | Kết quả | File |
|---|---|---|
| `collect.py`, `deep_audit.py`, `tech_reaudit.py` | chạy lại trên `be44224`; `tech_reaudit` giống hệt buổi sáng | `audit-data.json`, `deep-audit.json` |
| 10 cổng QA của repo | chạy lại trên `be44224`, kết quả giống hệt các file `raw/*.txt` | `raw/*.txt` |
| Live QA | run 41625548441 và 41625530908 | `live-qa-20261103b.json` |
| Lighthouse 15 URL × 2 | LCP mobile trung vị 1,43 s (sáng: 1,50 s); desktop 0,40 s; điểm hiệu năng 100/100 | `lighthouse-20261103b.json` |
| Browser audit, W3C, link nguồn | giữ từ buổi sáng (đo trên `b983d68`; `be44224` chỉ khác `srcset`/`sizes` của 11 trang). W3C chạy lại trên 11 trang đó: 0 lỗi | `*-20261103.json` |

Dung lượng thừa của ảnh minh họa theo Lighthouse (KiB, từ buổi sáng → snapshot này):

| Trang | Desktop | Mobile |
|---|---|---|
| 4 Pillar trong mẫu | 160 → 0 | 140 → 29 |
| Trang gốc, ảnh chủ đề | 123 → 0 | 0 → 100 |
| Trang gốc, ảnh hero (không đổi) | 49 | 20 |

Về các dòng còn lại:
- Trang gốc trên mobile nay tải bản 720w cho ô cần 654 px thiết bị. Trước đây trang tải bản 480w và phóng to lên.
- Phần thừa còn lại là phần ảnh bị cắt bởi `object-fit` (khung 1,6:1 trên điện thoại; ảnh hero 16:9 trong khung 4:3 trên desktop), cộng bước nhảy 600w → 720w ở màn hình giả lập Moto G.
- `S-TOPIC-IMG-SIZES` vì vậy ghi `WONT_FIX` kèm lý do.
- Workbook: OPEN 1 → 0; WONT_FIX 5 → 6; tổng số lỗi vẫn là 737.

### Sửa lỗi công cụ
Workbook buổi sáng có hai chỗ sai. Cột `live_evidence` của Master Matrix ghi `NOT_REVERIFIED` cho 1.081 URL, và AUDIT CHANGELOG cùng phần Data sources dẫn tới run live QA ngày 01/11. Lý do: `analyze.py` và `build_workbook.py` đọc `raw/external-evidence.json`, nơi chưa ghi run của buổi tái kiểm toán.

Đã sửa:
- Hai công cụ nay lấy run live markup QA và post-publish QA từ file `raw/live-qa-*.json` mới nhất. Mỗi URL được ghi `VERIFIED` chỉ khi run đó đúng commit được kiểm toán.
- Dòng RE_AUDIT trỏ tới báo cáo mới nhất.
- Dòng FIX_TASKS đếm theo `TASKS.json`.

Bảng A–Z không còn nhiệm vụ mở. Checkpoint trở về bước theo dõi; index và thứ hạng vẫn chưa đo được khi chưa có Search Console.
