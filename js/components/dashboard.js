import { api } from '../api.js';
import { state } from '../state.js';
import { renderLogin, appElement } from './auth.js';
import { renderChildMenu } from './childMenu.js';
import { loadChildOverview } from '../overviewFallback.js';
import { escapeHtml, refreshIcons, showToast } from '../utils.js';

const SUBJECT_LABELS = {
    english: 'Tiếng Anh',
    math: 'Toán',
};

export async function renderDashboard() {
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải dữ liệu...</p>`;
    try {
        state.childrenList = await api.getChildren();
        const overviewPairs = await Promise.all(
            state.childrenList.map(async child => {
                try {
                    return [child.user_id, await loadChildOverview(child)];
                } catch (error) {
                    console.warn('[Sonic cho ba mẹ] Không tải được tổng quan của bé', child.user_id, error);
                    return [child.user_id, null];
                }
            })
        );
        state.overviewCache = Object.fromEntries(overviewPairs);

        const alerts = overviewPairs
            .flatMap(([childId, overview]) => (overview?.alerts || []).map(alert => ({
                ...alert,
                childId,
                childName: overview?.child?.full_name || childNameById(childId),
            })))
            .slice(0, 8);

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
                        <button id="logoutBtn" class="btn btn-outline btn-inline" type="button">
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
                    ${renderSummaryTile('Cảnh báo cần xem', alerts.length, alerts.length ? 'triangle-alert' : 'shield-check', alerts.length ? 'amber' : 'green', alerts.length ? 'Ưu tiên hôm nay' : 'Mọi thứ ổn')}
                    ${renderSummaryTile('Học qua máy ảnh', countCameraEnabled(), 'camera', 'teal', 'Đang bật')}
                </section>
                ${renderPriorityBanner(alerts)}
                ${hasFallbackOverview() ? renderFallbackNotice() : ''}

                <section class="child-grid">
                    ${state.childrenList.length ? state.childrenList.map(renderChildCard).join('') : renderEmptyState()}
                </section>

                <button class="btn btn-primary btn-wide" id="addChildBtn" type="button">Thêm bé mới</button>
            </main>
        `;

        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            renderLogin();
        });

        document.getElementById('notiBtn').addEventListener('click', () => {
            document.getElementById('notiDropdown').classList.toggle('hidden');
        });

        document.getElementById('addChildBtn').addEventListener('click', renderAddChildForm);

        document.querySelectorAll('.copy-id-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const id = button.getAttribute('data-id');
                navigator.clipboard.writeText(id).then(() => {
                    showToast(`Đã copy ID bé`);
                }).catch(() => {
                    showToast('Không thể copy ID', 'error');
                });
            });
        });

        document.querySelectorAll('.next-lesson-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                openChild(button.getAttribute('data-id'), 'next');
            });
        });

        document.querySelectorAll('.child-card').forEach(card => {
            card.addEventListener('click', () => {
                openChild(card.getAttribute('data-id'), 'overview');
            });
        });

        refreshIcons();
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

export function renderAddChildForm() {
    appElement.innerHTML = `
        <main class="page-shell narrow">
            <header class="app-header simple">
                <div>
                    <p class="eyebrow">Hồ sơ bé</p>
                    <h1>Thêm bé mới</h1>
                </div>
                <button id="backBtn" class="btn btn-outline btn-inline" type="button">
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

    document.getElementById('backBtn').addEventListener('click', renderDashboard);
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
            setTimeout(() => renderDashboard(), 700);
        } catch (error) {
            errorDiv.innerText = error.message;
            errorDiv.classList.remove('hidden');
            button.innerHTML = '<i data-lucide="user-plus"></i><span>Thêm bé</span>';
            button.disabled = false;
            refreshIcons();
        }
    });
}

function openChild(childId, tab) {
    state.currentChild = state.childrenList.find(child => child.user_id === childId);
    state.currentOverview = state.overviewCache[childId] || null;
    renderChildMenu(tab);
}

function renderChildCard(child) {
    const overview = state.overviewCache[child.user_id];
    const english = overview?.subjects?.english || {};
    const math = overview?.subjects?.math || {};
    const usage = overview?.daily_usage || {};
    const alerts = overview?.alerts || [];
    const initials = escapeHtml((child.full_name || '?').trim().charAt(0).toUpperCase());
    const nextAlert = alerts[0];
    const usedMinutes = usage.used_minutes ?? 0;
    const dailyLimit = usage.daily_limit_minutes ?? 30;

    return `
        <article class="surface child-card" data-id="${escapeHtml(child.user_id)}">
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
                    <span>${english.xp ?? 0}</span>
                    <small>XP tiếng Anh</small>
                </div>
                <div>
                    <span>${math.xp ?? 0}</span>
                    <small>XP Toán</small>
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

            <button class="btn btn-primary next-lesson-btn" data-id="${escapeHtml(child.user_id)}" type="button">
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
                <span>${summary.xp ?? 0} điểm XP</span>
                <span>${summary.streak_days ?? 0} ngày</span>
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

function renderSummaryTile(label, value, icon, tone, caption) {
    return `
        <div class="summary-tile ${escapeHtml(tone)}">
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

function formatLevel(level) {
    const labels = {
        auto: 'Tự động',
        beginner: 'Mới bắt đầu',
        elementary: 'Sơ cấp',
        intermediate: 'Trung cấp',
        pre_a1: 'Tiền A1',
        a1: 'A1',
        a2: 'A2',
    };
    return labels[String(level || 'beginner').toLowerCase()] || String(level || 'beginner').toUpperCase();
}
