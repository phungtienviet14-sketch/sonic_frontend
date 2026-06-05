import { api } from '../api.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { renderChildMenu } from './childMenu.js';
import { escapeHtml } from '../utils.js';

const SUBJECTS = {
    english: { label: 'Tiếng Anh', className: 'english' },
    math: { label: 'Toán', className: 'math' },
};

export async function renderReport(activeTab = 'overview') {
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải báo cáo...</p>`;
    try {
        const report = await api.getReport(state.currentChild.user_id);
        const english = report.english || {};
        const math = report.math || {};

        appElement.innerHTML = `
            <main class="page-shell">
                <header class="app-header simple">
                    <div>
                        <p class="eyebrow">${escapeHtml(state.currentChild.full_name)}</p>
                        <h1>Báo cáo học tập</h1>
                    </div>
                    <button id="backMenuBtn" class="btn btn-outline btn-inline" type="button">Đóng</button>
                </header>

                <nav class="workspace-tabs report-tabs" aria-label="Báo cáo học tập">
                    ${reportTabButton('overview', 'Tổng quan', activeTab)}
                    ${reportTabButton('english', 'Tiếng Anh', activeTab)}
                    ${reportTabButton('math', 'Toán', activeTab)}
                    ${reportTabButton('history', 'Lịch sử', activeTab)}
                </nav>

                ${renderReportBody(activeTab, english, math)}
            </main>
        `;

        document.getElementById('backMenuBtn').addEventListener('click', () => renderChildMenu('overview'));
        document.querySelectorAll('[data-report-tab]').forEach(button => {
            button.addEventListener('click', () => renderReport(button.getAttribute('data-report-tab')));
        });
        if (activeTab === 'overview') {
            renderLearningChart(english, math);
        }
    } catch (error) {
        appElement.innerHTML = `
            <main class="page-shell narrow">
                <div class="surface error-panel">
                    <h2>Không tải được báo cáo</h2>
                    <p>${escapeHtml(error.message)}</p>
                    <button id="backMenuBtn" class="btn btn-primary" type="button">Quay lại</button>
                </div>
            </main>
        `;
        document.getElementById('backMenuBtn').addEventListener('click', () => renderChildMenu('overview'));
    }
}

function renderReportBody(activeTab, english, math) {
    if (activeTab === 'english') return renderSubjectTab('english', english);
    if (activeTab === 'math') return renderSubjectTab('math', math);
    if (activeTab === 'history') return renderHistoryTab(english, math);
    return renderOverviewTab(english, math);
}

function renderOverviewTab(english, math) {
    return `
        <section class="report-overview-grid">
            <article class="surface chart-panel">
                <div class="section-head">
                    <div>
                        <p class="eyebrow">Lượt làm, điểm và XP</p>
                        <h2>Nhịp tiến bộ</h2>
                    </div>
                </div>
                <div class="chart-wrap">
                    <canvas id="learningChart"></canvas>
                </div>
            </article>

            <article class="surface report-summary">
                <h2>Tổng quan môn học</h2>
                ${renderSubjectSummary('english', english)}
                ${renderSubjectSummary('math', math)}
            </article>

            <article class="surface report-summary">
                <h2>Đánh giá đầu vào</h2>
                ${renderPlacementRow('Tiếng Anh', english.placement)}
                ${renderPlacementRow('Toán', math.placement)}
            </article>

            <article class="surface report-summary">
                <h2>Nhận xét học tập</h2>
                ${renderInsightBlock('Tiếng Anh', english.learning_insights)}
                ${renderInsightBlock('Toán', math.learning_insights)}
            </article>

            <article class="surface report-summary wide">
                <h2>Gợi ý học tiếp</h2>
                <div class="recommendation-list compact-list">
                    ${[...tagRecommendations('english', english.recommendations), ...tagRecommendations('math', math.recommendations)].slice(0, 8).map(renderRecommendationRow).join('') || '<p class="muted compact">Chưa có gợi ý mới.</p>'}
                </div>
            </article>
        </section>
    `;
}

function renderSubjectTab(subject, data) {
    const meta = SUBJECTS[subject];
    return `
        <section class="subject-report-grid">
            <article class="surface subject-hero ${meta.className}">
                <div class="section-head">
                    <div>
                        <p class="eyebrow">${meta.label}</p>
                        <h2>Cấp độ ${formatLevel(data?.level_info?.current_level)}</h2>
                    </div>
                    <span class="status-chip ok">${data?.level_info?.total_xp || 0} điểm XP</span>
                </div>
                <div class="metric-strip">
                    <div><strong>${data?.level_info?.streak_days || 0}</strong><span>chuỗi ngày</span></div>
                    <div><strong>${data?.daily_summary?.attempts?.answered_attempts || 0}</strong><span>lượt làm hôm nay</span></div>
                    <div><strong>${scoreLabel(data?.daily_summary?.average_score)}</strong><span>điểm hôm nay</span></div>
                </div>
                ${renderPlacementBox(data?.placement)}
            </article>

            <article class="surface">
                <h2>Mức thành thạo kỹ năng</h2>
                ${renderSkillMastery(data?.skill_mastery || [])}
            </article>

            <article class="surface">
                <h2>${subject === 'english' ? 'Kho từ cần ôn' : 'Lỗi Toán hay gặp'}</h2>
                ${subject === 'english' ? renderWordBank(data?.word_bank) : renderMisconceptions(data?.misconceptions || [])}
            </article>

            <article class="surface">
                <h2>Gợi ý từ hệ thống</h2>
                <div class="recommendation-list compact-list">
                    ${(data?.recommendations || []).map(item => renderRecommendationRow({ ...item, subject })).join('') || '<p class="muted compact">Chưa có gợi ý mới.</p>'}
                </div>
            </article>
        </section>
    `;
}

function renderHistoryTab(english, math) {
    const rows = [
        ...historyRows('english', english),
        ...historyRows('math', math),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 24);

    return `
        <section class="surface history-panel">
            <div class="section-head">
                <div>
                    <p class="eyebrow">Lịch sử</p>
                    <h2>Hoạt động gần đây</h2>
                </div>
            </div>
            <div class="history-list">
                ${rows.length ? rows.map(row => `
                    <div class="history-row ${escapeHtml(row.subject)}">
                        <div>
                            <strong>${escapeHtml(row.title)}</strong>
                            <p>${escapeHtml(SUBJECTS[row.subject]?.label || row.subject)} · ${escapeHtml(row.detail || 'Hoạt động học')}</p>
                        </div>
                        <div class="history-score">
                            <span>${row.score !== null && row.score !== undefined ? `${escapeHtml(row.score)}` : '-'}</span>
                            <small>${formatDate(row.date)}</small>
                        </div>
                    </div>
                `).join('') : '<p class="muted compact">Chưa có lịch sử học.</p>'}
            </div>
        </section>
    `;
}

function renderSubjectSummary(subject, data) {
    const meta = SUBJECTS[subject];
    const attempts = data?.daily_summary?.attempts || {};
    return `
        <div class="summary-row ${meta.className}">
            <div>
                <strong>${meta.label}</strong>
                <p>Cấp độ ${formatLevel(data?.level_info?.current_level)} · ${data?.level_info?.total_xp || 0} điểm XP</p>
            </div>
            <div class="summary-numbers">
                <span>${attempts.answered_attempts || 0} lượt làm</span>
                <span>${attempts.correct_attempts || 0} đúng</span>
            </div>
        </div>
    `;
}

function renderPlacementRow(label, placement = {}) {
    const completed = placement?.status === 'completed';
    return `
        <div class="summary-row">
            <div>
                <strong>${escapeHtml(label)}</strong>
                <p>${completed ? `Đề xuất cấp độ ${formatLevel(placement.recommended_level)}` : 'Chưa hoàn tất đánh giá đầu vào'}</p>
            </div>
            <span class="status-chip ${completed ? 'ok' : 'warning'}">${completed ? `${placement.placement_score ?? 0}/100` : 'Đang chờ'}</span>
        </div>
    `;
}

function renderPlacementBox(placement = {}) {
    if (placement?.status !== 'completed') {
        return '<div class="subject-note"><p>Đánh giá đầu vào đang chờ hoàn tất.</p></div>';
    }
    return `
        <div class="subject-note">
            <p>Đánh giá đầu vào ${placement.placement_score ?? 0}/100, đề xuất cấp độ ${formatLevel(placement.recommended_level)}.</p>
        </div>
    `;
}

function renderInsightBlock(label, insights = {}) {
    const actions = (insights.next_actions || []).slice(0, 2);
    return `
        <div class="insight-block">
            <strong>${escapeHtml(label)}</strong>
            <p>${escapeHtml(insights.summary || 'Chưa có nhận xét mới.')}</p>
            ${actions.length ? `<div class="signal-list inline">${actions.map(item => `<span>${escapeHtml(labelCode(item.label || item.type || 'Ôn tập'))}</span>`).join('')}</div>` : ''}
        </div>
    `;
}

function renderSkillMastery(items) {
    if (!items.length) return '<p class="muted compact">Chưa có dữ liệu skill mastery.</p>';
    return `
        <div class="data-table">
            ${items.slice(0, 12).map(item => `
                <div class="data-row">
                    <span>${escapeHtml(labelCode(item.skill_id || 'skill'))}</span>
                    <strong>${Math.round(Number(item.mastery_score || 0))}%</strong>
                </div>
            `).join('')}
        </div>
    `;
}

function renderWordBank(wordBank = {}) {
    const summary = wordBank.summary || {};
    const dueWords = wordBank.due_words || [];
    return `
        <div class="metric-strip">
            <div><strong>${summary.total_words || 0}</strong><span>tổng từ</span></div>
            <div><strong>${summary.weak_words || 0}</strong><span>từ yếu</span></div>
            <div><strong>${summary.due_words || 0}</strong><span>đến hạn</span></div>
        </div>
        <div class="data-table">
            ${dueWords.length ? dueWords.slice(0, 10).map(word => `
                <div class="data-row">
                    <span>${escapeHtml(word.word || '')}<small>${escapeHtml(word.meaning_vi || '')}</small></span>
                    <strong>${word.strength_score ?? 0}</strong>
                </div>
            `).join('') : '<p class="muted compact">Chưa có từ cần ôn.</p>'}
        </div>
    `;
}

function renderMisconceptions(items) {
    if (!items.length) return '<p class="muted compact">Chưa có lỗi Toán lặp lại.</p>';
    return `
        <div class="data-table">
            ${items.slice(0, 10).map(item => `
                <div class="data-row">
                    <span>${escapeHtml(labelCode(item.error_type || 'unknown'))}<small>${escapeHtml(labelCode(item.skill_id || 'general'))}</small></span>
                    <strong>${item.count || 0} lần</strong>
                </div>
            `).join('')}
        </div>
    `;
}

function renderRecommendationRow(item) {
    return `
        <div class="recommendation-row">
            <div>
                <strong>${escapeHtml(labelCode(item.label || item.title || item.type || 'Bài học'))}</strong>
                <p>${escapeHtml(SUBJECTS[item.subject]?.label || item.subject || 'Học tập')} · ${reasonLabel(item.reason)}</p>
            </div>
            <span class="priority ${escapeHtml(item.priority || 'normal')}">${priorityLabel(item.priority)}</span>
        </div>
    `;
}

function renderLearningChart(english, math) {
    const canvas = document.getElementById('learningChart');
    if (!canvas || !window.Chart) return;
    if (window.sonicParentReportChart) {
        window.sonicParentReportChart.destroy();
    }
    const englishAttempts = english?.daily_summary?.attempts || {};
    const mathAttempts = math?.daily_summary?.attempts || {};

    window.sonicParentReportChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Lượt làm hôm nay', 'Đúng hôm nay', 'Điểm trung bình', 'XP'],
            datasets: [
                {
                    label: 'Tiếng Anh',
                    data: [
                        englishAttempts.answered_attempts || 0,
                        englishAttempts.correct_attempts || 0,
                        english?.daily_summary?.average_score || 0,
                        english?.level_info?.total_xp || 0,
                    ],
                    backgroundColor: 'rgba(37, 99, 235, 0.72)',
                    borderRadius: 4,
                },
                {
                    label: 'Toán',
                    data: [
                        mathAttempts.answered_attempts || 0,
                        mathAttempts.correct_attempts || 0,
                        math?.daily_summary?.average_score || 0,
                        math?.level_info?.total_xp || 0,
                    ],
                    backgroundColor: 'rgba(22, 163, 74, 0.72)',
                    borderRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true },
            },
            plugins: {
                legend: { position: 'bottom' },
            },
        },
    });
}

function historyRows(subject, data) {
    const attempts = (data?.recent_attempts || []).map(item => ({
        subject,
        title: item.prompt_text || item.activity_type || 'Lượt làm',
        detail: item.correct === true ? 'Đúng' : item.correct === false ? 'Cần ôn' : statusLabel(item.status || 'Lượt làm'),
        score: item.score,
        date: item.answered_at || item.created_at,
    }));
    const activities = (data?.recent_activities || []).map(item => ({
        subject,
        title: item.topic || item.activity_type || 'Hoạt động',
        detail: item.activity_type || item.level || 'Hoạt động học',
        score: item.score,
        date: item.completed_at,
    }));
    return [...attempts, ...activities];
}

function tagRecommendations(subject, items = []) {
    return items.map(item => ({ ...item, subject }));
}

function reportTabButton(tab, label, activeTab) {
    return `<button class="tab-button ${tab === activeTab ? 'active' : ''}" data-report-tab="${tab}" type="button">${label}</button>`;
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
        weak_or_due_word: 'Từ cần ôn hoặc đến hạn',
        repeated_math_error: 'Lỗi Toán lặp lại',
        low_mastery_or_due_skill: 'Kỹ năng yếu hoặc đến hạn',
        continue_current_level: 'Tiếp tục level hiện tại',
        repair_repeated_misconception: 'Sửa lỗi hiểu nhầm lặp lại',
    }[reason] || escapeHtml(reason || 'Theo tiến độ hiện tại');
}

function scoreLabel(score) {
    return score === null || score === undefined ? '-' : Math.round(Number(score));
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

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN');
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
        review_word: 'ôn từ cần nhớ',
        repair_misconception: 'sửa lỗi hay gặp',
        practice_skill: 'luyện kỹ năng',
        next_lesson: 'bài tiếp theo',
        english: 'Tiếng Anh',
        math: 'Toán',
    };
    return labels[String(value || '').toLowerCase()] || String(value || 'chưa rõ');
}

function statusLabel(value) {
    const labels = {
        pending: 'đang chờ',
        answered: 'đã trả lời',
        completed: 'đã hoàn tất',
        skipped: 'đã bỏ qua',
    };
    return labels[String(value || '').toLowerCase()] || String(value || 'Lượt làm');
}
