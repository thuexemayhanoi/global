# Đề xuất kiến trúc Hub mới — chờ chủ sở hữu quyết định

Ngày 28/10/2026. Tài liệu chỉ để quyết định: không thay đổi Matrix, URL, điều hướng hay sitemap. Số liệu sinh từ `data/seo/topical-authority/architecture.json` và các map `data/seo/topical-authority/<locale>.json`.

## Vì sao cần quyết định của chủ sở hữu

- Theo `docs/TOPICAL-AUTHORITY.md` và `AGENTS.md`, taxonomy, điều hướng (`scripts/navigation.mjs`, `nav-qa`: 4 Hub mỗi ngôn ngữ) và hợp đồng Matrix đều cố định 4 Hub.
- Thêm Hub thứ 5 trở lên cần chủ sở hữu duyệt kiến trúc trong một PR đã review. Agent không tự mở khóa.
- Điều kiện "≥8 ứng viên Supporting đã kiểm chứng mỗi Hub, mỗi ngôn ngữ" **đã đạt cho cả 6 miền ở 10 ngôn ngữ** (bảng dưới).
- Đây là tín hiệu đủ điều kiện xem xét, không phải phê duyệt tự động.

## Ứng viên đang ARCHITECTURE_BLOCKED theo Hub đề xuất

| Hub đề xuất | Phạm vi | vi | en | de | fr | es | nl | zh | pt | ko | ja | Tổng | Nguồn tham chiếu | Liên quan tới từ khóa thương mại |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `routes-trips` | Hành trình xe máy từ Hà Nội (Ha Giang Loop, đi trong ngày, một chiều) | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 90 | 300 | Cao: người thuê xe hỏi "đi đâu bằng xe thuê"; Ha Giang xuất hiện trong SERP từ khóa chính fr/ko/pt (khoảng trống G6). |
| `electric-mobility` | Xe máy điện & di chuyển bền vững | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 100 | 370 | Trung bình–cao: thuê xe máy điện là biến thể thương mại ("giá thuê xe máy điện hà nội" có trong autocomplete 28/10/2026). |
| `travel-planning` | Lập kế hoạch, ngân sách, lịch trình | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 120 | 490 | Trung bình: ngân sách và lịch trình dẫn tới quyết định thuê xe. |
| `transport-mobility` | Giao thông & di chuyển đô thị | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 110 | 345 | Trung bình: so sánh xe thuê với bus, metro, Grab. |
| `travel-guides` | Cẩm nang du lịch Hà Nội & Việt Nam | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 110 | 380 | Thấp–trung bình: thông tin du lịch, tạo độ phủ chủ đề. |
| `destinations-experiences` | Điểm đến & trải nghiệm | 16 | 16 | 16 | 16 | 16 | 16 | 16 | 16 | 16 | 16 | 160 | 660 | Thấp–trung bình: điểm đến; phụ thuộc vào Hub hành trình. |

Tổng: **690** ứng viên đã nghiên cứu, có nguồn và qua kiểm tra trùng lặp. Không ứng viên nào là trang hay URL công khai.

## Ví dụ ứng viên (en) cho Hub ưu tiên `routes-trips`

- Riding the Ha Giang Loop on a Bike Rented in Hanoi
- Hanoi to Ninh Binh by Motorbike: Planning a Day Ride
- Hanoi to Ba Vi National Park by Motorbike: Route, Mountain Road and What to Check Before You Ride
- Hanoi to the Perfume Pagoda by Motorbike: the Road to Ben Duc, Festival Crowds and the Boat Ride
- Hanoi to Cao Bang and Ban Gioc Waterfall by Motorbike: Loop Options Through the Geopark
- Hanoi to Tam Dao by Motorbike: The Route via Vinh Yen, the Mountain Climb and Fog Riding
- Hanoi to Mai Chau and Pu Luong by Motorbike: Two- and Three-Day Route Options and Mountain Passes
- Hanoi to Sa Pa by Motorbike: Why Expressways Are Off Limits, the National-Road Options and the Tram Ton Pass
- Hanoi to Moc Chau by Motorbike: National Road 6, the Mountain Passes and the Plum Blossom and Tea Seasons

## Phương án

| Phương án | Nội dung | Tác động | Rủi ro |
|---|---|---|---|
| **A (khuyến nghị)** | Duyệt `routes-trips` làm Hub thứ 5 ở 10 ngôn ngữ | Mở 90 chủ đề gắn trực tiếp với việc thuê xe đi tỉnh; bao phủ khoảng trống G6 | Cần cập nhật điều hướng/nav-qa, taxonomy, Matrix Hub rows; Writer viết Hub trước Supporting |
| B | Duyệt A và thêm `electric-mobility` | Thêm 100 chủ đề, có biến thể thương mại "thuê xe máy điện" | Khối lượng thay đổi lớn hơn |
| C | Duyệt cả 6 miền | 690 chủ đề | Thay đổi kiến trúc lớn; nguy cơ loãng chủ đề khỏi lõi thuê xe |
| D | Hoãn | Không đổi | Bỏ trống khoảng trống G6 trên SERP |

## Nếu chủ sở hữu duyệt (A), PR kiến trúc sẽ gồm

1. Hàng Matrix HUB mới `XX-H05` cho 10 ngôn ngữ: URL bản địa, primary_query có nghiên cứu, `parent_id` là Pillar.
2. Cập nhật `architecture.json`: `routes-trips` chuyển sang ACTIVE.
3. Cập nhật taxonomy, `scripts/navigation.mjs` và `nav-qa`: 5 Hub, các nhãn con.
4. Topic Factory đưa ứng viên từ ARCHITECTURE_BLOCKED lên IDEA theo standing policy.
5. Writer viết Hub trước, Supporting sau: WAIT_PARENT đến khi Hub PUBLISHED.
6. Chạy toàn bộ cổng QA: build `--check`, seo-guard, validate-plan, nav-qa, language-audit, topical-authority, live QA.

Việc này nằm trong OWNER_ACTION_REQUIRED của báo cáo SEO A–Z.
