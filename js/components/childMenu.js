import { navigateTo, paths } from '../navigation.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { loadChildOverview } from '../overviewFallback.js';
import { escapeHtml, refreshIcons, formatLevel, labelCode } from '../utils.js';

const SUBJECT_LABELS = {
    english: 'Tiếng Anh',
    math: 'Toán',
};

export async function renderChildMenu(activeTab = 'overview') {
    if (!state.currentChild) {
        navigateTo(paths.dashboard(), { replace: true });
        return;
    }

    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải hồ sơ bé...</p>`;
    try {
        const overview = await loadOverview();
        state.currentOverview = overview;

        appElement.innerHTML = `
            <main class="page-shell">
                <header class="workspace-header surface">
                    <button id="backBtn" class="btn btn-outline btn-inline" data-path="${paths.dashboard()}" type="button">
                        <i data-lucide="arrow-left"></i>
                        <span>Trở lại</span>
                    </button>
                    <div class="workspace-title">
                        <div class="workspace-child-mark">${childInitial(overview)}</div>
                        <div>
                            <p class="eyebrow">Không gian học tập</p>
                            <h1>${escapeHtml(overview.child?.full_name || state.currentChild.full_name)}</h1>
                            <button id="editChildBtn" class="link-button" data-path="${paths.editChild(state.currentChild.user_id)}" type="button">
                                <i data-lucide="pencil"></i>
                                <span>Sửa tên / tuổi</span>
                            </button>
                        </div>
                    </div>
                    <div class="workspace-kpis">
                        <span><i data-lucide="timer"></i>${overview.daily_usage?.used_minutes ?? 0}/${overview.daily_usage?.daily_limit_minutes ?? 30} phút</span>
                        <span><i data-lucide="${overview.alerts?.length ? 'triangle-alert' : 'shield-check'}"></i>${overview.alerts?.length || 0} cảnh báo</span>
                    </div>
                </header>

                <nav class="workspace-tabs" aria-label="Không gian học tập">
                    ${tabButton('overview', 'Tổng quan', activeTab, 'layout-dashboard')}
                    <button class="tab-button" id="openLessonsBtn" data-path="${paths.lessons(state.currentChild.user_id)}" type="button"><i data-lucide="book-marked"></i><span>Lộ trình Anh</span></button>
                    <button class="tab-button" id="openMathRoadmapBtn" data-path="${paths.mathRoadmap(state.currentChild.user_id)}" type="button"><i data-lucide="milestone"></i><span>Lộ trình Toán</span></button>
                    <button class="tab-button" id="openReportBtn" data-path="${paths.report(state.currentChild.user_id)}" type="button"><i data-lucide="chart-column"></i><span>Báo cáo</span></button>
                    <button class="tab-button" id="openConfigBtn" data-path="${paths.config(state.currentChild.user_id)}" type="button"><i data-lucide="sliders-horizontal"></i><span>Cấu hình</span></button>
                    <button class="tab-button" id="openConnectBtn" data-path="${paths.connect(state.currentChild.user_id)}" type="button"><i data-lucide="qr-code"></i><span>Kết nối robot</span></button>
                    <button class="tab-button" id="openPrivacyBtn" data-path="${paths.privacy(state.currentChild.user_id)}" type="button"><i data-lucide="shield-check"></i><span>Quyền riêng tư</span></button>
                </nav>
                ${overview.source === 'fallback_progress_report' ? renderFallbackNotice() : ''}

                ${renderOverviewPanel(overview)}
            </main>
        `;

        document.getElementById('backBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
        document.querySelectorAll('[data-workspace-tab]').forEach(button => {
            button.addEventListener('click', () => navigateTo(button.getAttribute('data-path')));
        });
        document.getElementById('openLessonsBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
        document.getElementById('openMathRoadmapBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
        document.getElementById('openReportBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
        document.getElementById('openConfigBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
        document.getElementById('openConnectBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
        document.getElementById('openPrivacyBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
        document.getElementById('editChildBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
        refreshIcons();
    } catch (error) {
        appElement.innerHTML = `
            <main class="page-shell narrow">
                <div class="surface error-panel">
                    <h2>Không tải được hồ sơ</h2>
                    <p>${escapeHtml(error.message)}</p>
                    <button id="backBtn" class="btn btn-primary" data-path="${paths.dashboard()}" type="button">
                        <i data-lucide="arrow-left"></i>
                        <span>Trở lại</span>
                    </button>
                </div>
            </main>
        `;
        document.getElementById('backBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
        refreshIcons();
    }
}

async function loadOverview() {
    const childId = state.currentChild.user_id;
    if (state.overviewCache[childId]) return state.overviewCache[childId];
    const overview = await loadChildOverview(state.currentChild);
    state.overviewCache[childId] = overview;
    return overview;
}

function renderFallbackNotice() {
    return `
        <div class="surface fallback-notice">
            <strong>Đang dùng dữ liệu báo cáo cơ bản.</strong>
            <p>Backend hiện tại chưa hỗ trợ tổng quan mới. Ba mẹ vẫn xem được báo cáo, cấu hình và gợi ý cơ bản trong lúc chờ backend mới được triển khai.</p>
        </div>
    `;
}

function renderOverviewPanel(overview) {
    const english = overview.subjects?.english || {};
    const math = overview.subjects?.math || {};
    const insights = collectInsightLines(overview);
    const usage = overview.daily_usage || {};

    return `
        <section class="workspace-grid">
            <article class="surface overview-primary">
                <div class="section-head">
                    <div>
                        <p class="eyebrow">Tổng quan hôm nay</p>
                        <h2>Nhịp học và ưu tiên</h2>
                    </div>
                    <span class="status-chip ${overview.daily_usage?.near_limit ? 'warning' : 'ok'}">
                        <i data-lucide="${overview.daily_usage?.near_limit ? 'alarm-clock' : 'clock'}"></i>
                        <span>${overview.daily_usage?.remaining_minutes ?? 0} phút còn lại</span>
                    </span>
                </div>
                <div class="today-focus-grid">
                    <div>
                        <span>${usage.used_minutes ?? 0}</span>
                        <small>phút đã học</small>
                    </div>
                    <div>
                        <span>${usage.remaining_minutes ?? 0}</span>
                        <small>phút còn lại</small>
                    </div>
                    <div>
                        <span>${overview.alerts?.length || 0}</span>
                        <small>việc cần xem</small>
                    </div>
                </div>
                <div class="usage-line large">
                    <div>
                        <span class="metric-value">${overview.daily_usage?.used_minutes ?? 0}/${overview.daily_usage?.daily_limit_minutes ?? 30}</span>
                        <span class="metric-label">phút học hôm nay</span>
                    </div>
                    <div class="usage-bar"><span style="width: ${usagePercent(overview.daily_usage)}%"></span></div>
                </div>
                <div class="insight-list">
                    ${insights.length ? insights.map(line => `<p><i data-lucide="sparkle"></i><span>${escapeHtml(line)}</span></p>`).join('') : '<p><i data-lucide="info"></i><span>Chưa có nhận xét mới từ hoạt động học gần đây.</span></p>'}
                </div>
            </article>

            ${renderSubjectOverview('english', english)}
            ${renderSubjectOverview('math', math)}
            ${renderAlertsPanel(overview.alerts || [])}
        </section>
    `;
}

function renderNextLessonPanel(overview) {
    const recommendations = overview.next_recommendations || [];
    const sourceSignals = buildSourceSignals(overview);
    const primary = recommendations[0];

    return `
        <section class="next-lesson-layout">
            <article class="surface next-lesson-main">
                <div class="section-head">
                    <div>
                        <p class="eyebrow">Đề xuất từ hệ thống</p>
                        <h2>${primary ? escapeHtml(primary.title || primary.label || 'Bài học tiếp theo') : 'Chờ dữ liệu đề xuất'}</h2>
                    </div>
                    ${primary ? `<span class="priority ${escapeHtml(primary.priority || 'normal')}"><i data-lucide="flag"></i>${priorityLabel(primary.priority)}</span>` : ''}
                </div>
                ${primary ? `
                    <div class="recommendation-detail">
                        <p><i data-lucide="book-open"></i><span><strong>Môn:</strong> ${escapeHtml(SUBJECT_LABELS[primary.subject] || primary.subject || 'Học tập')}</span></p>
                        <p><i data-lucide="lightbulb"></i><span><strong>Lý do:</strong> ${reasonLabel(primary.reason)}</span></p>
                        ${primary.skill_id ? `<p><i data-lucide="target"></i><span><strong>Kỹ năng:</strong> ${escapeHtml(labelCode(primary.skill_id))}</span></p>` : ''}
                        ${primary.mastery_score !== undefined ? `<p><i data-lucide="gauge"></i><span><strong>Mức thành thạo:</strong> ${escapeHtml(primary.mastery_score)}%</span></p>` : ''}
                    </div>
                ` : '<p class="muted">Khi bé có thêm lịch sử học, hệ thống sẽ trả về đề xuất cụ thể hơn.</p>'}
            </article>

            <aside class="surface">
                <div class="section-head compact-head">
                    <h2>Tín hiệu sử dụng</h2>
                    <span class="soft-icon"><i data-lucide="radar"></i></span>
                </div>
                <div class="signal-list">
                    ${sourceSignals.length ? sourceSignals.map(signal => `<span>${escapeHtml(signal)}</span>`).join('') : '<p class="muted compact">Chưa có tín hiệu ưu tiên mạnh.</p>'}
                </div>
            </aside>

            <section class="surface recommendation-list">
                <h2>Các lựa chọn tiếp theo</h2>
                ${recommendations.length ? recommendations.map(renderRecommendationRow).join('') : '<p class="muted compact">Chưa có đề xuất mới.</p>'}
            </section>
        </section>
    `;
}

function renderSubjectOverview(subject, summary = {}) {
    const enabled = summary.enabled !== false;
    const today = summary.today || {};
    const placement = summary.placement || {};
    return `
        <article class="surface subject-overview ${subject}">
            <div class="section-head compact-head">
                <div>
                    <h2>${SUBJECT_LABELS[subject]}</h2>
                    <p>${enabled ? formatLevel(summary.level) : 'Đang tắt'}</p>
                </div>
                <span class="status-chip ${enabled ? 'ok' : 'muted-chip'}">
                    <i data-lucide="${enabled ? 'circle-check' : 'circle-off'}"></i>
                    <span>${enabled ? 'Đang bật' : 'Đang tắt'}</span>
                </span>
            </div>
            <div class="metric-strip">
                <div><strong>${summary.streak_days ?? 0}</strong><span>chuỗi ngày</span></div>
                <div><strong>${today.answered_attempts ?? 0}</strong><span>lượt làm hôm nay</span></div>
                <div><strong>${today.correct_attempts ?? 0}</strong><span>câu đúng hôm nay</span></div>
            </div>
            <div class="subject-note">
                <p>Đánh giá đầu vào: ${placement.status === 'completed' ? `đã xong, cấp độ ${formatLevel(placement.recommended_level)}` : 'đang chờ'}</p>
                ${renderNeedsReview(subject, summary)}
            </div>
        </article>
    `;
}

function renderNeedsReview(subject, summary) {
    if (subject === 'english') {
        const wordSummary = summary.word_bank?.summary || {};
        const due = wordSummary.due_words || 0;
        const weak = wordSummary.weak_words || 0;
        return `<p>${due || weak ? `${due} từ đến hạn, ${weak} từ yếu` : 'Kho từ chưa có từ cần ôn.'}</p>`;
    }
    const misconception = (summary.misconceptions || [])[0];
    return `<p>${misconception ? `${labelCode(misconception.error_type)} lặp lại ${misconception.count || 0} lần` : 'Chưa có lỗi Toán lặp lại.'}</p>`;
}

function renderAlertsPanel(alerts) {
    return `
        <article class="surface alert-panel">
            <div class="section-head compact-head">
                <h2>Thông báo thông minh</h2>
                <span class="status-chip ${alerts.length ? 'warning' : 'ok'}">
                    <i data-lucide="${alerts.length ? 'triangle-alert' : 'shield-check'}"></i>
                    <span>${alerts.length}</span>
                </span>
            </div>
            <div class="alert-list">
                ${alerts.length ? alerts.map(alert => `
                    <div class="alert-row ${escapeHtml(alert.severity || 'medium')}">
                        <strong>${alertTitle(alert.type)}</strong>
                        <p>${escapeHtml(alert.message || '')}</p>
                    </div>
                `).join('') : '<p class="muted compact">Không có cảnh báo cần xử lý.</p>'}
            </div>
        </article>
    `;
}

function renderRecommendationRow(item) {
    return `
        <div class="recommendation-row">
            <div>
                <strong>${escapeHtml(item.title || item.label || item.type || 'Bài học')}</strong>
                <p>${escapeHtml(SUBJECT_LABELS[item.subject] || item.subject || 'Học tập')} · ${reasonLabel(item.reason)}</p>
            </div>
            <span class="priority ${escapeHtml(item.priority || 'normal')}">${priorityLabel(item.priority)}</span>
        </div>
    `;
}

function collectInsightLines(overview) {
    return ['english', 'math']
        .map(subject => overview.subjects?.[subject]?.learning_insights?.summary)
        .filter(Boolean)
        .slice(0, 3);
}

function buildSourceSignals(overview) {
    const signals = [];
    const english = overview.subjects?.english || {};
    const math = overview.subjects?.math || {};
    const wordSummary = english.word_bank?.summary || {};
    if (wordSummary.due_words) signals.push(`${wordSummary.due_words} từ đến hạn ôn`);
    if (wordSummary.weak_words) signals.push(`${wordSummary.weak_words} từ yếu`);
    (english.weak_skills || []).slice(0, 2).forEach(skill => signals.push(`Kỹ năng yếu: ${labelCode(skill.skill_id)}`));
    (math.misconceptions || []).slice(0, 2).forEach(item => signals.push(`Lỗi Toán: ${labelCode(item.error_type)}`));
    (math.weak_skills || []).slice(0, 2).forEach(skill => signals.push(`Kỹ năng Toán yếu: ${labelCode(skill.skill_id)}`));
    return signals.slice(0, 8);
}

function tabButton(tab, label, activeTab, icon) {
    return `<button class="tab-button ${tab === activeTab ? 'active' : ''}" data-workspace-tab="${tab}" data-path="${paths.child(state.currentChild.user_id, tab)}" type="button"><i data-lucide="${icon}"></i><span>${label}</span></button>`;
}

function childInitial(overview) {
    return escapeHtml((overview.child?.full_name || state.currentChild.full_name || '?').trim().charAt(0).toUpperCase());
}

function usagePercent(usage = {}) {
    const limit = Number(usage.daily_limit_minutes || 30);
    const used = Number(usage.used_minutes || 0);
    return Math.max(0, Math.min(100, Math.round((used / Math.max(limit, 1)) * 100)));
}

function priorityLabel(priority = 'normal') {
    return {
        high: 'Cao',
        medium: 'Vừa',
        normal: 'Bình thường',
        low: 'Thấp',
    }[priority] || 'Bình thường';
}

function reasonLabel(reason = '') {
    return {
        weak_or_due_word: 'Từ cần ôn hoặc sắp đến hạn',
        repeated_math_error: 'Lỗi Toán lặp lại',
        low_mastery_or_due_skill: 'Kỹ năng yếu hoặc đến hạn luyện lại',
        continue_current_level: 'Tiếp tục level hiện tại',
        repair_repeated_misconception: 'Sửa lỗi hiểu nhầm lặp lại',
    }[reason] || escapeHtml(reason || 'Theo tiến độ hiện tại');
}

function alertTitle(type = '') {
    return {
        no_learning_today: 'Chưa học hôm nay',
        time_limit: 'Thời gian học',
        due_words: 'Từ đến hạn',
        weak_words: 'Từ cần ôn',
        repeated_math_error: 'Lỗi Toán lặp lại',
        subject_disabled: 'Môn đang tắt',
    }[type] || 'Cần chú ý';
}

