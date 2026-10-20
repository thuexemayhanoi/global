# 08 · Core Web Vitals / UX Findings

Ngày: 2026-10-20. Không có dữ liệu trường (CrUX, GA4, RUM). Chỉ có số liệu phòng thí nghiệm từ connector và quan sát mã nguồn.

## 1. Số liệu phòng thí nghiệm (Ubersuggest `pagespeed_audit`, URL gốc, 19:39 UTC)

| Chỉ số | Desktop | Mobile | Ngưỡng tốt |
|---|---|---|---|
| First Contentful Paint | 408 ms | 1,3 s | dưới 1,8 s |
| Largest Contentful Paint | 608 ms | 2,5 s | dưới 2,5 s |
| Speed Index | 675 ms | 4,5 s | dưới 3,4 s |
| Time to Interactive | 608 ms | 2,5 s | dưới 3,8 s |
| Total Blocking Time | 6 ms | 0 ms | dưới 200 ms |
| Cumulative Layout Shift | 0 | 0 | dưới 0,1 |
| Cơ hội duy nhất được báo | Redirects, tiết kiệm ước tính 190 ms | Redirects, 630 ms | |

Đọc kết quả:
- LCP mobile đúng ngưỡng 2,5 s và Speed Index mobile 4,5 s là hai chỉ số yếu nhất.
- "Redirects" cho thấy công cụ đi qua ít nhất một chuyển hướng trước khi tới trang (HTTP sang HTTPS hoặc dạng URL không canonical). Site không kiểm soát lớp này trong repo; GitHub Pages xử lý HTTPS. Mọi liên kết nội bộ đã là đường dẫn tuyệt đối HTTPS canonical nên người dùng đi trong site không gặp chuyển hướng.
- Chỉ đo được URL gốc; gói free cho 3 báo cáo mỗi ngày, đã dùng 1.

## 2. Crawl và phản hồi máy chủ

| Nguồn | Phạm vi | Kết quả |
|---|---|---|
| OpenSEO audit `1dba2554` | 50 trang | 50 × HTTP 200; thời gian phản hồi 9 đến 79 ms, trung vị 25 ms; 50 indexable; 50 trong sitemap; 16 đến 44 liên kết nội bộ mỗi trang (trung vị 37); 190 đến 2.302 từ (trung vị 1.721) |
| OpenSEO Lighthouse | 10 trang hoàn tất, 0 lỗi | điểm số chỉ xem được trong giao diện OpenSEO, MCP không trả về: BLOCKED cho việc ghi số vào báo cáo |
| OpenRush `audit_site` | 20 trang | 0 lỗi tải, không cảnh báo render, onpage 98 |

## 3. Quan sát từ mã nguồn (áp dụng cho 926 trang)

| Hạng mục | Hiện trạng | Đánh giá |
|---|---|---|
| Ảnh có `width`/`height` | hero 1600×900, ảnh chủ đề 960×720 | giữ CLS 0 |
| Tải ảnh | hero `fetchpriority="high"` + `loading="eager"`; ảnh khác `loading="lazy"`, `decoding="async"` | đúng |
| Dung lượng ảnh | `hero-hanoi.webp` 260 KB; 4 ảnh chủ đề 88 đến 163 KB | hero là ứng viên LCP trên trang gốc và trang chủ ngôn ngữ; 260 KB trên mobile là phần lớn thời gian LCP |
| CSS | `styles.css` 6,2 KB, `navigation.css` 3,9 KB, `premium.css` 11,3 KB, `ultra.css` 21,2 KB | tổng khoảng 43 KB chưa nén; không có CSS framework |
| JS | `premium.js` 1,5 KB, `ultra.js` 2,7 KB, `search.js` 3,6 KB (chỉ trang tìm kiếm) | đọc và điều hướng không cần JS; bộ điều khiển đọc ẩn cho tới khi có handler |
| Font | không tải font ngoài | không có FOIT/FOUT |
| Trình đơn ngôn ngữ | liên kết HTML thật | hoạt động không cần JS |
| Bố cục | container tối đa, bảng cuộn ngang | cần kiểm tra thực tế trên thiết bị khi có RUM |

## 4. Khuyến nghị (chưa thực hiện, ngoài phạm vi PR này)

1. Phục vụ hero ở hai kích thước bằng `srcset` (ví dụ 960 và 1600) hoặc nén lại mục tiêu dưới 120 KB cho 1600×900; thêm `<link rel="preload" as="image">` cho hero trên trang gốc và Pillar. Đây là đòn bẩy trực tiếp cho LCP mobile. Cần kiểm tra chất lượng ảnh bằng mắt trước khi thay tệp.
2. Giữ `ultra.css` cuối cùng trong thứ tự tải hoặc tách phần chỉ dùng cho trang gốc; đo lại Speed Index mobile sau thay đổi.
3. Sau khi merge, chạy lại `pagespeed_audit` cho một Hub và một bài Supporting (còn 2 báo cáo trong ngày) để có số liệu cho mẫu bài, không chỉ trang gốc.
4. Khi có property GSC hoặc CrUX cho tên miền, thay số liệu phòng thí nghiệm bằng số liệu trường trong tài liệu này.

Trạng thái: không có thay đổi mã về hiệu năng trong PR này (các thay đổi SEO không thêm tài nguyên tải thêm: chỉ thêm thẻ meta và vài trăm byte JSON-LD mỗi trang). Số liệu: TESTED bằng connector trước deploy; VERIFIED sau deploy cần chạy lại.
