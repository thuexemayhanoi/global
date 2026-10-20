# 06 · Internal Linking Matrix

Ngày: 2026-10-20. Nguồn: `scripts/articles.mjs` (`topicLinks`), `scripts/premium.mjs` (thanh bài liên quan), `scripts/navigation.mjs` (menu và footer, không đổi), `seo-guard` (`checkLinks`), `data/seo/content-graph.json` (3.526 cạnh).

## 1. Các lớp liên kết nội bộ trên mỗi trang

| Lớp | Vị trí | Trước | Sau | Ghi chú |
|---|---|---|---|---|
| Menu và footer dùng chung | header, footer | 4 Hub và 8 nhãn con mỗi ngôn ngữ, không liên kết IDEA | không đổi | `nav-qa` PASS; byte-identical được test bảo vệ |
| Breadcrumb | đầu bài | Hub: Ngôn ngữ › Ngôn ngữ (lặp); bài: Ngôn ngữ › Hub | Hub: Global › Ngôn ngữ › Hub; bài: Ngôn ngữ › Hub › bài | sửa trong `renderArticle` |
| Liên kết trong nội dung | thân bài | theo Writer | không đổi | |
| "Guides in this topic" trên Hub | cuối Hub | mọi bài con đã xuất bản, nhóm theo silo | không đổi | là lớp chống mồ côi ở quy mô lớn |
| "Bài cùng chủ đề" trên bài Supporting | cuối bài | 6 bài: cùng silo trước, rồi theo ưu tiên; mọi bài trong Hub trỏ về cùng 6 dòng đầu | cửa sổ xoay vòng 6 bài: danh sách bài của Hub sắp theo silo rồi ưu tiên, mỗi bài trỏ tới 6 bài tiếp theo trong vòng | mỗi bài nhận đúng min(6, n−1) liên kết anh em |
| Thanh bài liên quan (premium) | đầu bài, tối đa 5 | lấy 5 dòng đầu trong pool ngôn ngữ thỏa điều kiện | Pillar đứng đầu, rồi cửa sổ xoay vòng 4 bài cùng cha hoặc bài con | phân bổ đều quanh vòng |
| Liên kết về cha | cuối bài | 1 | không đổi | |

## 2. Kết quả phân bổ liên kết (chỉ đếm liên kết trong `<main>`, bỏ header và footer)

| Ngôn ngữ | Trang | Trước: trang dưới 3 liên kết tới | Sau: trang dưới 3 liên kết tới | Sau: ít nhất | Sau: trung vị | Sau: nhiều nhất |
|---|---|---|---|---|---|---|
| vi | 88 | 19 | 0 | 6 | 11 | 88 (trang chủ ngôn ngữ) |
| en | 101 | 20 | 0 bài, 2 tiện ích | 5 (bài) | 11 | 912 (trang chủ en, nhận thêm từ tiện ích) |
| de | 99 | 20 | 0 | 5 | 11 | 99 |
| fr | 96 | 23 | 0 | 5 | 11 | 96 |
| es | 86 | 14 | 0 | 5 | 10 | 86 |
| nl | 91 | 15 | 0 | 6 | 11 | 91 |
| zh | 91 | 16 | 0 | 6 | 12 | 91 |
| pt | 91 | 17 | 0 | 6 | 12 | 91 |
| ko | 91 | 17 | 0 | 5 | 12 | 91 |
| ja | 91 | 18 | 0 | 5 | 11 | 91 |
| **Tổng** | **926** | **179** | **0 bài** | | | |

`/privacy/` và `/terms/` chỉ nhận liên kết từ footer dùng chung trên mọi trang; `seo-guard` không coi là mồ côi.

## 3. Kiểm tra bắt buộc của `seo-guard` sau khi sửa

| Kiểm tra | Kết quả |
|---|---|
| ORPHAN (trang không có liên kết tới) | 0 |
| PARENT_MISSING_CHILD_LINK (Hub hoặc Pillar không trỏ tới bài con đã xuất bản) | 0 |
| CHILD_MISSING_PARENT_LINK | 0 |
| EMPTY_ANCHOR | 0 |
| ANCHOR_DIVERSITY (cùng một anchor từ 3 trang trở lên, mức WARN) | 69 trước, 159 sau |

Vì sao WARN tăng: mỗi bài giờ nhận 6 liên kết anh em thay vì tập trung vào vài bài đầu, và anchor là tiêu đề bài (anchor mô tả đúng nội dung). Cảnh báo này không chặn merge. Nếu muốn giảm, bước sau có thể luân phiên anchor giữa `working_title` và H1 của packet; không làm trong PR này để giữ phạm vi.

## 4. Ma trận liên kết theo vai trò (sau khi sửa)

| Từ ↓ tới → | Gốc `/` | Pillar cùng ngôn ngữ | Hub cha | Bài anh em | Bài con | Checklist |
|---|---|---|---|---|---|---|
| Gốc `/` | | 10 liên kết ngôn ngữ | | | | |
| Pillar | menu | | menu + nội dung | | "Guides" không áp dụng | nút đọc checklist |
| Hub | breadcrumb | breadcrumb + thanh liên quan | | | mọi bài con, nhóm theo silo | |
| Supporting | | breadcrumb + thanh liên quan | breadcrumb + liên kết về cha | 6 bài theo cửa sổ xoay vòng + tối đa 4 trên thanh liên quan | | |
| Checklist | breadcrumb | breadcrumb | | | | hreflang 10 bản |

## 5. Test bảo vệ

`tests/seo-v10.test.mjs`:
- mỗi bài hướng dẫn nhận ít nhất min(6, n−1) liên kết anh em, khối anh em có đúng min(6, n−1) liên kết, không tự trỏ, không lặp;
- `topicLinks` trên 8 bài giả lập (2 silo) cho thứ tự chính xác và đúng 6 liên kết tới mỗi bài;
- thanh bài liên quan bắt đầu bằng trang chủ ngôn ngữ, tối đa 5, không lặp, không tự trỏ.

Trạng thái: IMPLEMENTED, TESTED. `content-graph.json` và `docs/GLOBAL-SITE-MATRIX.md` được tạo lại (`--write`) và `--check` xanh.
