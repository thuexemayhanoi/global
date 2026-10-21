# 04 · Cannibalization Audit

Ngày: 2026-10-20. Nguồn: `node scripts/seo/validate-plan.mjs` (cổng chặn trùng ý định trước khi Writer nhận đề tài), `data/seo/content-graph.json` (đồ thị nội dung, 19 cặp cần xem xét, 23 nút REVIEW), `docs/GLOBAL-SITE-MATRIX.md`. Độ tương đồng là lexical trên truy vấn giả thuyết; không có dữ liệu SERP hay truy vấn thật để xác nhận cannibalization thực tế.

## 1. Cổng chặn đang hoạt động

| Cổng | Ngưỡng | Kết quả hôm nay |
|---|---|---|
| `validate-plan`: hai dòng Hub/Supporting không phải cha con có overlap truy vấn ≥ 0,66 mà không có `distinct_from` ≥ 40 ký tự | FAIL | SEO MATRIX VALID, 0 vi phạm trên 1.781 dòng |
| `content-graph`: overlap ≥ 0,66 khác silo, hoặc ≥ 0,50 cùng silo cùng ý định | REVIEW (khuyến nghị) | 19 cặp |
| `seo-guard`: hai URL live trùng title, H1 hoặc description | FAIL | 0 |
| URL trùng lặp trong Matrix hoặc sitemap | FAIL | 0 (926 URL duy nhất) |
| Hreflang chỉ giữa bản tương đương | kiểm tra bằng test | 0 lỗi (xem 05) |

## 2. 19 cặp cần xem xét (từ `content-graph.json`)

Phân loại: 2 cặp giữa hai trang đã xuất bản, 4 cặp giữa trang đã xuất bản và IDEA, 7 cặp giữa hai IDEA, 6 cặp giữa ứng viên topical chưa thành IDEA. Cùng silo và cùng ý định ở cả 19 cặp.

| ID A | Trạng thái A | Truy vấn A | ID B | Trạng thái B | Truy vấn B | Điểm |
|---|---|---|---|---|---|---|
| VI-S09 | PUBLISHED SUPPORT | Bằng A1 và bằng A theo luật mới: được lái loại xe máy nào khi thuê? | VI-S112 | IDEA SUPPORT | Bằng lái A1 cấp trước năm 2025: còn được chạy xe nào và đổi sang hạng A thì thay đổi gì | 0.64 |
| EN-S09 | PUBLISHED SUPPORT | International Driving Permits for Motorbikes in Vietnam | EN-S142 | IDEA SUPPORT | Genuine and Fake International Driving Permits for Vietnam: Who Issues Them in the UK, Australia and the US | 0.6 |
| TA-KO-0100 | CANDIDATE | 하노이에서 사파 기차 타는 법 | TA-KO-0101 | CANDIDATE | 하노이에서 닌빈 기차 타는 법 | 0.6 |
| KO-S142 | IDEA SUPPORT | 혼다 Wave RSX FI, Blade, Future 125 FI: 세미오토 모델의 차이와 필요한 면허 종류 | KO-S147 | IDEA SUPPORT | 혼다 Air Blade와 Vario의 125·160 버전: 구별하는 방법과 버전별 필요 면허 | 0.58 |
| TA-ZH-0157 | CANDIDATE | 同文喀斯特高原 联合国教科文组织世界地质公园 有什么看点 | TA-ZH-0167 | CANDIDATE | 谅山 联合国教科文组织 世界地质公园 有什么看点 溶洞 北山 | 0.58 |
| VI-S142 | IDEA SUPPORT | Honda Wave RSX FI, Blade và Future 125 FI: xe số Honda khác nhau thế nào và cần bằng lái hạng nào | VI-S147 | IDEA SUPPORT | Honda Air Blade và Vario bản 125 và 160: cách phân biệt và mỗi bản cần bằng lái hạng nào | 0.58 |
| JA-S142 | IDEA SUPPORT | ホンダ Wave RSX FI・Blade・Future 125 FIの違い：セミオートマ車の特徴と必要な免許区分 | JA-S147 | IDEA SUPPORT | ホンダ Air BladeとVarioの125と160：見分け方と必要な免許区分 | 0.55 |
| NL-S122 | IDEA SUPPORT | Honda SH Mode, SH160i en SH350i: zo verschillen de premium scooters en dit rijbewijs heb je nodig | NL-S123 | IDEA SUPPORT | Vespa Primavera, Sprint en GTS: zo verschillen ze van een Honda-scooter en dit rijbewijs heb je nodig | 0.55 |
| EN-S32 | PUBLISHED SUPPORT | Compulsory Motorbike Insurance in Vietnam: What the Rental Bike's Policy Covers | EN-S110 | IDEA SUPPORT | Claiming Compulsory Motorbike Insurance in Vietnam After an Accident: Who Can Claim and Which Documents | 0.5 |
| ES-S05 | PUBLISHED SUPPORT | Permiso de conducir extranjero y motos en Vietnam | ES-S38 | PUBLISHED SUPPORT | Convertir el carnet de conducir español en Vietnam: requisitos, papeles y trámites | 0.5 |
| JA-S10 | PUBLISHED SUPPORT | ベトナムのバイク事故は海外旅行保険で補償される？ | JA-S135 | IDEA SUPPORT | ベトナムのレンタルバイク事故と海外旅行保険：損保協会Q&Aが示す無資格運転・酒酔い運転の免責と確認点 | 0.5 |
| NL-S11 | PUBLISHED SUPPORT | Scooterrijden in het verkeer van Hanoi: zo werkt de stroom | NL-S68 | PUBLISHED SUPPORT | Haarspeldbochten op de scooter: zo rijd je veilig door bergbochten | 0.5 |
| NL-S123 | IDEA SUPPORT | Vespa Primavera, Sprint en GTS: zo verschillen ze van een Honda-scooter en dit rijbewijs heb je nodig | NL-S143 | IDEA SUPPORT | Honda Wave RSX FI, Blade en Future 125 FI: verschillen tussen deze halfautomaten en benodigd rijbewijs | 0.5 |
| NL-S123 | IDEA SUPPORT | Vespa Primavera, Sprint en GTS: zo verschillen ze van een Honda-scooter en dit rijbewijs heb je nodig | NL-S144 | IDEA SUPPORT | Suzuki Satria, Raider en andere Suzuki's in Vietnam: huidig aanbod, cilinderinhoud en rijbewijs | 0.5 |
| NL-S143 | IDEA SUPPORT | Honda Wave RSX FI, Blade en Future 125 FI: verschillen tussen deze halfautomaten en benodigd rijbewijs | NL-S148 | IDEA SUPPORT | Honda Air Blade en Vario als 125 en 160: zo herken je het verschil en het benodigde rijbewijs | 0.5 |
| TA-DE-0125 | CANDIDATE | Besuch der Kaiserlichen Zitadelle von Thang Long | TA-DE-0127 | CANDIDATE | Wasserpuppentheater in Hanoi Thang Long Besuch | 0.5 |
| TA-JA-0100 | CANDIDATE | ハノイからサパへ電車で行く方法 | TA-JA-0101 | CANDIDATE | ハノイからニンビンへ電車で行く方法 | 0.5 |
| TA-KO-0106 | CANDIDATE | 하노이에서 바비 국립공원 오토바이로 가기 | TA-KO-0109 | CANDIDATE | 하노이에서 땀다오 오토바이로 가기 | 0.5 |
| TA-VI-0130 | CANDIDATE | tham quan Vườn quốc gia Cúc Phương từ Hà Nội | TA-VI-0131 | CANDIDATE | tham quan Vườn quốc gia Ba Bể và hồ Ba Bể | 0.5 |

## 3. Đánh giá từng nhóm

### Hai trang đã xuất bản (2 cặp): không đổi URL, không gộp
- ES-S05 (giấy phép nước ngoài có dùng được không) và ES-S38 (thủ tục đổi bằng Tây Ban Nha): hai câu hỏi khác nhau trong cùng hành trình; độ tương đồng đến từ các từ "permiso", "conducir", "Vietnam". Giữ hai trang; thêm liên kết chéo trong thân bài khi có PR biên tập. Không xóa, không chuyển hướng.
- NL-S11 (đi trong dòng xe Hà Nội) và NL-S68 (cua tay áo trên đường núi): khác hoàn cảnh lái. Điểm 0,50 là ngưỡng tối thiểu; không hành động.

### Trang đã xuất bản và IDEA (4 cặp): cần `distinct_from` trước khi Writer nhận
- VI-S112 so với VI-S09: IDEA đi sâu vào bằng A1 cấp trước 2025; phải khai `distinct_from` nêu rõ phạm vi "bằng cũ và quy đổi" và trỏ về VI-S09 như bài tổng quan. Điểm 0,64 gần ngưỡng FAIL 0,66.
- EN-S142 so với EN-S09: IDEA về IDP thật và giả theo quốc gia cấp; cần `distinct_from` và tiêu đề tránh lặp "International Driving Permits for Motorbikes in Vietnam".
- EN-S110 so với EN-S32: thủ tục đòi bồi thường so với phạm vi bảo hiểm; hợp lệ nhưng cần `distinct_from`.
- JA-S135 so với JA-S10: IDEA dựa trên Q&A của hiệp hội bảo hiểm; cần `distinct_from` nêu rõ góc nhìn "loại trừ bồi thường" so với bài tổng quan.

### Hai IDEA (7 cặp): dòng xe Honda, Vespa, Suzuki ở vi, ja, ko, nl
Các cặp S142/S147, S122/S123, S123/S143, S123/S144, S143/S148 đều là bài so sánh dòng xe trong cùng silo "chọn xe". Trùng nhau ở phần "bằng lái cần có" trong tiêu đề. Khuyến nghị cho Topic Factory và Writer: giữ mỗi bài là một dòng xe, bỏ cụm "và bằng lái cần có" khỏi tiêu đề của các bài không phải bài tổng quan bằng lái, và khai `distinct_from`. Không gộp vì mỗi dòng xe có câu hỏi riêng.

### Ứng viên topical (6 cặp): chưa là IDEA, chưa là URL
TA-KO-0100/0101, TA-JA-0100/0101 (tàu đi Sa Pa và Ninh Bình), TA-ZH-0157/0167 (hai công viên địa chất), TA-DE-0125/0127 (hai điểm tham quan Thăng Long), TA-KO-0106/0109, TA-VI-0130/0131 (hai điểm đến từ Hà Nội). Đây là các bài điểm đến khác nhau; chỉ trùng từ vựng. Giữ ở trạng thái ARCHITECTURE_BLOCKED theo quy định domain chưa có Hub; khi có PR kiến trúc, `distinct_from` được sao chép sang Matrix tự động.

## 4. Việc không làm trong PR này

- Không đổi, gộp, xóa hay chuyển hướng URL nào.
- Không sửa Matrix hay `distinct_from` bằng tay (Topic Factory và PR kiến trúc là đường đi đúng).
- Không suy luận cannibalization thật từ SERP: chỉ có 1 lần quan sát `/es/topics/elegir-moto/` ở hạng 7 (xem 03), không đủ để kết luận gì.

## 5. Theo ngôn ngữ

| Ngôn ngữ | Cặp live-live | Cặp live-IDEA | Cặp IDEA-IDEA | Cặp ứng viên | Hành động |
|---|---|---|---|---|---|
| vi | 0 | 1 | 1 | 1 | `distinct_from` cho VI-S112 trước khi claim |
| en | 0 | 2 | 0 | 0 | `distinct_from` cho EN-S142, EN-S110 |
| de | 0 | 0 | 0 | 1 | không |
| fr | 0 | 0 | 0 | 0 | không |
| es | 1 | 0 | 0 | 0 | liên kết chéo biên tập ES-S05 và ES-S38 |
| nl | 1 | 0 | 4 | 0 | tiêu đề IDEA dòng xe nl cần tách cụm bằng lái |
| zh | 0 | 0 | 0 | 1 | không |
| pt | 0 | 0 | 0 | 0 | không |
| ko | 0 | 0 | 1 | 2 | như nl |
| ja | 0 | 1 | 1 | 1 | `distinct_from` cho JA-S135 |

Trạng thái: audit TESTED (`validate-plan` xanh, `content-graph --check` xanh). Không có thay đổi mã.
