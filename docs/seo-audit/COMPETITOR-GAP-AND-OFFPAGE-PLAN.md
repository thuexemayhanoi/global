# Đối thủ, khoảng trống nội dung và kế hoạch off-page — 28/10/2026

Áp dụng chỉ thị chủ sở hữu 28/10/2026 (`approvals/owner-directive-20261028-independent-seo.json`). /global là dự án SEO độc lập, cạnh tranh mọi từ khóa thuê xe máy thương mại trong 10 ngôn ngữ và không nhường từ khóa cho tên miền nào. Mục tiêu Top 1–3 Google là KPI để theo dõi bằng SERP và Search Console, không phải cam kết.

Bằng chứng:

- Từ khóa chính và các biến thể: [`data/seo/commercial-head-terms.json`](../../data/seo/commercial-head-terms.json).
- SERP: [`reports/seo/data/raw/serp-head-terms-20261028.json`](../../reports/seo/data/raw/serp-head-terms-20261028.json) (Ubersuggest `serp_analysis`, 9 thị trường).
- Hồ sơ tên miền: `reports/seo/data/raw/external-evidence.json` → `ubersuggest_domain_overview`.

Mọi con số dưới đây đều do công cụ trả về. Không có số nào được ước đoán thêm.

## 1. Vị trí hiện tại

| Chỉ số (Ubersuggest, 28/10/2026) | Giá trị |
|---|---|
| Từ khóa organic được ghi nhận | 0 |
| Domain Authority | 2 |
| Backlink / referring domain | 37 / 32 |
| Có trong kết quả SERP đã đo cho từ khóa chính (9 thị trường) | Không xuất hiện ở thị trường nào |

**Giới hạn đo lường:**

- Chưa kết nối Google Search Console, nên chưa biết số hiển thị và thứ hạng thật.
- Danh sách SERP chỉ phản ánh lần thu thập của công cụ (vi: 13/09/2026; các thị trường khác: 28/10/2026).
- Thị trường zh không đo: không có thị trường Google tiếng Trung giản thể, Baidu chưa kết nối.

## 2. Ai đang thắng SERP từ khóa chính

| Thị trường · từ khóa | Nhóm chiếm SERP | Ví dụ (vị trí · DA) |
|---|---|---|
| vi · thuê xe máy hà nội | Trang chủ cửa hàng, nhóm Facebook, bài hướng dẫn và danh sách địa chỉ | motogo.vn #1 · 34; vinwonders.com #7 · 37 (kinh nghiệm, thủ tục, giá); vinpearl.com #11 · 49 ("15 địa chỉ uy tín"); vexere.com #10 · 42 (bảng giá) |
| en · motorbike rental hanoi | Local pack 3 cửa hàng, trang cửa hàng, Facebook, Tripadvisor, cẩm nang | vietnammotorbikerental.com #4 · 23; travelchinaguide.com #9 · 70 (giá, cửa hàng, mẹo) |
| de · motorrad mieten hanoi | Tripadvisor, cửa hàng, Reddit, AI Overview, marketplace | indochinamotorbiketours.com #3 · 18 (tự thuê hay đi tour có hướng dẫn); riderly.com #9 · 36 |
| fr · location moto hanoi | AI Overview, cẩm nang du lịch, Petit Futé, diễn đàn | fairmoove.fr #2 · 35 (guide complet); aventure-vietnam.com #9 · 28; voyageforum.com #14 · 57 |
| es · alquiler moto hanoi | Tripadvisor, marketplace, Facebook | rentalmotorbike.com #2 · 35; bikesbooking.com #8 · 31 |
| nl · motor huren hanoi | AI Overview, local pack, marketplace, Tripadvisor | rentabikevn.com #5 · 25; offroadvietnam.com #13 · 32 |
| pt · alugar moto hanoi (BR) | Marketplace, Tripadvisor, danh sách cửa hàng, YouTube | riderly.com #1 · 36; vietnamtourism.com #4 · 62 ("16 lojas") |
| ko · 하노이 오토바이 렌트 | Reddit, blog Tistory/Naver, OTA (Yanolja, Klook) | subjectivehonest.tistory.com #2 · 89 (so sánh đơn vị cho thuê) |
| ja · ハノイ レンタルバイク | Blog cá nhân, marketplace, OTA | sorairo.blog #1 · 11 (lái không bằng); vietnamtourism.com #5 · 62 (so sánh ứng dụng thuê xe) |

**Kết luận:**

1. SERP từ khóa chính là SERP hỗn hợp. Cạnh tranh có các trang chủ cửa hàng (DA 5–35, thường có local pack) và nội dung hướng dẫn hoặc đánh giá (UGC, cẩm nang, danh sách).
2. /global không có cửa hàng và không có hồ sơ doanh nghiệp. Đường cạnh tranh hợp lệ là trở thành nội dung hướng dẫn và đánh giá tốt nhất cho từng thị trường.
3. AI Overview xuất hiện ở 7/9 SERP (de, fr, es, nl, pt, ko, ja). Câu trả lời ngắn, rõ ràng và có nguồn là điều kiện để được trích dẫn.
4. Nhiều trang cạnh tranh có DA thấp (5–35). Khoảng cách chính của /global là độ tin cậy ngoài trang (DA 2) và tín hiệu đo lường (GSC), không phải độ dài nội dung.

## 3. Khoảng trống nội dung và hành động

| # | Khoảng trống quan sát trên SERP | /global hiện có | Hành động | Trạng thái |
|---|---|---|---|---|
| G1 | Từ khóa chính chưa nằm trong H1 và mô tả của một số Pillar | — | Batch G (PR #127): H1 de, fr, es, pt, ja mở đầu bằng từ khóa chính; mô tả vi, de, fr, es, pt, ja chứa từ khóa | ĐÃ SỬA, chờ live QA |
| G2 | "Kinh nghiệm, thủ tục, giá" (vi), "guide complet" (fr), "price & tips" (en) | Pillar 10 ngôn ngữ đều có 11 mục hướng dẫn, 4 chủ đề, FAQ, Hub giá/đặt cọc, giấy tờ, an toàn, chọn xe | Giữ nguyên. Không thêm giá hay mức cọc khi chưa có nguồn có ngày (fact-guard) | ĐÃ ĐỦ, không cần sửa |
| G3 | Danh sách "N địa chỉ uy tín", so sánh đơn vị cho thuê (vi, pt, ko) | Tiêu chí đánh giá và so sánh báo giá ("So sánh báo giá trên cùng một danh sách") | Không lập danh sách cửa hàng: cần dữ liệu doanh nghiệp đã xác minh và có ngày; không bịa tên, giá, đánh giá | CHẶN THEO CHÍNH SÁCH (cần dữ liệu thật) |
| G4 | So sánh ứng dụng thuê xe (ja) | Chưa có chủ đề | Đề xuất nghiên cứu Topic Factory: "thuê xe qua ứng dụng hay tại cửa hàng", 10 ngôn ngữ, nguồn thật, qua nhánh `research/*` | CHỜ WRITER / NGHIÊN CỨU |
| G5 | Tự thuê xe hay đi tour có hướng dẫn hoặc easy rider (de) | Chỉ có DE-S168 (Ha Giang easy rider) | Đề xuất nghiên cứu Topic Factory cho 10 ngôn ngữ | CHỜ WRITER / NGHIÊN CỨU |
| G6 | Ha Giang trong SERP fr, ko, pt | DE-S114, DE-S168 | Miền `routes-trips` đang ARCHITECTURE_BLOCKED: cần PR kiến trúc Hub với ≥8 Supporting đã xác minh | CHỜ PR KIẾN TRÚC |
| G7 | Câu hỏi về bằng lái (ja #1) | JA-H03, JA-S05, JA-S09, JA-S29 | Pillar đã liên kết Hub giấy tờ; theo dõi thứ hạng sau khi có GSC | ĐÃ CÓ NỘI DUNG |

## 4. Kế hoạch off-page hợp lệ (không mua link, không PBN, không backlink giả)

### Nguyên tắc

- Chỉ dùng liên kết biên tập tự nhiên, trích dẫn và nhắc tên thương hiệu.
- Không mua hoặc trao đổi link hàng loạt.
- Không tạo hồ sơ hay bình luận spam, không đánh giá giả.
- Không chép nội dung của site khác, không chỉnh sửa tên miền khác.
- Không chuyển hướng traffic hay thứ hạng sang tên miền khác.

### Giai đoạn 0 · Đo lường (chủ sở hữu, tuần 0–1)

1. Xác minh Search Console (Domain property `global.rentbikehanoi.com`) và gửi `https://global.rentbikehanoi.com/sitemap.xml`. Thẻ `google-site-verification` đã có trong `index.html`.
2. Quyết định GA4 hoặc không dùng analytics. Hiện site chưa có mã analytics (không có gtag).
3. Theo dõi thứ hạng cho 10 từ khóa chính (OpenSEO hoặc Ubersuggest). Việc này tốn credit nên cần chủ sở hữu duyệt.

### Giai đoạn 1 · Tài sản đáng được liên kết (nội bộ, đã có)

- Checklist thuê xe in được bằng 10 ngôn ngữ (`/<locale>/checklist/`).
- Hub giấy tờ và bằng lái có nguồn chính thức.
- Hub an toàn.
- Hướng dẫn kiểm tra xe khi nhận.

Đây là những trang đáng giới thiệu khi trả lời người du lịch.

### Giai đoạn 2 · Tiếp cận có biên tập (người thực hiện có tài khoản thật, tuần 2–12)

| Kênh | Thị trường | Cách làm hợp lệ |
|---|---|---|
| Blog du lịch đang xếp hạng (Tistory, Naver, ameblo, note, fairmoove, aventure-vietnam, worldwildbrice) | ko, ja, fr | Gửi email cá nhân giới thiệu checklist hoặc trang giấy tờ như nguồn bổ sung. Không trả tiền đặt link |
| Diễn đàn và cộng đồng (r/VietNam, r/hanoi, voyageforum, Tripadvisor forum) | en, de, fr, nl | Trả lời câu hỏi thật bằng nội dung đầy đủ, chỉ dẫn link khi thật sự hữu ích và nêu rõ quan hệ với site. Link thường là nofollow/ugc; giá trị chính là referral và thương hiệu |
| Trang tài nguyên du lịch và expat (wiki cộng đồng, trang "useful links" của nhóm cư dân) | tất cả | Đề xuất bổ sung trang hướng dẫn trung lập. Tôn trọng quy định từng trang |
| Đối tác đáng tin (khách sạn, hostel, trường dạy lái, bảo hiểm du lịch) | tất cả | Đề xuất trang checklist cho khách; chỉ khi họ chủ động muốn dẫn link |

### Giai đoạn 3 · AEO/GEO (liên tục)

- Giữ câu trả lời mở đầu ngắn, FAQ hiển thị khớp FAQPage, và nguồn chính thức có ngày.
- Theo dõi AI visibility khi chủ sở hữu duyệt chi phí công cụ.

### KPI (đo, không cam kết)

| KPI | Nguồn | Tần suất |
|---|---|---|
| Hiển thị và click theo từ khóa chính, từng ngôn ngữ | Search Console | Hằng tuần |
| Thứ hạng 10 từ khóa chính (mục tiêu Top 1–3) | Công cụ rank tracking | Hằng tuần |
| Referring domains (mốc 32 ngày 28/10/2026) | Ubersuggest backlinks | Hằng tháng |
| Trang được lập chỉ mục / số URL trong sitemap | Search Console | Hằng tháng |

## 5. Việc cần chủ sở hữu (OWNER_ACTION_REQUIRED)

1. Kết nối Search Console và gửi sitemap. Mọi KPI thứ hạng phụ thuộc bước này.
2. Duyệt credit cho rank tracking, AI visibility và đo volume còn thiếu (es, pt, zh và dạng chính xác của ko/ja).
3. Chỉ định người thực hiện outreach bằng tài khoản thật. Agent không đăng bài lên diễn đàn hay gửi email thay chủ sở hữu.
4. Mở phiên Writer cho các đề xuất nghiên cứu G4/G5, và PR kiến trúc Hub cho miền `routes-trips` (G6).
