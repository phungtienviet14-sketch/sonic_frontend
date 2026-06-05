import { api } from '../api.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { renderDashboard } from './dashboard.js';
import { renderReport } from './report.js';
import { renderConfig } from './config.js';
import { escapeHtml } from '../utils.js';

const SUBJECT_LABELS = {
    english: 'Tiếng Anh',
    math: 'Toán',
};

export async function renderChildMenu(activeTab = 'overview') {
    if (!state.currentChild) {
        renderDashboard();
        return;
    }

    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải hồ sơ bé...</p>`;
    try {
        const overview = await loadOverview();
        state.currentOverview = overview;

        appElement.innerHTML = `
            <main class="page-shell">
                <header class="workspace-header surface">
                    <button id="backBtn" class="btn btn-outline btn-inline" type="button">Trở lại</button>
                    <div class="workspace-title">
                        <p class="eyebrow">Không gian học tập</p>
                        <h1>${escapeHtml(overview.child?.full_name || state.currentChild.full_name)}</h1>
                    </div>
                    <div class="workspace-kpis">
                        <span>${overview.daily_usage?.used_minutes ?? 0}/${overview.daily_usage?.daily_limit_minutes ?? 30} phút</span>
                        <span>${overview.alerts?.length || 0} cảnh báo</span>
                    </div>
                </header>

                <nav class="workspace-tabs" aria-label="Không gian học tập">
                    ${tabButton('overview', 'Tổng quan', activeTab)}
                    ${tabButton('next', 'Bài học tiếp theo', activeTab)}
                    <button class="tab-button" id="openReportBtn" type="button">Báo cáo</button>
                    <button class="tab-button" id="openConfigBtn" type="button">Cấu hình</button>
                </nav>

                ${activeTab === 'next' ? renderNextLessonPanel(overview) : renderOverviewPanel(overview)}
            </main>
        `;

        document.getElementById('backBtn').addEventListener('click', renderDashboard);
        document.querySelectorAll('[data-workspace-tab]').forEach(button => {
            button.addEventListener('click', () => renderChildMenu(button.getAttribute('data-workspace-tab')));
        });
        document.getElementById('openReportBtn').addEventListener('click', () => renderReport());
        document.getElementById('openConfigBtn').addEventListener('click', () => renderConfig());
    } catch (error) {
        appElement.innerHTML = `
            <main class="page-shell narrow">
                <div class="surface error-panel">
                    <h2>Không tải được hồ sơ</h2>
                    <p>${escapeHtml(error.message)}</p>
                    <button id="backBtn" class="btn btn-primary" type="button">Trở lại</button>
                </div>
            </main>
        `;
        document.getElementById('backBtn').addEventListener('click', renderDashboard);
    }
}

async function loadOverview() {
    const childId = state.currentChild.user_id;
    if (state.overviewCache[childId]) return state.overviewCache[childId];
    const overview = await api.getOverview(childId);
    state.overviewCache[childId] = overview;
    return overview;
}

function renderOverviewPanel(overview) {
    const english = overview.subjects?.english || {};
    const math = overview.subjects?.math || {};
    const insights = collectInsightLines(overview);

    return `
        <section class="workspace-grid">
            <article class="surface overview-primary">
                <div class="section-head">
                    <div>
                        <p class="eyebrow">Tổng quan hôm nay</p>
                        <h2>Nhịp học và ưu tiên</h2>
                    </div>
                    <span class="status-chip ${overview.daily_usage?.near_limit ? 'warning' : 'ok'}">
                        ${overview.daily_usage?.remaining_minutes ?? 0} phút còn lại
                    </span>
                </div>
                <div class="usage-line large">
                    <div>
                        <span class="metric-value">${overview.daily_usage?.used_minutes ?? 0}/${overview.daily_usage?.daily_limit_minutes ?? 30}</span>
                        <span class="metric-label">phút học hôm nay</span>
                    </div>
                    <div class="usage-bar"><span style="width: ${usagePercent(overview.daily_usage)}%"></span></div>
                </div>
                <div class="insight-list">
                    ${insights.length ? insights.map(line => `<p>${escapeHtml(line)}</p>`).join('') : '<p>Chưa có nhận xét mới từ hoạt động học gần đây.</p>'}
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
                    ${primary ? `<span class="priority ${escapeHtml(primary.priority || 'normal')}">${priorityLabel(primary.priority)}</span>` : ''}
                </div>
                ${primary ? `
                    <div class="recommendation-detail">
                        <p><strong>Môn:</strong> ${escapeHtml(SUBJECT_LABELS[primary.subject] || primary.subject || 'Học tập')}</p>
                        <p><strong>Lý do:</strong> ${reasonLabel(primary.reason)}</p>
                        ${primary.skill_id ? `<p><strong>Kỹ năng:</strong> ${escapeHtml(labelCode(primary.skill_id))}</p>` : ''}
                        ${primary.mastery_score !== undefined ? `<p><strong>Mastery:</strong> ${escapeHtml(primary.mastery_score)}%</p>` : ''}
                    </div>
                ` : '<p class="muted">Khi bé có thêm lịch sử học, hệ thống sẽ trả về đề xuất cụ thể hơn.</p>'}
            </article>

            <aside class="surface">
                <h2>Tín hiệu sử dụng</h2>
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
                <span class="status-chip ${enabled ? 'ok' : 'muted-chip'}">${enabled ? 'Đang bật' : 'Đang tắt'}</span>
            </div>
            <div class="metric-strip">
                <div><strong>${summary.xp ?? 0}</strong><span>điểm XP</span></div>
                <div><strong>${summary.streak_days ?? 0}</strong><span>chuỗi ngày</span></div>
                <div><strong>${today.answered_attempts ?? 0}</strong><span>lượt làm</span></div>
            </div>
            <div class="subject-note">
                <p>Đánh giá đầu vào: ${placement.status === 'completed' ? `${placement.placement_score ?? 0}/100, cấp độ ${formatLevel(placement.recommended_level)}` : 'đang chờ'}</p>
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
                <span class="status-chip ${alerts.length ? 'warning' : 'ok'}">${alerts.length}</span>
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

function tabButton(tab, label, activeTab) {
    return `<button class="tab-button ${tab === activeTab ? 'active' : ''}" data-workspace-tab="${tab}" type="button">${label}</button>`;
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

function labelCode(value) {
    const labels = {
        counting: 'đếm số',
        comparison: 'so sánh',
        addition: 'phép cộng',
        subtraction: 'phép trừ',
        multiplication: 'phép nhân',
        division: 'phép chia',
        geometry: 'hình học',
        geometry_shapes: 'nhận biết hình',
        time: 'xem giờ',
        money: 'tiền và mua bán',
        logic: 'tư duy logic',
        logic_patterns: 'quy luật',
        vocabulary: 'từ vựng',
        listening: 'nghe hiểu',
        speaking: 'nói',
        sentence_patterns: 'mẫu câu',
        picture_talk: 'nói theo tranh',
        operation_confusion: 'nhầm phép tính',
        counting_error: 'đếm sai',
        off_by_one: 'lệch một đơn vị',
        carry_error: 'sai nhớ khi cộng',
        borrow_error: 'sai mượn khi trừ',
    };
    return labels[String(value || '').toLowerCase()] || String(value || 'chưa rõ');
}
