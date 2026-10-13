# Quy tắc nhiệm vụ Coordinator (ngoài Writer)
Chỉ coordinator/chủ repo có quyền điều phối phân công và phê duyệt.
1. Đọc `assignments.json`; không gán cùng ID cho hai writer.
2. Không để ai tự sửa Matrix, trạng thái PUBLISHED, CNAME, cấu trúc /{locale}/.
3. Kiểm tra bài từ inbox bằng nguồn gốc thật, không lấy cờ review của Writer.
4. Bài trùng intent → trả lại Writer, không đăng để tăng số lượng.
5. Sau khi kiểm duyệt, staging thành PR xuất bản qua `publish-batch.mjs`; tối đa 5 bài/lô. Một PR chỉ đổi bài và trạng thái tương ứng.
6. Theo dõi PR quá hạn thủ công; không báo 'Writer chết' chỉ vì không có heartbeat. Hết quota không tự khởi động lại phiên AI.
7. Nếu CI đỏ: đọc đúng log, sửa và chạy lại QA. Không bỏ qua critical gate.
8. Không bao giờ sửa hay chạy Factory của repo `/total` từ đây.
