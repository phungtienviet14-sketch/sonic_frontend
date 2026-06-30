import { navigateTo, paths } from '../navigation.js';
import { appElement } from './auth.js';
import { refreshIcons } from '../utils.js';

// Trang "Hướng dẫn sử dụng" cho phụ huynh — giải thích từng màn của app.
// Theo pattern full re-render; dùng <details>/<summary> làm accordion (không cần JS thêm).
// Nội dung doc nguồn: docs/huong_dan_phu_huynh.md (giữ đồng bộ khi đổi nghiệp vụ).

export function renderGuide() {
    appElement.innerHTML = `
        <main class="page-shell">
            <header class="app-header simple">
                <div>
                    <p class="eyebrow">Sonic cho ba mẹ</p>
                    <h1>Hướng dẫn sử dụng</h1>
                </div>
                <button id="backBtn" class="btn btn-outline btn-inline" data-path="${paths.dashboard()}" type="button">
                    <i data-lucide="arrow-left"></i>
                    <span>Trở lại</span>
                </button>
            </header>

            <section class="surface guide-intro">
                <p class="eyebrow">Bắt đầu nhanh</p>
                <h2>3 bước để bé học cùng robot</h2>
                <ol class="guide-steps">
                    <li><strong>Thêm hồ sơ bé</strong> ở Bảng điều khiển (tên + tuổi). Hệ thống tự tạo cấu hình mặc định.</li>
                    <li><strong>Kết nối robot</strong> với bé: mở hồ sơ bé → tab <em>Kết nối robot</em> và làm theo hướng dẫn (nhập ID bé vào robot).</li>
                    <li><strong>Chọn hướng dạy</strong> ở tab <em>Cấu hình robot</em> (có sẵn preset nhanh), rồi để bé trò chuyện và học với robot.</li>
                </ol>
                <p class="muted compact">Mẹo: vào tab <em>Báo cáo</em> mỗi vài ngày để xem bé tiến bộ thế nào và cần luyện thêm phần nào.</p>
            </section>

            <section class="guide-list">
                ${guideItem('layout-dashboard', 'Bảng điều khiển', `
                    <p>Trang chính sau khi đăng nhập. Tại đây ba mẹ:</p>
                    <ul>
                        <li>Xem nhanh từng bé: phút học hôm nay, lượt làm, cảnh báo cần xem.</li>
                        <li>Bấm <strong>Thêm bé mới</strong> để tạo hồ sơ; bấm vào thẻ bé để mở không gian học tập.</li>
                        <li>Bấm <strong>Sao chép ID</strong> trên thẻ bé để lấy mã dùng khi kết nối robot.</li>
                        <li>Chuông <strong>Thông báo</strong> gom các cảnh báo (chưa học hôm nay, gần hết giờ, lỗi lặp lại...).</li>
                    </ul>`, true)}

                ${guideItem('book-marked', 'Lộ trình Tiếng Anh (ba mẹ chỉnh được)', `
                    <p>Nơi ba mẹ chọn <strong>bé học những từ nào</strong>. Mỗi "chủ đề" là một tập từ có thứ tự.</p>
                    <ul>
                        <li><strong>Tạo / thêm chủ đề:</strong> chọn một bài mẫu của Sonic để nạp sẵn từ, hoặc tự tìm và thêm từ.</li>
                        <li><strong>Sửa từ</strong> trong mỗi bài: thêm/bớt từ, đổi tên chủ đề.</li>
                        <li>Mỗi từ hiển thị mức thuộc: ⚪ Mới học · 🟡 Đang nhớ · 🟢 Đã thuộc. Mỗi bài có thanh "Đã thuộc X/Y từ".</li>
                        <li>Hai báo cáo nhanh: <strong>Phát âm cần luyện</strong> và <strong>Từ bé hay quên nghĩa</strong>.</li>
                    </ul>
                    <p class="muted compact">Robot dạy lần lượt: đọc từ mới → đố nghĩa → kể chuyện lồng từ. Bé qua từ khi <em>nhớ nghĩa</em>, không phải khi phát âm chuẩn.</p>`)}

                ${guideItem('milestone', 'Lộ trình Toán (chỉ xem)', `
                    <p>Khác Tiếng Anh, lộ trình Toán do <strong>hệ thống kiểm soát</strong> — ba mẹ không cần chỉnh.</p>
                    <ul>
                        <li>Các cấp được xếp từ dễ đến khó theo độ tuổi và tiến độ của bé.</li>
                        <li>Trạng thái mỗi cấp: <strong>Đã qua</strong> · <strong>Đang học</strong> · <strong>Chưa mở</strong>.</li>
                        <li>Bé được robot kiểm tra đầu vào để xếp đúng cấp, và tự lên cấp khi làm tốt (kể cả "học vượt").</li>
                    </ul>`)}

                ${guideItem('chart-column', 'Báo cáo học tập', `
                    <p>Theo dõi bé tiến bộ thế nào, gồm các tab:</p>
                    <ul>
                        <li><strong>Tổng quan:</strong> nhịp học hôm nay vs cả tuần, đánh giá đầu vào, nhận xét và gợi ý học tiếp.</li>
                        <li><strong>Tiếng Anh:</strong> bé làm tốt phần nào, kho từ cần ôn, tiến độ lộ trình, phát âm cần luyện, từ hay quên nghĩa.</li>
                        <li><strong>Toán:</strong> cấp đang học, kỹ năng mạnh/yếu, lỗi hay gặp.</li>
                        <li><strong>Lịch sử:</strong> các hoạt động học gần đây.</li>
                    </ul>
                    <p class="muted compact">Báo cáo dùng nhãn thân thiện (Tốt / Khá / Cần luyện · Rõ / Tạm / Cần luyện) thay cho điểm số kỹ thuật.</p>`)}

                ${guideItem('sliders-horizontal', 'Cấu hình robot', `
                    <p>Quyết định robot dạy và trò chuyện thế nào.</p>
                    <ul>
                        <li><strong>Preset nhanh:</strong> Trò chuyện (không học, robot làm bạn) · Tập trung Tiếng Anh · Tập trung Toán · Song ngữ.</li>
                        <li><strong>Mục tiêu:</strong> tính cách robot, mức khuyến khích, tỉ lệ Việt/Anh, số phút mỗi ngày.</li>
                        <li><strong>Tiếng Anh:</strong> bật/tắt + cấp độ + hướng dẫn riêng. Chọn <em>từ vựng & bài học</em> ở tab Lộ trình Anh.</li>
                        <li><strong>Toán:</strong> bật/tắt + hướng dẫn riêng. Cấp độ & độ khó do Lộ trình Toán (hệ thống) tự điều chỉnh.</li>
                        <li><strong>An toàn & thời gian:</strong> ngày/giờ học, chặn chủ đề, cho phép học qua máy ảnh khi bé yêu cầu.</li>
                    </ul>`)}

                ${guideItem('qr-code', 'Kết nối robot', `
                    <p>Ghép robot với hồ sơ của bé để robot biết đang nói chuyện với ai.</p>
                    <ul>
                        <li>Lấy <strong>ID bé</strong> (nút Sao chép ID ở Bảng điều khiển hoặc trong tab Kết nối).</li>
                        <li>Nhập ID vào robot theo hướng dẫn trên màn; robot sẽ tự kết nối tới máy chủ.</li>
                    </ul>`)}

                ${guideItem('shield-check', 'Quyền riêng tư', `
                    <p>Kiểm soát dữ liệu của bé.</p>
                    <ul>
                        <li><strong>Trí nhớ của bé:</strong> robot ghi nhớ sở thích/chuyện bé kể để trò chuyện hợp hơn — ba mẹ xem và xóa được.</li>
                        <li><strong>Nhận diện giọng nói:</strong> tính năng nâng cao, chỉ bật khi ba mẹ đồng ý; mặc định tắt.</li>
                    </ul>`)}

                ${guideItem('user-cog', 'Tài khoản', `
                    <p>Quản lý tài khoản phụ huynh: đổi mật khẩu và đăng xuất (góc trên Bảng điều khiển).</p>`)}
            </section>
        </main>
    `;

    document.getElementById('backBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
    refreshIcons();
}

function guideItem(icon, title, bodyHtml, open = false) {
    return `
        <details class="surface guide-item"${open ? ' open' : ''}>
            <summary>
                <span class="guide-item-icon"><i data-lucide="${icon}"></i></span>
                <span class="guide-item-title">${title}</span>
                <span class="guide-item-chevron"><i data-lucide="chevron-down"></i></span>
            </summary>
            <div class="guide-item-body">${bodyHtml}</div>
        </details>
    `;
}
