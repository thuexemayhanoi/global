# 12 · Đề xuất rút gọn tiêu đề và mô tả (On-Page, chờ chủ sở hữu duyệt)

Ngày: 2026-10-21. Phạm vi: các trang Hub và Supporting có `<title>` dài hơn 60 ký tự hoặc mô tả meta dài hơn 165 ký tự (danh sách gốc trong `11-phu-luc-url-can-xu-ly.md`). Ba ngôn ngữ zh, ja, ko không có đề xuất vì tiêu đề và mô tả CJK đã ngắn theo ký tự. Đây là thay đổi trên trường đóng băng (`data/seo/url-freeze.json`), nên chỉ đi qua PR có xem xét; không có gì tự lên production.

## 1. Cách làm

- Mỗi ngôn ngữ do một worker riêng soạn bằng bản ngữ từ dữ liệu của chính trang đó (tiêu đề, H1, mô tả hiện tại, 600 ký tự đầu thân bài, truy vấn giả thuyết trong Matrix). Không dịch máy từ tiếng Anh.
- Quy tắc cứng, kiểm tra bằng máy (`scripts/seo/apply-meta-proposals.mjs`, `tests/meta-proposals.test.mjs`): tiêu đề mới tối đa 60 ký tự và khác tiêu đề cũ; mô tả mới 120 đến 155 ký tự; trường đã trong giới hạn thì không đề xuất (`null`); không được xuất hiện chuỗi số nào không có sẵn trong tiêu đề, mô tả hoặc thân bài của trang; tiêu đề và mô tả "hiện tại" trong tệp đề xuất phải khớp packet đang xuất bản (hoặc packet đã mang đúng giá trị đề xuất, tức là đã áp dụng).
- Quy tắc biên tập: giữ từ khóa chính và từ chỉ địa điểm (Hà Nội, Việt Nam) ở đầu; giữ nghĩa và phạm vi của H1; bỏ hoặc nén phần phụ đề sau dấu hai chấm; không hậu tố thương hiệu, không câu giật gân; không giá, tiền tệ, số điện thoại, địa chỉ, tên cửa hàng, giờ mở cửa, không khẳng định pháp lý mới; số hiệu nghị định chỉ giữ khi đã có trong trường hiện tại.
- H1, URL, canonical, thân bài, hreflang, loại schema không đổi.

## 2. Số liệu theo ngôn ngữ

| Ngôn ngữ | Trang có đề xuất | Tiêu đề mới | Mô tả mới | Độ dài tiêu đề mới | Độ dài mô tả mới | Tiêu đề trung bình trước, sau | Mô tả trung bình trước, sau |
|---|---|---|---|---|---|---|---|
| vi | 86 | 74 | 84 | 47 đến 60 | 133 đến 155 | 77, 57 | 190, 149 |
| en | 95 | 82 | 94 | 43 đến 60 | 137 đến 155 | 72, 57 | 187, 149 |
| de | 96 | 89 | 93 | 41 đến 60 | 130 đến 154 | 74, 56 | 187, 148 |
| fr | 94 | 79 | 94 | 40 đến 60 | 133 đến 154 | 74, 55 | 192, 146 |
| es | 84 | 71 | 83 | 46 đến 60 | 136 đến 155 | 75, 56 | 191, 150 |
| nl | 88 | 76 | 87 | 47 đến 60 | 135 đến 154 | 77, 56 | 190, 149 |
| pt | 89 | 75 | 87 | 44 đến 60 | 138 đến 154 | 76, 56 | 191, 150 |
| zh, ja, ko | 0 | 0 | 0 | | | | |

Tệp đề xuất: `docs/seo-v10/proposals/meta-<locale>.json`, mỗi mục có `note` một câu nói rõ đã giữ gì và nén gì.

## 3. Cách xem xét và áp dụng

1. Đọc tệp đề xuất của từng ngôn ngữ (cột `title` so với `proposed_title`, `meta_description` so với `proposed_description`); sửa trực tiếp trong tệp nếu muốn đổi chữ, giữ đúng giới hạn độ dài.
2. `node scripts/seo/apply-meta-proposals.mjs` (dry-run) phải báo `errors: []`.
3. Trên nhánh có xem xét: `node scripts/seo/apply-meta-proposals.mjs --apply`, rồi `node scripts/build.mjs`, `node scripts/seo/seo-guard.mjs --write` (đóng băng lại tiêu đề và mô tả mới), `node scripts/build.mjs --check`, `node scripts/seo/content-graph.mjs --write`, `node scripts/seo/fact-guard.mjs`, `node --test tests/*.test.mjs`.
4. PR đi kèm tài liệu này đã làm sẵn các bước trên để chủ sở hữu xem diff thật của packet, HTML và `url-freeze.json`; merge PR là bước duyệt.

## 4. Điều cần cân nhắc trước khi merge

- Tiêu đề ngắn hơn hiển thị trọn trên SERP nhưng cũng bớt từ khóa phụ; đây là đánh đổi có chủ ý, chưa có dữ liệu CTR để đo (không có GSC).
- Một số worker đã ghi chú các mục nên liếc qua: en (EN-S10, S22, S30, S59, S63 đổi vài từ), es (ES-S12 thì hiện tại, ES-S17 tiêu đề dựng lại từ H1, ES-S57 số ít), fr (vài tiêu đề đúng 60 và mô tả 153 đến 154), vi (số khẩn cấp 113, 114, 115 chỉ giữ khi là chủ đề trang).
- Sau khi merge: Pages deploy, chạy `post-publish-qa.yml` và `live-markup-qa.yml` để xác nhận production khớp fingerprint mới.
