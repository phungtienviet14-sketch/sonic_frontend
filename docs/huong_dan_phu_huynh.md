# Hướng dẫn sử dụng — Sonic cho ba mẹ

Tài liệu này hướng dẫn phụ huynh dùng app web **Sonic cho ba mẹ** để theo dõi và cấu hình việc học của bé với robot.

> Đây cũng là nội dung nguồn của trang **Hướng dẫn** trong app (`js/components/guide.js`). Khi nghiệp vụ đổi, cập nhật cả hai cho đồng bộ.

---

## Bắt đầu nhanh (3 bước)

1. **Thêm hồ sơ bé** ở Bảng điều khiển (tên + tuổi). Hệ thống tự tạo cấu hình dạy học mặc định.
2. **Kết nối robot** với bé: mở hồ sơ bé → tab *Kết nối robot*, làm theo hướng dẫn (nhập **ID bé** vào robot).
3. **Chọn hướng dạy** ở tab *Cấu hình robot* (có preset nhanh), rồi để bé trò chuyện và học cùng robot.

> Mẹo: ghé tab **Báo cáo** mỗi vài ngày để xem bé tiến bộ thế nào và cần luyện thêm phần nào.

---

## Các màn hình trong app

### 1. Bảng điều khiển
Trang chính sau khi đăng nhập:
- Xem nhanh từng bé: phút học hôm nay, lượt làm, số cảnh báo cần xem.
- **Thêm bé mới** để tạo hồ sơ; bấm vào thẻ bé để mở không gian học tập của bé.
- **Sao chép ID** trên thẻ bé để lấy mã dùng khi kết nối robot.
- Chuông **Thông báo** gom các cảnh báo: chưa học hôm nay, gần hết giờ, lỗi lặp lại, môn đang tắt…
- Nút **Hướng dẫn** (mở trang này) và **Tài khoản** ở góc trên.

### 2. Không gian học tập của bé
Mở khi bấm vào một bé. Gồm tab Tổng quan và các nút: **Lộ trình Anh · Lộ trình Toán · Báo cáo · Cấu hình · Kết nối robot · Quyền riêng tư**. Có thể **Sửa tên / tuổi** và ghi chú cho robot về bé.

### 3. Lộ trình Tiếng Anh *(ba mẹ chỉnh được)*
Nơi ba mẹ chọn **bé học những từ nào**. Mỗi "chủ đề" là một tập từ có thứ tự.
- **Tạo / thêm chủ đề:** chọn một bài mẫu của Sonic để nạp sẵn từ, hoặc tự tìm và thêm từ.
- **Sửa từ** trong mỗi bài: thêm/bớt từ, đổi tên chủ đề.
- Mỗi từ hiển thị mức thuộc: ⚪ Mới học · 🟡 Đang nhớ · 🟢 Đã thuộc. Mỗi bài có thanh **"Đã thuộc X/Y từ"**.
- Hai báo cáo nhanh: **Phát âm cần luyện** và **Từ bé hay quên nghĩa**.

> Robot dạy lần lượt trong một bài: đọc từ mới → đố nghĩa → kể chuyện lồng từ. Bé **qua từ khi nhớ nghĩa**, không phải khi phát âm chuẩn (phát âm chỉ để báo cáo).

### 4. Lộ trình Toán *(chỉ xem)*
Khác Tiếng Anh, lộ trình Toán do **hệ thống kiểm soát** — ba mẹ không cần chỉnh:
- Các cấp được xếp từ dễ đến khó theo độ tuổi và tiến độ của bé.
- Trạng thái mỗi cấp: **Đã qua · Đang học · Chưa mở**.
- Bé được robot kiểm tra đầu vào để xếp đúng cấp, và tự lên cấp khi làm tốt (kể cả khi xin "học vượt").

### 5. Báo cáo học tập
Theo dõi bé tiến bộ thế nào, gồm các tab:
- **Tổng quan:** nhịp học hôm nay so với cả tuần, đánh giá đầu vào, nhận xét và gợi ý học tiếp.
- **Tiếng Anh:** bé làm tốt phần nào, kho từ cần ôn, tiến độ lộ trình, phát âm cần luyện, từ hay quên nghĩa.
- **Toán:** cấp đang học, kỹ năng mạnh/yếu, lỗi hay gặp.
- **Lịch sử:** các hoạt động học gần đây.

> Báo cáo dùng **nhãn thân thiện** (Tốt / Khá / Cần luyện · Rõ / Tạm / Cần luyện) thay cho điểm số kỹ thuật.

### 6. Cấu hình robot
Quyết định robot dạy và trò chuyện thế nào:
- **Preset nhanh:** Trò chuyện (không học, robot làm bạn) · Tập trung Tiếng Anh · Tập trung Toán · Song ngữ.
- **Mục tiêu:** tính cách robot, mức khuyến khích, tỉ lệ Việt/Anh, số phút mỗi ngày.
- **Tiếng Anh:** bật/tắt + cấp độ + hướng dẫn riêng. Chọn *từ vựng & bài học* ở tab **Lộ trình Anh**.
- **Toán:** bật/tắt + hướng dẫn riêng. **Cấp độ & độ khó do Lộ trình Toán (hệ thống) tự điều chỉnh.**
- **An toàn & thời gian:** ngày/giờ học, chặn chủ đề, cho phép học qua máy ảnh khi bé yêu cầu.

### 7. Kết nối robot
Ghép robot với hồ sơ của bé để robot biết đang nói chuyện với ai:
- Lấy **ID bé** (nút Sao chép ID ở Bảng điều khiển, hoặc trong tab Kết nối).
- Nhập ID vào robot theo hướng dẫn trên màn; robot tự kết nối tới máy chủ.

### 8. Quyền riêng tư
Kiểm soát dữ liệu của bé:
- **Trí nhớ của bé:** robot ghi nhớ sở thích/chuyện bé kể để trò chuyện hợp hơn — ba mẹ xem và xóa được.
- **Nhận diện giọng nói:** tính năng nâng cao, chỉ bật khi ba mẹ đồng ý; mặc định tắt.

### 9. Tài khoản
Quản lý tài khoản phụ huynh: **đổi mật khẩu** và **đăng xuất** (góc trên Bảng điều khiển).

---

## Câu hỏi thường gặp

**Vì sao không chỉnh được cấp độ Toán?**
Lộ trình Toán do hệ thống kiểm soát để bé luôn học đúng vùng phù hợp — bé được kiểm tra đầu vào và tự lên cấp khi làm tốt. Ba mẹ chỉ cần bật/tắt môn Toán.

**Bé "qua từ" tiếng Anh khi nào?**
Khi bé **nhớ nghĩa** từ (trả lời đúng câu đố nghĩa). Điểm phát âm chỉ dùng để báo cáo, không chặn bé qua từ.

**Robot không trả lời / không kết nối?**
Kiểm tra đã nhập đúng **ID bé** vào robot ở bước Kết nối, và robot có mạng. Xem lại tab *Kết nối robot*.
