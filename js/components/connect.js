import { navigateTo, paths } from '../navigation.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { escapeHtml, refreshIcons, showToast } from '../utils.js';

export function renderConnect() {
    if (!state.currentChild) {
        navigateTo(paths.dashboard(), { replace: true });
        return;
    }
    const child = state.currentChild;
    const childId = child.user_id;

    appElement.innerHTML = `
        <main class="page-shell narrow">
            <header class="app-header simple">
                <div>
                    <p class="eyebrow">${escapeHtml(child.full_name)}</p>
                    <h1>Kết nối robot</h1>
                </div>
                <button id="backBtn" class="btn btn-outline btn-inline" data-path="${paths.child(childId)}" type="button">
                    <i data-lucide="arrow-left"></i>
                    <span>Trở lại</span>
                </button>
            </header>

            <section class="surface connect-id-card">
                <p class="eyebrow">Mã ghép nối của bé</p>
                <div class="connect-id" id="connectId">${escapeHtml(childId)}</div>
                <button id="copyConnectBtn" class="btn btn-primary btn-wide" type="button">
                    <i data-lucide="copy"></i>
                    <span>Sao chép mã</span>
                </button>
            </section>

            <section class="surface">
                <h2>Các bước kết nối</h2>
                <ol class="connect-steps">
                    <li><span class="step-num">1</span><div><strong>Bật robot Sonic</strong><p>Cắm nguồn và chờ robot khởi động, kết nối Wi-Fi.</p></div></li>
                    <li><span class="step-num">2</span><div><strong>Mở phần cài đặt thiết bị</strong><p>Trên app cấu hình robot, tìm mục nhập "Mã ghép nối" (Client ID).</p></div></li>
                    <li><span class="step-num">3</span><div><strong>Dán mã của bé ở trên</strong><p>Sao chép mã phía trên rồi dán vào robot. Mỗi bé có một mã riêng — dán đúng mã để robot ghi nhận đúng bé.</p></div></li>
                    <li><span class="step-num">4</span><div><strong>Lưu và nói chuyện</strong><p>Robot sẽ chào và bắt đầu học cùng bé theo cấu hình ba mẹ đã đặt.</p></div></li>
                </ol>
            </section>

            <p class="privacy-fineprint">Mã ghép nối gắn robot với hồ sơ bé. Không chia sẻ mã cho người lạ.</p>
        </main>
    `;

    document.getElementById('backBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
    document.getElementById('copyConnectBtn').addEventListener('click', () => {
        navigator.clipboard.writeText(childId)
            .then(() => showToast('Đã sao chép mã ghép nối'))
            .catch(() => showToast('Không sao chép được mã', 'error'));
    });
    refreshIcons();
}
