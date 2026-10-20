# 03 · Multilingual Keyword & Intent Mapping

Ngày thu thập: 2026-10-20 (19:40 đến 19:48 UTC). Mọi con số dưới đây là ước lượng của chỉ mục nhà cung cấp, kèm nguồn, thị trường và thời điểm. Matrix vẫn giữ `NOT_VALIDATED` cho mọi truy vấn: không có GSC, không có tracking thứ hạng, không suy luận lưu lượng. Từ khóa giao dịch (thuê xe, giá thuê) thuộc về thuexemaynguyentu.com (vi) và rentbikehanoi.com (en) theo `data/seo/topic-factory/policy.json`; /global chỉ nhắm ý định thông tin.

## 1. Nguồn dữ liệu và giới hạn

| Nguồn | Dùng cho | Chi phí đã dùng | Giới hạn gặp phải |
|---|---|---|---|
| OpenSEO `get_serp_results` (desktop, depth 10) | 10 SERP đầu ngôn ngữ, một truy vấn hạt giống mỗi ngôn ngữ | khoảng 35 credit | chỉ 1 truy vấn mỗi ngôn ngữ để giữ credit cho site audit; 325 → 235 credit còn lại sau toàn bộ phiên |
| OpenRush `research_keywords` (`source_class` search_index, confidence 0,7) | ý tưởng và gợi ý từ khóa en, vi, de, fr, es, nl, pt, ko, ja | hết credit sau lần gọi zh | zh không có dữ liệu (tham số ngôn ngữ phải là "Chinese (Simplified)", rồi tài khoản báo 402) |
| Ubersuggest `keyword_suggestions` (US, en) | đối chiếu khối lượng en | 1 trong 3 báo cáo mỗi ngày | gói free |
| Firecrawl | | | 402, không dùng được |

## 2. SERP đầu ngôn ngữ (OpenSEO, 2026-10-20, desktop)

| Ngôn ngữ | Truy vấn hạt giống | Thị trường (mã) | Tính năng SERP | Top organic (tên miền) | Trang của hệ sinh thái trong top 10 |
|---|---|---|---|---|---|
| en | motorbike rental Hanoi | US (2840) | local pack 3, PAA | travelchinaguide, theextramile, tripadvisor, hanoimidorihomes, motorbikenguyentu.wikidot, riderly | không có |
| vi | thuê xe máy Hà Nội | VN (2704) | local pack 3 | vexere, luhanhvietnam, facebook, otosaigon, justfly, thuexemaynguyentu.com, motortrip | thuexemaynguyentu.com hạng 9 (organic 6) |
| de | Motorrad mieten Hanoi | DE (2276) | AI Overview, local pack 3 | tigitmotorbikes, tripadvisor.at, riderly, indochinamotorbiketours, facebook, tripadvisor.de | không có |
| fr | location de moto à Hanoï | FR (2250) | local pack 3, PAA | riderly, rentalmotorbike, tripadvisor.fr, bikesbooking, vietnamdragontravel, petitfute | không có |
| es | alquiler de motos en Hanói | ES (2724) | local pack 3 | rentalmotorbike (trang tiếng Pháp), bikesbooking, tripadvisor.com.pe, **global.rentbikehanoi.com**, nomagoo, facebook | `/es/topics/elegir-moto/` hạng 7 (organic 4) |
| nl | motor huren Hanoi | NL (2528) | local pack 3, PAA | tripadvisor.in, flamingotravel, tripadvisor.ie, tripadvisor.in, book2wheel (trang tiếng Ba Lan), facebook | không có |
| zh | 河内摩托车租赁 | SG (2702), zh-CN | AI Overview | rovemoto, instagram, tripadvisor.com.tw, tripadvisor.com.hk, facebook, tripadvisor.in, youtube | không có |
| pt | aluguel de motos Hanói | PT (2620) | local pack 3 | riderly, rentalmotorbike, tripadvisor.pt, rentalmotorbike, riderly, vietnamtourism.com (trang tiếng Tây Ban Nha), facebook | không có |
| ko | 하노이 오토바이 렌트 | KR (2410) | AI Overview | myrealtrip, tripadvisor.co.kr, reddit, naver blog, facebook, ko.rentbikehanoi.com ×2, naver blog | ko.rentbikehanoi.com hạng 7 và 8 |
| ja | ハノイ バイクレンタル | JP (2392) | AI Overview, PAA | usagiyah, riderly, ja.rentbikehanoi.com, rentalmotorbike ×2, tripadvisor, giahungmotorbikerental | ja.rentbikehanoi.com hạng 5 nhưng là trang `/privacy-policy/` |

Đọc kết quả:
- Truy vấn đầu ngôn ngữ là giao dịch: local pack và sàn đặt xe (riderly, rentalmotorbike, bikesbooking) cùng Tripadvisor chiếm top 10 ở 8/10 thị trường. Đây là lý do /global không nhắm các truy vấn này.
- AI Overview xuất hiện ở de, zh, ko, ja; PAA ở en, fr, nl, ja. Trang hướng dẫn thông tin có cấu trúc rõ (H2 trả lời trực tiếp, nguồn chính thức, breadcrumb, Article schema) là định dạng phù hợp để được trích dẫn (xem 07).
- Ở nl và pt, Google trả về trang tiếng Anh, Ba Lan hoặc Tây Ban Nha vì thiếu nội dung bản ngữ: đây là khoảng trống nội dung, chưa được xác nhận bằng số liệu nhu cầu.
- Một lần quan sát duy nhất `/es/topics/elegir-moto/` ở hạng 7 không phải tracking thứ hạng và không được ghi vào Matrix như thành tích.
- Kết quả `ja.rentbikehanoi.com/privacy-policy/` cho truy vấn chính là tín hiệu cần kiểm tra ở tên miền đó (ngoài phạm vi repo này); ghi nhận để chủ sở hữu biết.

## 3. Dữ liệu từ khóa theo ngôn ngữ (OpenRush, Ubersuggest)

Chỉ liệt kê từ khóa liên quan tới Việt Nam hoặc Hà Nội. "Khối lượng" là ước lượng tháng của chỉ mục, không phải số liệu đo.

### en (US)
| Từ khóa | Khối lượng | Ý định | Nguồn |
|---|---|---|---|
| hanoi motorbike rental | 110 (SD 37, CPC 0,25 USD) | giao dịch | Ubersuggest, 2026-10-20 |
| scooter rental hanoi | 30 (SD 24, CPC 0,16 USD) | giao dịch | Ubersuggest |
| rent motorbike hanoi monthly | không có dữ liệu | | Ubersuggest |
| OpenRush ideas "hanoi motorbike rental" | 40 kết quả trả về trên 94.732 dòng chỉ mục, không dòng nào liên quan Hà Nội | | OpenRush |

### vi (VN)
OpenRush ideas cho "thuê xe máy hà nội" trả về 40 trên 3.089.005 dòng; 22 dòng chứa "hà nội" nhưng đều là truy vấn chung (thời tiết, xổ số, ga Hà Nội). Không có dữ liệu dùng được cho chủ đề xe máy. Từ khóa giao dịch tiếng Việt thuộc thuexemaynguyentu.com.

### de (DE)
| Từ khóa | Khối lượng | Ý định |
|---|---|---|
| hanoi roller mieten | 10 (CPC 0,52 USD, cạnh tranh MEDIUM) | giao dịch |
| hanoi scooter traffic | 10 | thông tin |
| hanoi motorbike traffic | 10 | thông tin |
| hanoi vespa tour / vespa tour hanoi | 10 | thương mại |
| scooter hanoi | 10 (CPC 0,12 USD) | điều hướng |
| buy scooter hanoi / buy motorbike hanoi | 10 | giao dịch |

### fr (FR)
| Từ khóa | Khối lượng | Ý định |
|---|---|---|
| scooter vietnam | 260 | giao dịch |
| prix scooter vietnam | 20 | thương mại |
| permis international vietnam scooter | 20 | thông tin |
| scooter hanoi | 20 (CPC 0,54 USD) | điều hướng |
| scooter vietnam permis | 10 | thương mại |
| accident scooter vietnam | 10 | thông tin |
| hanoi scooter traffic | 10 | thông tin |
| maxi scooter vietnam | 10 | giao dịch |

### es (ES)
| Từ khóa | Khối lượng | Ý định |
|---|---|---|
| alquiler moto vietnam | 40 (CPC 0,70 USD) | giao dịch |
| moto tour vietnam | 20 (CPC 1,29 USD, cạnh tranh HIGH) | thương mại |
| rent motorbike hanoi | 20 | giao dịch |
| vietnam ruta moto | 10 | thông tin |
| loop vietnam moto | 10 | thông tin |
| accidente moto vietnam | 10 | thông tin |
| comprar moto vietnam | 10 | giao dịch |
| scooter rent hanoi / mopeds in hanoi | 10 | giao dịch |

### nl (NL)
OpenRush ideas cho "scooter huren Hanoi" trả về 25 trên 114.427 dòng, không dòng nào liên quan Việt Nam (toàn bộ là bảo hiểm, lý thuyết và mua scooter trong nước). Không có số liệu nhu cầu bản ngữ; SERP trả về trang ngoại ngữ.

### zh
Không có dữ liệu từ khóa (lỗi tham số rồi hết credit). SERP zh có AI Overview và không có trang bản ngữ chuyên về hướng dẫn trong top 10.

### pt (PT)
OpenRush ideas cho "alugar moto Hanói" trả về 15 trên 28.881 dòng, toàn bộ là thuê ô tô trong nước; chế độ suggestions trả về 0. Không có số liệu nhu cầu bản ngữ.

### ko (KR)
| Từ khóa | Khối lượng | Ý định |
|---|---|---|
| 하노이 오토바이 렌트 | 20 (CPC 0,28 USD) | giao dịch |
| 하노이 오토바이 렌트 가격 | 10 | thương mại |

### ja (JP)
| Từ khóa | Khối lượng | Ý định |
|---|---|---|
| ハノイ 50ccバイク レンタル | 10 | giao dịch (gắn với chủ đề 50cc và bằng lái) |
| ハノイ レンタル バイク ショップ | 10 | giao dịch |

## 4. Ánh xạ ý định sang kiến trúc hiện có

Mỗi ngôn ngữ có 4 Hub (chọn xe; giá và đặt cọc; giấy tờ và hợp đồng; an toàn và kiểm tra khi nhận xe) với các silo con là mục trong Hub, không phải URL. Ánh xạ dưới đây chỉ nói "truy vấn kiểu này đã có trang loại nào", không gán khối lượng cho trang.

| Nhóm ý định quan sát được | Ví dụ truy vấn từ dữ liệu | Hub tiếp nhận | Trạng thái nội dung |
|---|---|---|---|
| Bằng lái, IDP, hạng bằng | permis international vietnam scooter, scooter vietnam permis, ハノイ 50ccバイク | Giấy tờ và hợp đồng | đã có bài ở 10 ngôn ngữ; 2 cặp trùng ý định cần `distinct_from` (xem 04) |
| Giao thông, tai nạn, an toàn | hanoi scooter traffic, accident scooter vietnam, accidente moto vietnam | An toàn | đã có bài; Hub ja và zh bị OpenRush đếm "mỏng" do cách đếm từ, không cần viết lại |
| Lộ trình, loop, tour | vietnam ruta moto, loop vietnam moto, hanoi vespa tour | chưa có Hub | domain `routes-trips` ở trạng thái RESEARCH_OPEN; cần PR kiến trúc với tối thiểu 8 ứng viên Supporting trước khi thành IDEA |
| Mua xe, bán xe | buy motorbike hanoi, comprar moto vietnam, hanoi honda win kaufen | ngoài phạm vi | không nhận |
| Thuê xe, giá thuê (giao dịch) | hanoi motorbike rental, 하노이 오토바이 렌트, alquiler moto vietnam | ngoài phạm vi /global | thuộc thuexemaynguyentu.com và rentbikehanoi.com theo policy |
| Giá và đặt cọc (thông tin) | 하노이 오토바이 렌트 가격, prix scooter vietnam | Giá và đặt cọc | đã có bài; mọi đoạn tiền cần nguồn HTTPS có ngày (fact-guard) |

## 5. Việc chưa làm được và cách tiếp tục

- BLOCKED: nghiên cứu zh (OpenRush hết credit), site audit Ubersuggest (trả phí), Firecrawl (402).
- Chưa có nhu cầu bản ngữ cho nl, pt, zh: không được điền số; giữ `NOT_VALIDATED`.
- Khi có thêm credit: chạy `research_keywords` với seed thông tin (bằng lái, bảo hiểm, phạt nguội, mũ bảo hiểm) thay vì seed giao dịch, mỗi ngôn ngữ 3 đến 5 seed, và lưu kết quả vào `factory/topic-research/batches/` qua `scripts/topic-research.mjs` để Topic Factory dùng được; không ghi tay vào Matrix.
