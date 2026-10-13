# 3 External Writers — GLOBAL (không API)

**Chỉ áp dụng repo:** `thuexemayhanoi/global` → `https://global.rentbikehanoi.com/`.
**Tham khảo đã kiểm chứng:** `thuexemayhanoi/total` (`docs/PRODUCTION-ROLES.md`, `docs/MISTRAL-WRITER.md`, `AGENTS.md`, `factory/writer-control.json`, `factory-publish.yml`). Production hiện tại ở /total là **1 Writer bên ngoài + 2 giám sát**, không phải ba Writer song song. /global cố ý triển khai **ba làn Writer bên ngoài** theo yêu cầu chủ repo.

## Cách hoạt động
- **W1, W2, W3**: mỗi làn sở hữu **40/120 ý tưởng đã có** qua `assignments.json`. Không phát sinh đề tài để lấp KPI. Không đổi ID, slug, cluster hoặc Matrix.
- Mỗi Writer là một **phiên AI ứng dụng bên ngoài** (ChatGPT, Claude, Gemini, Mistral, hoặc AI thương mại khác mà chủ repo chọn). Không tích hợp API; không gọi model trong GitHub Actions, không tải AI mã nguồn mở.
- **GitHub:** phân việc bằng CLI hoặc `workflow_dispatch` có artifact JSON; Writer viết JSON trên nhánh riêng và tạo PR. GitHub Actions chỉ QA (read-only) rồi báo lỗi.
- **Coordinator/editor (người chủ duyệt):** đọc nội dung thật + xác minh nguồn + kiểm tra intent, sau đó mới đưa vào `private-drafts/`, đặt `serp_intent_checked=true`, `facts_reviewed_by_human=true` sau khi **thật sự** kiểm chứng, và dùng `scripts/seo/publish-batch.mjs` qua PR được duyệt. Writer không được tự nâng cờ.
- **Publisher:** builder hiện có cập nhật HTML, canonical, Article/Breadcrumb schema, menu/footer, sitemap và SEO Matrix sau khi merge. Không có công việc nền tự viết.

## Lệnh nhanh (iPhone: chạy bằng AI ngoài có công cụ GitHub/terminal, hoặc GitHub Actions → Run workflow → Writer Pack)
```sh
node scripts/writer-lanes.mjs status
node scripts/writer-lanes.mjs pack --writer W1 --count 2
node scripts/writer-lanes.mjs pack --writer W2 --count 2
node scripts/writer-lanes.mjs pack --writer W3 --count 2
node scripts/writer-lanes.mjs pack --writer W1 --count 2 --locale vi
```
Đầu ra `pack` là JSON giao việc có **ID, từ khóa giả thuyết, intent, locale, URL, đường dẫn file chính xác, các liên kết đã xuất bản**. Chỉ Hub được giao trước; bài Supporting đang chờ Hub cha xuất bản thì chưa được giao.

### Writer 1/2/3 — quy tắc giống nhau
1. Mở nhánh riêng `writer/w1-...`, `writer/w2-...`, `writer/w3-...` từ main mới nhất. Không force push, không sửa `main` trực tiếp.
2. Viết đúng `factory/external-writers/inbox/W1/<ID>.json` (đổi W2/W3 cho các Writer còn lại). **Không** ghi thẳng `content/articles/`.
3. Bản nháp hợp schema `schemas/article-draft.schema.json`. Nội dung gốc theo từng ngôn ngữ; 1.000–5.000 từ theo cơ chế đếm của validator, >= 4 H2 có ích, >= 2 nguồn thật có `checked_on`. Không bịa giá/địa chỉ/luật/chứng nhận/bảo hiểm. Chỉ link nội bộ tới URL PUBLISHED.
4. Để `serp_intent_checked=false`, `facts_reviewed_by_human=false`: Writer **không phải người phê duyệt**. Nguồn phải đã thực sự đọc; không tự đánh dấu phê duyệt.
5. Kiểm tra trước khi gửi PR:
```sh
node scripts/writer-lanes.mjs verify --writer W1 --file factory/external-writers/inbox/W1/EN-H01.json
node scripts/writer-lanes.mjs verify-all
node --test tests/external-writers.test.mjs
```
6. Đẩy PR bản nháp, để coordinator duyệt. **Không merge**, không publish và không sửa URL/Matrix/writer khác.

### Chỉ dùng 2 AI thì sao?
Giữ nguyên ba làn để tránh xáo trộn ID. AI thứ nhất xử lý **W1**, AI thứ hai xử lý **W2**; khi cần, một trong hai xử lý thêm **W3 trong phiên riêng**, không đổi quyền sở hữu bài. Không cần thuê AI thứ ba liên tục.

### Khi mất phiên / hết quota
Dừng an toàn. Lần tới đọc `main` mới nhất → `status` → `pack` lại. Bài có JSON trong inbox không được phân lần nữa; khi PR chưa merge thì các nhánh khác có thể chưa nhìn thấy bản nháp, vì vậy người dùng phải merge PR draft đúng thứ tự và luôn refresh main trước khi lấy bài mới. Không tự reset, xóa lock giả, hay bịa heartbeat.

### Lưu ý về tránh trùng trong GitHub
- Chia chủ đề là **deterministic exclusive ownership**, chứ không phải distributed lock cho ba Git clones.
- Dùng một Writer cho mỗi W1/W2/W3 cùng lúc; không mở hai phiên tranh nhau **cùng** một làn.
- `writer-qa.yml` kiểm tra sai làn, ID, tiêu đề/nội dung trùng giữa các bản nháp đã merge, và scope riêng cho nhánh `writer/w1-...`.
- Nếu cùng lúc nhiều PR bản nháp, review và merge tuần tự, kiểm tra lại trên main trước lần gửi kế.

### Duyệt xuất bản
Bộ cổng xuất bản hiện có: `node scripts/seo/publish-batch.mjs --file private-drafts/ID.json` (dry-run); khi đã thật sự duyệt nội dung, lập approval manifest và dùng `--apply` trên feature branch sạch. Reviewer chuyển file vào private-drafts, kiểm tra pháp lý, ý định tìm kiếm, nội dung và nguồn; không đánh dấu kiểm duyệt chỉ vì CI xanh. Hiện không có API model hay tự chạy Writer, và **không tự kích hoạt publisher khi nhận JSON**.

### Nguồn dữ liệu bảo vệ
- `data/seo/master-matrix.json` sở hữu trạng thái/indexable của URL.
- `factory/external-writers/assignments.json` sở hữu Writer assignment cố định, không đổi tùy hứng; khi thêm topic, coordinator thêm mapping unique và QA phải xanh.
- `factory/external-writers/control.json`: manual-ready, không tự start/auto-resume.
- `CNAME`, toàn bộ 25 URL hiện có, WordPress và /total là read-only với tính năng này.

### Đóng góp từ mô hình /total
Đã kế thừa: Writer Pack theo ID thật, exact file scope, phân vai Writer/editor/publisher, tài liệu một-lệnh, QA trước publish, cổng ngăn 404, không để Actions tạo nội dung. Chưa sao chép cơ chế auto publisher push trực tiếp main của /total vì /global cần giữ quyền phê duyệt từng lô, không mở backdoor cho Writer.
