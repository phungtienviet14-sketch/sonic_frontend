import { api } from '../api.js';
import { navigateTo, paths } from '../navigation.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { escapeHtml, refreshIcons } from '../utils.js';

// GĐ-Lesson Toán — màn "Lộ trình Toán" cho phụ huynh: CHỈ XEM. Lộ trình do HỆ THỐNG kiểm
// soát (ba mẹ không sửa) -> không có nút thêm/sửa/xóa. docs/lo_trinh_toan_co_kiem_soat.md.

// Trạng thái level -> nhãn + chip thân thiện (tái dùng class status-chip có sẵn).
const STATUS_VIEW = {
    passed: { label: 'Đã qua', chip: 'ok', icon: 'circle-check' },
    active: { label: 'Đang học', chip: 'warning', icon: 'play' },
    locked: { label: 'Chưa mở', chip: 'muted-chip', icon: 'lock' },
};

// Nhãn tiếng Việt cho skill Toán (giấu mã kỹ thuật).
const SKILL_LABELS = {
    counting: 'đếm số',
    compare: 'so sánh',
    addition: 'phép cộng',
    subtraction: 'phép trừ',
    multiplication: 'phép nhân',
    division: 'phép chia',
    geometry: 'hình học',
    time: 'xem giờ',
    money: 'tiền và mua bán',
    measurement: 'đo lường',
    logic: 'tư duy logic',
};

function skillsText(skills = []) {
    if (!skills.length) return '';
    return skills.map(s => SKILL_LABELS[s] || s).join(' · ');
}

export async function renderMathRoadmap() {
    if (!state.currentChild) {
        navigateTo(paths.dashboard(), { replace: true });
        return;
    }
    const childId = state.currentChild.user_id;
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải lộ trình Toán...</p>`;
    try {
        const levels = await api.getMathRoadmap(childId);
        paint(levels);
    } catch (error) {
        appElement.innerHTML = `
            <main class="page-shell narrow">
                <div class="surface error-panel">
                    <h2>Không tải được lộ trình Toán</h2>
                    <p>${escapeHtml(error.message || 'Đã có lỗi xảy ra.')}</p>
                    <button class="btn btn-primary" data-action="back" type="button">
                        <i data-lucide="arrow-left"></i><span>Trở lại</span>
                    </button>
                </div>
            </main>`;
        bindRoot();
        refreshIcons();
    }
}

function paint(levels) {
    const childName = escapeHtml(state.currentChild.full_name || 'bé');
    const started = levels.some(lvl => lvl.status === 'passed' || lvl.status === 'active');

    appElement.innerHTML = `
        <main class="page-shell" id="mathRoadmapRoot">
            <header class="workspace-header surface">
                <button class="btn btn-outline btn-inline" data-action="back" type="button">
                    <i data-lucide="arrow-left"></i><span>Trở lại</span>
                </button>
                <div class="workspace-title">
                    <div>
                        <p class="eyebrow">Lộ trình Toán</p>
                        <h1>Lộ trình Toán của ${childName}</h1>
                    </div>
                </div>
            </header>

            <section class="surface">
                <div class="section-head compact-head">
                    <div>
                        <p class="eyebrow">Hệ thống thiết kế</p>
                        <h2>Các cấp độ Toán</h2>
                    </div>
                    <span class="status-chip muted-chip"><i data-lucide="eye"></i><span>Chỉ xem</span></span>
                </div>
                <p class="muted">Lộ trình Toán được hệ thống sắp xếp từ dễ đến khó theo độ tuổi và tiến độ của bé. Ba mẹ không cần chỉnh — bé được kiểm tra đầu vào để xếp đúng cấp, và tự lên cấp khi làm tốt.</p>
                ${started ? '' : '<p class="muted compact"><i data-lucide="info"></i> Bé chưa bắt đầu học Toán. Sau buổi học Toán đầu tiên, robot sẽ kiểm tra đầu vào và đặt bé vào cấp độ phù hợp.</p>'}
            </section>

            ${levels.length
                ? `<section class="math-roadmap-list">${levels.map(renderLevelCard).join('')}</section>`
                : `<section class="surface"><p class="muted">Lộ trình Toán chưa sẵn sàng. Vui lòng thử lại sau.</p></section>`}
        </main>
    `;
    bindRoot();
    refreshIcons();
}

function renderLevelCard(level) {
    const view = STATUS_VIEW[level.status] || STATUS_VIEW.locked;
    const isCurrent = level.status === 'active';
    const order = Number(level.position ?? 0) + 1;
    const skills = skillsText(level.skills || []);
    return `
        <article class="surface math-level ${isCurrent ? 'is-current' : ''} ${level.status === 'locked' ? 'is-locked' : ''}">
            <div class="section-head compact-head">
                <div>
                    <h2>Cấp ${order}: ${escapeHtml(level.title || '')}</h2>
                    ${skills ? `<p>${escapeHtml(skills)}</p>` : ''}
                </div>
                <span class="status-chip ${view.chip}"><i data-lucide="${view.icon}"></i><span>${view.label}</span></span>
            </div>
            ${isCurrent ? '<p class="eyebrow"><i data-lucide="map-pin"></i> Bé đang ở đây</p>' : ''}
            ${level.description ? `<p class="muted">${escapeHtml(level.description)}</p>` : ''}
        </article>
    `;
}

function bindRoot() {
    document.querySelectorAll('[data-action="back"]').forEach(btn => {
        btn.addEventListener('click', () => navigateTo(paths.child(state.currentChild.user_id)));
    });
}
