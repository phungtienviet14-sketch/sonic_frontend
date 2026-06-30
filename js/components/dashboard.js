import { api } from '../api.js';
import { navigateTo, paths } from '../navigation.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { loadChildOverview } from '../overviewFallback.js';
import { escapeHtml, refreshIcons, showToast, formatLevel } from '../utils.js';

const SUBJECT_LABELS = {
    english: 'Tiếng Anh',
    math: 'Toán',
};

export async function renderDashboard() {
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải danh sách bé...</p>`;
    try {
        // B1: chỉ lấy danh sách bé (1 query nhanh) rồi VẼ SHELL NGAY — không chờ overview.
        state.childrenList = await api.getChildren();
        state.overviewCache = {};
        renderDashboardShell([]);

        // B2: tải overview từng bé SONG SONG, lấp card đó khi xong (không chặn toàn trang).
        await Promise.all(state.childrenList.map(fillChildCard));

        // B3: đủ dữ liệu -> cập nhật tiles tổng + chuông thông báo.
        finalizeDashboardSummary();
    } catch (error) {
        appElement.innerHTML = `
            <main class="page-shell narrow">
                <div class="surface error-panel">
                    <h2>Không tải được dữ liệu</h2>
                    <p>${escapeHtml(error.message)}</p>
                    <button class="btn btn-primary" type="button" onclick="location.reload()">
                        <i data-lucide="refresh-cw"></i>
                        <span>Thử lại</span>
                    </button>
                </div>
            </main>
        `;
        refreshIcons();
    }
}

async function fillChildCard(child) {
    try {
        const overview = await loadChildOverview(child);
        state.overviewCache[child.user_id] = overview;
    } catch (error) {
        console.warn('[Sonic cho ba mẹ] Không tải được tổng quan của bé', child.user_id, error);
        state.overviewCache[child.user_id] = null;
    }
    const slot = document.querySelector(`[data-child-card="${cssEscape(child.user_id)}"]`);
    if (slot) {
        slot.outerHTML = renderChildCard(child);
        refreshIcons();
    }
}

function finalizeDashboardSummary() {
    const alerts = collectDashboardAlerts();
    const badge = document.getElementById('notiBadge');
    if (badge) {
        badge.textContent = alerts.length;
        badge.classList.toggle('hidden', !alerts.length);
    }
    const dropdown = document.querySelector('#notiDropdown .notification-list');
    if (dropdown) {
        dropdown.innerHTML = alerts.length
            ? alerts.map(renderNotification).join('')
            : '<p class="muted compact">Chưa có cảnh báo mới.</p>';
    }
    const banner = document.getElementById('priorityBannerSlot');
    if (banner) banner.outerHTML = renderPriorityBanner(alerts);
    const alertTile = document.getElementById('alertTileSlot');
    if (alertTile) {
        alertTile.outerHTML = renderSummaryTile('Cảnh báo cần xem', alerts.length, alerts.length ? 'triangle-alert' : 'shield-check', alerts.length ? 'amber' : 'green', alerts.length ? 'Ưu tiên hôm nay' : 'Mọi thứ ổn', 'alertTileSlot');
    }
    const cameraTile = document.getElementById('cameraTileSlot');
    if (cameraTile) {
        cameraTile.outerHTML = renderSummaryTile('Học qua máy ảnh', countCameraEnabled(), 'camera', 'teal', 'Đang bật', 'cameraTileSlot');
    }
    if (hasFallbackOverview() && !document.querySelector('.fallback-notice')) {
        document.querySelector('.dashboard-summary')?.insertAdjacentHTML('afterend', renderFallbackNotice());
    }
    refreshIcons();
}

function collectDashboardAlerts() {
    return Object.entries(state.overviewCache)
        .flatMap(([childId, overview]) => (overview?.alerts || []).map(alert => ({
            ...alert,
            childId,
            childName: overview?.child?.full_name || childNameById(childId),
        })))
        .slice(0, 8);
}

function cssEscape(value) {
    return String(value).replace(/["\\]/g, '\\$&');
}

function renderDashboardShell(alerts) {
    appElement.innerHTML = `
            <main class="page-shell">
                <header class="app-header dashboard-hero">
                    <div class="header-copy">
                        <p class="eyebrow">Sonic cho ba mẹ</p>
                        <h1>Bảng điều khiển học tập</h1>
                        <p class="header-subtitle">Theo dõi nhanh tình hình học hôm nay và ưu tiên hỗ trợ từng bé.</p>
                    </div>
                    <div class="header-actions">
                        <button id="notiBtn" class="btn btn-ghost btn-inline" type="button">
                            <i data-lucide="bell"></i>
                            <span>Thông báo</span>
                            <span id="notiBadge" class="badge ${alerts.length ? '' : 'hidden'}">${alerts.length}</span>
                        </button>
                        <button id="guideBtn" class="btn btn-ghost btn-inline" data-path="${paths.guide()}" type="button">
                            <i data-lucide="circle-help"></i>
                            <span>Hướng dẫn</span>
                        </button>
                        <button id="accountBtn" class="btn btn-outline btn-inline" data-path="${paths.account()}" type="button">
                            <i data-lucide="user-cog"></i>
                            <span>Tài khoản</span>
                        </button>
                        <button id="logoutBtn" class="btn btn-outline btn-inline" data-path="${paths.login()}" type="button">
                            <i data-lucide="log-out"></i>
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                    <div id="notiDropdown" class="surface notification-popover hidden">
                        <h3>Thông báo gần đây</h3>
                        <div class="notification-list">
                            ${alerts.length ? alerts.map(renderNotification).join('') : '<p class="muted compact">Chưa có cảnh báo mới.</p>'}
                        </div>
                    </div>
                </header>

                <section class="dashboard-summary">
                    ${renderSummaryTile('Tổng hồ sơ bé', state.childrenList.length, 'users', 'blue', 'Đang theo dõi')}
                    ${renderSummaryTile('Cảnh báo cần xem', '…', 'loader-circle', 'blue', 'Đang tổng hợp', 'alertTileSlot')}
                    ${renderSummaryTile('Học qua máy ảnh', '…', 'camera', 'teal', 'Đang tổng hợp', 'cameraTileSlot')}
                </section>
                <div id="priorityBannerSlot"></div>

                <section class="child-grid">
                    ${state.childrenList.length ? state.childrenList.map(renderChildCard).join('') : renderEmptyState()}
                </section>

                <button class="btn btn-primary btn-wide" id="addChildBtn" data-path="${paths.addChild()}" type="button">Thêm bé mới</button>
            </main>
        `;

    document.getElementById('logoutBtn').addEventListener('click', (event) => {
        localStorage.removeItem('token');
        navigateTo(event.currentTarget.getAttribute('data-path'), { replace: true });
    });

    document.getElementById('notiBtn').addEventListener('click', () => {
        document.getElementById('notiDropdown').classList.toggle('hidden');
    });

    document.getElementById('accountBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));

    document.getElementById('guideBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));

    document.getElementById('addChildBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));

    // Event delegation trên child-grid: card thay HTML khi overview về vẫn không mất listener.
    const grid = document.querySelector('.child-grid');
    grid?.addEventListener('click', (event) => {
        const copyBtn = event.target.closest('.copy-id-btn');
        if (copyBtn) {
            event.stopPropagation();
            const id = copyBtn.getAttribute('data-id');
            navigator.clipboard.writeText(id)
                .then(() => showToast('Đã copy ID bé'))
                .catch(() => showToast('Không thể copy ID', 'error'));
            return;
        }
        const nextBtn = event.target.closest('.next-lesson-btn');
        if (nextBtn) {
            event.stopPropagation();
            navigateTo(nextBtn.getAttribute('data-path'));
            return;
        }
        const card = event.target.closest('.child-card');
        if (card && card.getAttribute('data-path')) {
            navigateTo(card.getAttribute('data-path'));
        }
    });

    refreshIcons();
}

export function renderAddChildForm() {
    appElement.innerHTML = `
        <main class="page-shell narrow">
            <header class="app-header simple">
                <div>
                    <p class="eyebrow">Hồ sơ bé</p>
                    <h1>Thêm bé mới</h1>
                </div>
                <button id="backBtn" class="btn btn-outline btn-inline" data-path="${paths.dashboard()}" type="button">
                    <i data-lucide="arrow-left"></i>
                    <span>Trở lại</span>
                </button>
            </header>
            <form id="addChildForm" class="surface form-surface">
                <div class="form-group">
                    <label for="childName">Họ và tên bé</label>
                    <input type="text" id="childName" placeholder="Nguyễn Bảo An" required>
                </div>
                <div class="form-group">
                    <label for="childAge">Tuổi</label>
                    <input type="number" id="childAge" placeholder="5" min="1" max="15" required>
                </div>
                <div id="addChildError" class="hidden form-message danger"></div>
                <div id="addChildSuccess" class="hidden form-message success"></div>
                <button type="submit" class="btn btn-primary" id="addChildSubmitBtn">
                    <i data-lucide="user-plus"></i>
                    <span>Thêm bé</span>
                </button>
            </form>
        </main>
    `;

    document.getElementById('backBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
    refreshIcons();
    document.getElementById('addChildForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = document.getElementById('addChildSubmitBtn');
        const errorDiv = document.getElementById('addChildError');
        const successDiv = document.getElementById('addChildSuccess');
        const fullName = document.getElementById('childName').value.trim();
        const age = parseInt(document.getElementById('childAge').value, 10);

        button.innerHTML = '<i data-lucide="loader-circle"></i><span>Đang thêm...</span>';
        button.disabled = true;
        refreshIcons();
        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');

        try {
            await api.addChild({ full_name: fullName, age });
            successDiv.innerText = `Đã thêm bé ${fullName}.`;
            successDiv.classList.remove('hidden');
            setTimeout(() => navigateTo(paths.dashboard(), { replace: true }), 700);
        } catch (error) {
            errorDiv.innerText = error.message;
            errorDiv.classList.remove('hidden');
            button.innerHTML = '<i data-lucide="user-plus"></i><span>Thêm bé</span>';
            button.disabled = false;
            refreshIcons();
        }
    });
}

export function renderEditChildForm() {
    if (!state.currentChild) {
        navigateTo(paths.dashboard(), { replace: true });
        return;
    }
    const child = state.currentChild;
    appElement.innerHTML = `
        <main class="page-shell narrow">
            <header class="app-header simple">
                <div>
                    <p class="eyebrow">Hồ sơ bé</p>
                    <h1>Sửa hồ sơ bé</h1>
                </div>
                <button id="backBtn" class="btn btn-outline btn-inline" data-path="${paths.child(child.user_id)}" type="button">
                    <i data-lucide="arrow-left"></i>
                    <span>Trở lại</span>
                </button>
            </header>
            <form id="editChildForm" class="surface form-surface">
                <div class="form-group">
                    <label for="childName">Họ và tên bé</label>
                    <input type="text" id="childName" value="${escapeHtml(child.full_name || '')}" placeholder="Nguyễn Bảo An" required>
                </div>
                <div class="form-group">
                    <label for="childAge">Tuổi</label>
                    <input type="number" id="childAge" value="${escapeHtml(child.age ?? '')}" placeholder="5" min="1" max="18" required>
                </div>
                <div class="form-group">
                    <label for="childNote">Ghi chú cho robot về bé <span class="muted">(tùy chọn)</span></label>
                    <textarea id="childNote" rows="2" maxlength="500" placeholder="VD: con thích khủng long, cần luyện phát âm R, sợ tiếng động lớn...">${escapeHtml(child.weak_points || '')}</textarea>
                    <small class="muted">Robot dùng để trò chuyện hợp bé hơn.</small>
                </div>
                <div id="editChildError" class="hidden form-message danger"></div>
                <div id="editChildSuccess" class="hidden form-message success"></div>
                <button type="submit" class="btn btn-primary" id="editChildSubmitBtn">
                    <i data-lucide="save"></i>
                    <span>Lưu thay đổi</span>
                </button>
            </form>

            <section class="surface danger-zone">
                <div>
                    <strong>Xóa hồ sơ bé</strong>
                    <p class="muted compact">Xóa vĩnh viễn hồ sơ và toàn bộ dữ liệu học, trò chuyện, trí nhớ của bé. Không hoàn tác được.</p>
                </div>
                <button id="deleteChildBtn" class="btn btn-outline btn-danger" type="button">
                    <i data-lucide="trash-2"></i>
                    <span>Xóa hồ sơ</span>
                </button>
            </section>
        </main>
    `;

    document.getElementById('backBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
    document.getElementById('deleteChildBtn').addEventListener('click', () => handleDeleteChild(child));
    refreshIcons();
    document.getElementById('editChildForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = document.getElementById('editChildSubmitBtn');
        const errorDiv = document.getElementById('editChildError');
        const successDiv = document.getElementById('editChildSuccess');
        const fullName = document.getElementById('childName').value.trim();
        const age = parseInt(document.getElementById('childAge').value, 10);
        const weakPoints = document.getElementById('childNote').value.trim();

        button.innerHTML = '<i data-lucide="loader-circle"></i><span>Đang lưu...</span>';
        button.disabled = true;
        refreshIcons();
        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');

        try {
            await api.updateChild(child.user_id, { full_name: fullName, age, weak_points: weakPoints });
            // Cập nhật state cục bộ để các trang khác thấy ngay (không cần tải lại).
            child.full_name = fullName;
            child.age = age;
            child.weak_points = weakPoints;
            state.overviewCache[child.user_id] = null;
            successDiv.innerText = `Đã cập nhật hồ sơ bé ${fullName}.`;
            successDiv.classList.remove('hidden');
            setTimeout(() => navigateTo(paths.child(child.user_id), { replace: true }), 700);
        } catch (error) {
            errorDiv.innerText = error.message;
            errorDiv.classList.remove('hidden');
            button.innerHTML = '<i data-lucide="save"></i><span>Lưu thay đổi</span>';
            button.disabled = false;
            refreshIcons();
        }
    });
}

async function handleDeleteChild(child) {
    if (!confirm(`Xóa vĩnh viễn hồ sơ bé "${child.full_name}" và toàn bộ dữ liệu? Không hoàn tác được.`)) return;
    const typed = prompt(`Để xác nhận, gõ đúng tên bé: ${child.full_name}`);
    if (typed === null) return;
    if (typed.trim() !== (child.full_name || '').trim()) {
        showToast('Tên không khớp, đã hủy xóa', 'error');
        return;
    }
    try {
        await api.deleteChild(child.user_id);
        // Dọn state cục bộ để dashboard không còn bé này.
        state.childrenList = state.childrenList.filter(c => String(c.user_id) !== String(child.user_id));
        delete state.overviewCache[child.user_id];
        state.currentChild = null;
        showToast(`Đã xóa hồ sơ bé ${child.full_name}`);
        navigateTo(paths.dashboard(), { replace: true });
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function renderChildCard(child) {
    const initials = escapeHtml((child.full_name || '?').trim().charAt(0).toUpperCase());
    const cardId = escapeHtml(child.user_id);
    const cardPath = paths.child(child.user_id, 'overview');

    // Chưa nạp overview (đang tải) -> card skeleton, vẫn bấm vào được.
    if (!(child.user_id in state.overviewCache)) {
        return `
            <article class="surface child-card loading" data-child-card="${cardId}" data-id="${cardId}" data-path="${cardPath}">
                <div class="child-card-head">
                    <div class="avatar">${initials}</div>
                    <div class="child-title">
                        <h2>${escapeHtml(child.full_name)}</h2>
                        <div class="meta-row"><span>${escapeHtml(child.age)} tuổi</span></div>
                    </div>
                    <span class="status-chip muted-chip"><i data-lucide="loader-circle"></i><span>Đang tải</span></span>
                </div>
                <div class="card-loading-body">
                    <div class="loader small"></div>
                    <p class="muted compact">Đang tải số liệu học tập...</p>
                </div>
            </article>
        `;
    }

    const overview = state.overviewCache[child.user_id];
    const english = overview?.subjects?.english || {};
    const math = overview?.subjects?.math || {};
    const usage = overview?.daily_usage || {};
    const alerts = overview?.alerts || [];
    const nextAlert = alerts[0];
    const usedMinutes = usage.used_minutes ?? 0;
    const dailyLimit = usage.daily_limit_minutes ?? 30;

    return `
        <article class="surface child-card" data-child-card="${cardId}" data-id="${cardId}" data-path="${cardPath}">
            <div class="child-card-head">
                <div class="avatar">${initials}</div>
                <div class="child-title">
                    <h2>${escapeHtml(child.full_name)}</h2>
                    <div class="meta-row">
                        <span>${escapeHtml(child.age)} tuổi</span>
                        <button class="copy-id-btn link-button" data-id="${escapeHtml(child.user_id)}" type="button">
                            <i data-lucide="copy"></i>
                            <span>Sao chép ID</span>
                        </button>
                    </div>
                </div>
                <span class="status-chip ${alerts.length ? 'warning' : 'ok'}">
                    <i data-lucide="${alerts.length ? 'triangle-alert' : 'circle-check'}"></i>
                    <span>${alerts.length ? `${alerts.length} cảnh báo` : 'Ổn định'}</span>
                </span>
            </div>

            <div class="child-mini-stats" aria-label="Tóm tắt học tập">
                <div>
                    <span>${usedMinutes}/${dailyLimit}</span>
                    <small>phút hôm nay</small>
                </div>
                <div>
                    <span>${english.today?.answered_attempts ?? 0}</span>
                    <small>lượt Anh hôm nay</small>
                </div>
                <div>
                    <span>${math.today?.answered_attempts ?? 0}</span>
                    <small>lượt Toán hôm nay</small>
                </div>
            </div>

            <div class="subject-lines">
                ${renderSubjectLine('english', english)}
                ${renderSubjectLine('math', math)}
            </div>

            <div class="usage-line">
                <div>
                    <span class="metric-value">${usage.used_minutes ?? 0}/${usage.daily_limit_minutes ?? 30}</span>
                    <span class="metric-label">phút hôm nay</span>
                </div>
                <div class="usage-bar" aria-hidden="true">
                    <span style="width: ${usagePercent(usage)}%"></span>
                </div>
            </div>

            ${alerts.length ? `<div class="alert-preview">
                <strong>${escapeHtml(nextAlert?.severity === 'high' ? 'Cần xem ngay' : 'Cần chú ý')}</strong>
                ${alerts.slice(0, 2).map(renderAlertLine).join('')}
            </div>` : ''}

            <button class="btn btn-primary next-lesson-btn" data-id="${escapeHtml(child.user_id)}" data-path="${paths.child(child.user_id, 'next')}" type="button">
                <i data-lucide="circle-arrow-right"></i>
                <span>Bài học tiếp theo</span>
            </button>
        </article>
    `;
}

function renderSubjectLine(subject, summary = {}) {
    const enabled = summary.enabled !== false;
    return `
        <div class="subject-line ${subject}">
            <div>
                <span class="subject-name">
                    <span class="subject-mark">${subject === 'english' ? 'A' : '∑'}</span>
                    ${SUBJECT_LABELS[subject]}
                </span>
                <span class="subject-level">${enabled ? formatLevel(summary.level) : 'Đang tắt'}</span>
            </div>
            <div class="subject-stats">
                <span>${summary.today?.answered_attempts ?? 0} lượt hôm nay</span>
                <span>${summary.streak_days ?? 0} ngày liên tiếp</span>
            </div>
        </div>
    `;
}

function renderNotification(alert) {
    return `
        <div class="notification-item ${escapeHtml(alert.severity || 'medium')}">
            <strong>${escapeHtml(alert.childName)}</strong>
            <p>${escapeHtml(alert.message || 'Có thông tin cần xem.')}</p>
        </div>
    `;
}

function renderAlertLine(alert) {
    return `<p class="${escapeHtml(alert.severity || 'medium')}">${escapeHtml(alert.message || '')}</p>`;
}

function renderSummaryTile(label, value, icon, tone, caption, id = '') {
    return `
        <div class="summary-tile ${escapeHtml(tone)}"${id ? ` id="${id}"` : ''}>
            <span class="summary-icon"><i data-lucide="${escapeHtml(icon)}"></i></span>
            <div>
                <strong>${escapeHtml(value)}</strong>
                <span>${escapeHtml(label)}</span>
                <small>${escapeHtml(caption)}</small>
            </div>
        </div>
    `;
}

function renderPriorityBanner(alerts) {
    if (!alerts.length) {
        return `
            <section class="priority-banner calm">
                <span class="priority-banner-icon"><i data-lucide="sparkles"></i></span>
                <div>
                    <strong>Hôm nay chưa có cảnh báo cần xử lý.</strong>
                    <p>Ba mẹ có thể mở từng hồ sơ để xem bài học tiếp theo hoặc điều chỉnh cấu hình dạy.</p>
                </div>
            </section>
        `;
    }
    const topAlert = alerts.find(alert => alert.severity === 'high') || alerts[0];
    return `
        <section class="priority-banner attention">
            <span class="priority-banner-icon"><i data-lucide="message-circle-warning"></i></span>
            <div>
                <strong>${escapeHtml(topAlert.childName)} cần ba mẹ xem.</strong>
                <p>${escapeHtml(topAlert.message || 'Có thông tin học tập cần chú ý.')}</p>
            </div>
        </section>
    `;
}

function renderEmptyState() {
    return `
        <div class="surface empty-state">
            <h2>Chưa có hồ sơ bé</h2>
            <p>Thêm hồ sơ đầu tiên để theo dõi tiến độ học tập.</p>
        </div>
    `;
}

function renderFallbackNotice() {
    return `
        <div class="surface fallback-notice">
            <strong>Đang dùng dữ liệu báo cáo cơ bản.</strong>
            <p>Backend hiện tại chưa hỗ trợ tổng quan mới cho một số bé. Giao diện vẫn hoạt động, nhưng số phút học hôm nay và một vài cảnh báo có thể chưa đầy đủ.</p>
        </div>
    `;
}

function hasFallbackOverview() {
    return Object.values(state.overviewCache).some(overview => overview?.source === 'fallback_progress_report');
}

function countCameraEnabled() {
    return Object.values(state.overviewCache)
        .filter(overview => overview && overview.teaching_config?.camera_learning_enabled !== false)
        .length;
}

function childNameById(childId) {
    return state.childrenList.find(child => child.user_id === childId)?.full_name || 'Bé';
}

function usagePercent(usage = {}) {
    const limit = Number(usage.daily_limit_minutes || 30);
    const used = Number(usage.used_minutes || 0);
    return Math.max(0, Math.min(100, Math.round((used / Math.max(limit, 1)) * 100)));
}
