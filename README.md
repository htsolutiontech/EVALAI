# EvalAIH — Kiểm chứng độ tin cậy AI y tế (MVP v2.1.1)

> **Lưu ý:** EVALAI chỉ đánh giá độ tin cậy các nền tảng AI y tế, không dùng cho các quyết định chẩn đoán Y khoa, và hệ thống có thể sai sót, thông tin cần đánh giá khách quan từ bác sỹ chuyên môn.

Site tĩnh (GitHub Pages), không cần backend. HealthV MedTech · Huế – Đà Nẵng.

## Cấu trúc

```
index.html                  Trang chính: Demo · Đánh giá trực tiếp · Agent chuyên gia · Góp ý
Pilottest.html              Bàn kiểm chứng P0 (giữ nguyên, bổ sung lưu ý + điều hướng)
assets/css/base.css         CSS gốc của MVP v2.0 (tách ra từ index.html)
assets/css/app.css          Thành phần mới, responsive, in ấn, tăng tương phản chữ
assets/js/config.js         ⚙ Cấu hình: email nhận, kênh gửi form, webhook, ngưỡng, lưu ý pháp lý
assets/js/util.js           Escape HTML, SHA-256, phát hiện dữ liệu định danh người bệnh, lưu trữ
assets/js/mailer.js         Chuyển tiếp form về email + hàng đợi gửi lại + mailto dự phòng
assets/js/kb.js             Kho tri thức chuyên gia: chuỗi băm, đồng thuận chéo, đồng bộ thời gian thực
assets/js/engine.js         Bộ đánh giá trực tiếp MPVS-H (DOI/PMID, pháp lý, quy tắc chuyên gia)
assets/js/demo.js           Luồng demo 4 bước (refactor từ v2.0)
assets/js/live.js · agent.js · feedback.js · app.js
integrations/google-apps-script.gs   Webhook mẫu lưu đóng góp vào Google Sheet
```

## 1. Form góp ý → email htsolutiontech@gmail.com

- Kênh mặc định: **FormSubmit.co** (`MAIL_PROVIDER: 'formsubmit'`).
- **Bắt buộc kích hoạt một lần:** sau lần gửi đầu tiên, FormSubmit gửi email “Activate Form” tới `htsolutiontech@gmail.com`. Bấm kích hoạt thì các lần sau mới được chuyển tiếp. Trước khi kích hoạt, dữ liệu nằm trong hàng đợi trên trình duyệt người gửi và tự gửi lại.
- Sau khi kích hoạt, nên điền chuỗi bí danh FormSubmit cấp vào `FORMSUBMIT_ALIAS` để không lộ địa chỉ email trong mã nguồn.
- Có thể đổi sang Web3Forms (`WEB3FORMS_ACCESS_KEY`) hoặc backend riêng (`'webhook'`).
- Bảo vệ: trường bẫy bot, chặn gửi dưới 3 giây, giới hạn 30 giây giữa hai lần gửi, kiểm tra hợp lệ, chặn nội dung có dấu hiệu dữ liệu người bệnh, ô đồng ý xử lý dữ liệu (Luật 91/2025/QH15).
- Email nhận được ở dạng bảng, kèm trường `payload_json` để nhập lại hệ thống.

## 2. Agent EvalAI — thu nhận tri thức chuyên gia

| Loại đóng góp | Bộ đánh giá dùng thế nào |
|---|---|
| Hiệu chỉnh output AI | So khớp luận điểm tương tự → đúng / đúng một phần / sai, hiển thị nội dung đính chính |
| Quy tắc liều thuốc | Bắt liều trong câu (mg, g, mcg, mg/kg; /lần hoặc /ngày) → vượt ngưỡng = lỗi nghiêm trọng |
| Câu trả lời chuẩn | Khi có prompt: đo độ bao phủ ý chính, phát hiện nội dung không được nêu |
| Cờ đỏ | Phát biểu nguy hiểm → giới hạn điểm, bắt buộc chuyên gia review |
| Cập nhật hướng dẫn / văn bản | Ghi đè kho pháp lý (hiệu lực, thay thế) |

**Thời gian thực:** mỗi đóng góp được áp dụng ngay. Kết quả đang mở ở tab Đánh giá trực tiếp tự đánh giá lại, kể cả khi đóng góp đến từ tab khác (BroadcastChannel).

**Quản trị chất lượng:**
- Trọng số theo đồng thuận: đã đồng thuận 1.0 · chờ đồng thuận 0.5 · mẫu 0.4 · tranh chấp 0.
- Một mục chỉ “validated” khi đủ `KB_VALIDATION_QUORUM` chuyên gia độc lập; tác giả không tự thẩm định.
- Không đồng thuận bắt buộc ghi lý do.
- Mỗi mục có hash SHA-256 nối chuỗi; nút “Kiểm tra chuỗi băm” phát hiện sửa ngầm.

**Đồng bộ:** email (luôn có), webhook (tùy chọn), xuất JSON / JSONL huấn luyện (có trọng số), nhập gói JSON từ `payload_json` của email.

## Giới hạn hiện tại — cần biết trước khi triển khai

1. **Chưa có máy chủ trung tâm.** Kho tri thức lưu trên trình duyệt của từng chuyên gia. Đồng thuận giữa nhiều chuyên gia ở nhiều thiết bị phải gộp thủ công bằng “Nhập gói JSON”, hoặc dùng webhook Google Sheet tạm thời. Muốn đồng thuận thời gian thực nhiều người dùng cần backend (khuyến nghị đặt tại Việt Nam).
2. **“Đẩy vào model” ở bản này = áp dụng quy tắc tức thì + xuất dữ liệu huấn luyện.** Chưa có huấn luyện lại mô hình tự động; JSONL là đầu vào cho pipeline huấn luyện bộ đánh giá (critic) ở bản v2.
3. **MPVS-H là điểm sàng lọc heuristic,** chưa phải MPVS chuẩn hóa; chưa được hiệu chỉnh với đánh giá của chuyên gia.
4. **Bên thứ ba:** FormSubmit / Web3Forms / Google lưu dữ liệu ngoài Việt Nam. Hồ sơ chuyên gia (họ tên, email) là dữ liệu cá nhân — cần thông báo chuyển dữ liệu ra nước ngoài theo Luật 91/2025/QH15, hoặc chuyển sang backend trong nước.
5. **Xác minh danh tính chuyên gia:** số CCHN chỉ được thu thập, chưa đối chiếu tự động với cơ sở dữ liệu cấp phép.
6. **Kho pháp lý mẫu** được xác minh ngày 29/10/2026. Mục NĐ 13/2023, NĐ 98/2021, TT 54/2017 đang ở trạng thái “cần kiểm tra”.
7. **Bộ phát hiện dữ liệu định danh** dựa trên mẫu regex (SĐT, CCCD, BHYT, mã bệnh án, họ tên sau “bệnh nhân/ông/bà”), không bắt được mọi trường hợp. Ô xác nhận khử định danh vẫn bắt buộc.
8. **Tab Demo** dùng dữ liệu mẫu đã tính sẵn và được ghi rõ là minh họa trên giao diện.

## Chạy thử cục bộ

```bash
python3 -m http.server 8080   # mở http://localhost:8080
```

Nếu đổi `KB_WEBHOOK_URL` sang tên miền khác `script.google.com`, cần thêm tên miền đó vào `connect-src` của thẻ Content-Security-Policy trong `index.html`.

## Xử lý sự cố: góp ý không về email

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Báo “đang mở trực tiếp từ file (file://)” | Mở `index.html` bằng cách nhấp đúp file trên máy | Mở qua web (GitHub Pages) hoặc `python3 -m http.server` |
| Báo “Kênh email chưa được kích hoạt” | FormSubmit chưa được kích hoạt | Mở hộp thư htsolutiontech@gmail.com (kể cả mục Spam/Quảng cáo), bấm **Activate Form** |
| Báo “Không kết nối được formsubmit.co” | Mạng cơ quan, tường lửa hoặc trình chặn quảng cáo chặn tên miền | Dùng cách ① “Gửi qua trang FormSubmit”, hoặc tắt trình chặn cho trang |
| Gmail mở nhưng thư không đi | Liên kết chỉ soạn sẵn thư | Bấm **Gửi** trong cửa sổ Gmail |

Khi gửi tự động thất bại, trang đưa ra 4 cách thay thế: ① gửi qua trang FormSubmit ở tab mới, ② mở Gmail web soạn sẵn, ③ sao chép nội dung, ④ ứng dụng email trên máy.
