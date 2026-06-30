import { api } from '../api.js';
import { navigateTo, paths } from '../navigation.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { buildSelect, escapeHtml, getCheckedValues, refreshBlockedTags, refreshIcons, showToast } from '../utils.js';

// Cấp độ Tiếng Anh: nhãn thân thiện ĐỒNG BỘ với Lộ trình/Báo cáo (Vỡ lòng/Cơ bản/Khá).
// Value giữ beginner/elementary/intermediate vì backend map -> pre_a1/a1/a2 (normalize_learning_level).
const englishLevelOptions = [
    { value: 'auto', label: 'Tự động (theo tuổi)' },
    { value: 'beginner', label: 'Vỡ lòng' },
    { value: 'elementary', label: 'Cơ bản' },
    { value: 'intermediate', label: 'Khá' },
];

const encouragementOptions = [
    { value: 'high', label: 'Khen nhiều' },
    { value: 'medium', label: 'Cân bằng' },
    { value: 'low', label: 'Gọn và thẳng' },
];

const languageRatioOptions = [
    { value: 'vi_primary', label: 'Tiếng Việt là chính' },
    { value: 'en_primary', label: 'Tiếng Anh là chính' },
    { value: 'balanced', label: 'Song ngữ cân bằng' },
];

// Giữ cấu hình đã nạp để khi LƯU vẫn round-trip các trường Toán do hệ thống kiểm soát
// (đã ẩn khỏi UI) — không gửi null ghi đè dữ liệu hiện có của bé.
let loadedConfig = {};

export async function renderConfig(activeSection = 'goals') {
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải cấu hình...</p>`;
    try {
        const config = await api.getTeachingConfig(state.currentChild.user_id);
        loadedConfig = config || {};
        state.blockedTopicsTags = Array.isArray(config.topics_blocked) ? [...config.topics_blocked] : [];

        const studySchedule = config.study_schedule || { days: [], time: '19:00' };
        const scheduleDays = studySchedule.days || [];

        appElement.innerHTML = `
            <main class="page-shell">
                <header class="app-header simple">
                    <div>
                        <p class="eyebrow">${escapeHtml(state.currentChild.full_name)}</p>
                        <h1>Cấu hình robot</h1>
                    </div>
                    <button id="backMenuBtn" class="btn btn-outline btn-inline" data-path="${paths.child(state.currentChild.user_id)}" type="button">
                        <i data-lucide="arrow-left"></i>
                        <span>Trở lại</span>
                    </button>
                </header>

                <section class="surface preset-panel">
                    <div class="section-head">
                        <div>
                            <p class="eyebrow">Preset</p>
                            <h2>Chọn nhanh hướng dạy</h2>
                        </div>
                    </div>
                    <div class="preset-grid">
                        ${presetButton('chat', 'Trò chuyện', 'Không học, robot trò chuyện cùng bé', 'message-circle')}
                        ${presetButton('english_focus', 'Tập trung Tiếng Anh', 'Học Tiếng Anh là chính', 'book-open')}
                        ${presetButton('math_focus', 'Tập trung Toán', 'Luyện Toán nhiều hơn', 'calculator')}
                        ${presetButton('bilingual', 'Song ngữ', 'Cân bằng Việt - Anh', 'languages')}
                    </div>
                </section>

                <form id="configForm" class="config-layout">
                    <section class="surface config-panel">
                        <div class="config-section" data-config-section="goals">
                            <h2>Mục tiêu</h2>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="personality">Tính cách robot</label>
                                    <select id="personality">
                                        <option value="playful" ${config.personality === 'playful' ? 'selected' : ''}>Vui nhộn</option>
                                        <option value="patient" ${config.personality === 'patient' ? 'selected' : ''}>Kiên nhẫn</option>
                                        <option value="strict" ${config.personality === 'strict' ? 'selected' : ''}>Nghiêm túc</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="encouragement_level">Mức khuyến khích</label>
                                    ${buildSelect('encouragement_level', encouragementOptions, config.encouragement_level || 'medium')}
                                </div>
                                <div class="form-group">
                                    <label for="language_ratio">Tỉ lệ ngôn ngữ</label>
                                    ${buildSelect('language_ratio', languageRatioOptions, config.language_ratio || 'vi_primary')}
                                </div>
                                <div class="form-group">
                                    <label for="daily_limit">Số phút mỗi ngày</label>
                                    <input type="number" id="daily_limit" value="${config.daily_limit_minutes || 30}" min="5" max="1000">
                                </div>
                            </div>
                        </div>

                        <div class="config-section" data-config-section="english">
                            <div class="section-head compact-head">
                                <h2>Tiếng Anh</h2>
                                ${toggle('en_enabled', 'Kích hoạt', config.english_enabled !== false)}
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="en_level">Cấp độ</label>
                                    ${buildSelect('en_level', englishLevelOptions, config.english_level || 'auto')}
                                </div>
                            </div>
                            <p class="muted" style="margin:.25rem 0 .6rem;font-size:.85rem;">
                                📚 Bài học &amp; từ vựng Tiếng Anh được chọn ở tab <strong>Lộ trình</strong>.
                            </p>
                            <div class="form-group">
                                <label for="en_instruction">Hướng dẫn riêng</label>
                                <textarea id="en_instruction" rows="3">${escapeHtml(config.english_custom_instructions || '')}</textarea>
                            </div>
                        </div>

                        <div class="config-section" data-config-section="math">
                            <div class="section-head compact-head">
                                <h2>Toán</h2>
                                ${toggle('math_enabled', 'Kích hoạt', config.math_enabled !== false)}
                            </div>
                            <p class="muted" style="margin:.25rem 0 .6rem;font-size:.85rem;">
                                📐 Cấp độ, độ khó &amp; dạng bài Toán do <strong>Lộ trình Toán</strong> (hệ thống) tự điều chỉnh theo tiến độ của bé — xem ở tab <strong>Lộ trình Toán</strong>.
                            </p>
                            <div class="form-group">
                                <label for="math_instruction">Hướng dẫn riêng</label>
                                <textarea id="math_instruction" rows="3">${escapeHtml(config.math_custom_instructions || '')}</textarea>
                            </div>
                        </div>

                        <div class="config-section" data-config-section="safety">
                            <h2>An toàn & thời gian</h2>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Ngày học trong tuần</label>
                                    <div class="checkbox-grid compact-checkbox">
                                        ${dayCheckbox('Mon', 'T2', scheduleDays)}
                                        ${dayCheckbox('Tue', 'T3', scheduleDays)}
                                        ${dayCheckbox('Wed', 'T4', scheduleDays)}
                                        ${dayCheckbox('Thu', 'T5', scheduleDays)}
                                        ${dayCheckbox('Fri', 'T6', scheduleDays)}
                                        ${dayCheckbox('Sat', 'T7', scheduleDays)}
                                        ${dayCheckbox('Sun', 'CN', scheduleDays)}
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="schedule_time">Giờ học chính</label>
                                    <input type="time" id="schedule_time" value="${studySchedule.time || '19:00'}">
                                </div>
                            </div>
                            ${toggle('camera_learning_enabled', 'Học qua máy ảnh khi bé yêu cầu', config.camera_learning_enabled !== false)}
                            <div class="form-group">
                                <label>Chủ đề bị chặn</label>
                                <div class="tag-input-container" id="blockedTagsContainer">
                                    <div class="tags-wrapper" id="tagsWrapper">
                                        ${state.blockedTopicsTags.map(t => `<span class="tag-pill">${escapeHtml(t)}<button type="button" class="tag-remove" data-tag="${escapeHtml(t)}">&times;</button></span>`).join('')}
                                    </div>
                                    <input type="text" id="blockedTopicInput" placeholder="Chủ đề cần chặn" class="tag-text-input">
                                    <button id="addBlockedTopicBtn" class="btn btn-outline btn-inline" type="button">Thêm</button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <aside class="surface preview-panel">
                        <span class="preview-icon"><i data-lucide="bot"></i></span>
                        <p class="eyebrow">Xem trước</p>
                        <h2>Robot sẽ dạy như thế nào</h2>
                        <div id="robotPreview" class="preview-copy"></div>
                        <button type="submit" class="btn btn-primary" id="saveConfigBtn">
                            <i data-lucide="save"></i>
                            <span>Lưu cấu hình</span>
                        </button>
                    </aside>
                </form>
            </main>
        `;

        bindConfigEvents();
        requestAnimationFrame(() => scrollToConfigSection(activeSection));
        updatePreview();
        refreshIcons();
    } catch (error) {
        appElement.innerHTML = `
            <main class="page-shell narrow">
                <div class="surface error-panel">
                    <h2>Không tải được cấu hình</h2>
                    <p>${escapeHtml(error.message)}</p>
                    <button id="backMenuBtn" class="btn btn-primary" data-path="${paths.child(state.currentChild.user_id)}" type="button">
                        <i data-lucide="arrow-left"></i>
                        <span>Quay lại</span>
                    </button>
                </div>
            </main>
        `;
        document.getElementById('backMenuBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
        refreshIcons();
    }
}

function bindConfigEvents() {
    document.getElementById('backMenuBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));

    document.querySelectorAll('.preset-button').forEach(button => {
        button.addEventListener('click', () => {
            const beforePreset = captureConfigSnapshot();
            applyPreset(button.getAttribute('data-preset'));
            highlightPresetChanges(beforePreset);
            updatePreview();
            showToast(`Đã áp dụng preset ${button.querySelector('strong').innerText}`);
        });
    });

    document.getElementById('addBlockedTopicBtn').addEventListener('click', addBlockedTag);
    document.getElementById('blockedTopicInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addBlockedTag();
        }
    });
    document.getElementById('tagsWrapper').addEventListener('click', (event) => {
        if (event.target.classList.contains('tag-remove')) {
            const tag = event.target.getAttribute('data-tag');
            state.blockedTopicsTags = state.blockedTopicsTags.filter(item => item !== tag);
            refreshBlockedTags();
            updatePreview();
        }
    });

    document.getElementById('configForm').addEventListener('input', (event) => {
        clearFieldHighlight(event.target);
        updatePreview();
    });
    document.getElementById('configForm').addEventListener('change', (event) => {
        clearFieldHighlight(event.target);
        updatePreview();
    });
    document.getElementById('configForm').addEventListener('submit', saveConfig);
}

function scrollToConfigSection(section) {
    document.querySelector(`[data-config-section="${section}"]`)?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
    });
}

function applyPreset(preset) {
    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };
    const check = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.checked = value;
    };

    if (preset === 'chat') {
        // Không học — robot làm bạn trò chuyện, chủ động hỏi bé (tắt cả 2 môn).
        check('en_enabled', false);
        check('math_enabled', false);
        set('personality', 'playful');
        set('encouragement_level', 'high');
        set('language_ratio', 'vi_primary');
    }
    if (preset === 'english_focus') {
        check('en_enabled', true);
        set('language_ratio', 'en_primary');
        set('personality', 'playful');
    }
    if (preset === 'math_focus') {
        // Nội dung Toán do Lộ trình Toán quyết định -> preset chỉ bật môn + ngôn ngữ chính.
        check('math_enabled', true);
        set('language_ratio', 'vi_primary');
    }
    if (preset === 'bilingual') {
        set('language_ratio', 'balanced');
        check('en_enabled', true);
        check('math_enabled', true);
        set('personality', 'playful');
    }
}

async function saveConfig(event) {
    event.preventDefault();
    const button = document.getElementById('saveConfigBtn');
    button.innerHTML = '<i data-lucide="loader-circle"></i><span>Đang lưu...</span>';
    button.disabled = true;
    refreshIcons();

    const updatedConfig = {
        personality: document.getElementById('personality').value,
        daily_limit_minutes: parseInt(document.getElementById('daily_limit').value, 10) || 30,
        study_schedule: {
            days: getCheckedValues('schedule_days'),
            time: document.getElementById('schedule_time').value,
        },
        english_enabled: document.getElementById('en_enabled').checked,
        english_level: document.getElementById('en_level').value,
        english_custom_instructions: document.getElementById('en_instruction').value,
        math_enabled: document.getElementById('math_enabled').checked,
        // Cấp độ / độ khó / phép tính Toán do Lộ trình Toán (hệ thống) quyết định — đã ẩn
        // khỏi UI. Round-trip giá trị cũ để KHÔNG ghi đè null lên dữ liệu hiện có của bé.
        math_level: loadedConfig.math_level || 'auto',
        math_operations: Array.isArray(loadedConfig.math_operations) ? loadedConfig.math_operations : [],
        math_difficulty: loadedConfig.math_difficulty || 'medium',
        math_word_problems: loadedConfig.math_word_problems !== false,
        math_custom_instructions: document.getElementById('math_instruction').value,
        encouragement_level: document.getElementById('encouragement_level').value,
        language_ratio: document.getElementById('language_ratio').value,
        topics_blocked: state.blockedTopicsTags,
        camera_learning_enabled: document.getElementById('camera_learning_enabled').checked,
    };

    try {
        await api.updateTeachingConfig(state.currentChild.user_id, updatedConfig);
        state.overviewCache[state.currentChild.user_id] = null;
        showToast('Đã lưu cấu hình');
        navigateTo(paths.child(state.currentChild.user_id), { replace: true });
    } catch (error) {
        showToast(error.message, 'error');
        button.innerHTML = '<i data-lucide="save"></i><span>Lưu cấu hình</span>';
        button.disabled = false;
        refreshIcons();
    }
}

function updatePreview() {
    const preview = document.getElementById('robotPreview');
    if (!preview) return;
    const language = selectText('language_ratio');
    const personality = selectText('personality');
    const encouragement = selectText('encouragement_level');
    const minutes = document.getElementById('daily_limit')?.value || 30;
    const english = document.getElementById('en_enabled')?.checked ? `Tiếng Anh level ${selectText('en_level')}` : 'Tiếng Anh đang tắt';
    const math = document.getElementById('math_enabled')?.checked ? 'Toán theo Lộ trình hệ thống' : 'Toán đang tắt';
    const camera = document.getElementById('camera_learning_enabled')?.checked
        ? 'Máy ảnh chỉ được dùng khi bé chủ động yêu cầu.'
        : 'Robot sẽ bỏ qua các bài học qua máy ảnh.';

    preview.innerHTML = `
        <p>${escapeHtml(personality)}, ${escapeHtml(encouragement.toLowerCase())}, ${escapeHtml(language.toLowerCase())}.</p>
        <p>${escapeHtml(english)}. ${escapeHtml(math)}.</p>
        <p>Mỗi ngày tối đa ${escapeHtml(minutes)} phút. ${escapeHtml(camera)}</p>
    `;
}

function addBlockedTag() {
    const input = document.getElementById('blockedTopicInput');
    const value = input.value.trim();
    if (value && !state.blockedTopicsTags.includes(value)) {
        state.blockedTopicsTags.push(value);
        refreshBlockedTags();
        updatePreview();
    }
    input.value = '';
}

function captureConfigSnapshot() {
    const snapshot = new Map();
    document.querySelectorAll('#configForm input, #configForm select, #configForm textarea').forEach(element => {
        snapshot.set(element, fieldValue(element));
    });
    return snapshot;
}

function highlightPresetChanges(beforePreset) {
    clearPresetHighlights();
    beforePreset.forEach((previousValue, element) => {
        if (fieldValue(element) !== previousValue) {
            fieldHighlightTarget(element)?.classList.add('field-changed');
        }
    });
}

function clearPresetHighlights() {
    document.querySelectorAll('.field-changed').forEach(element => {
        element.classList.remove('field-changed');
    });
}

function clearFieldHighlight(element) {
    fieldHighlightTarget(element)?.classList.remove('field-changed');
}

function fieldHighlightTarget(element) {
    return element?.closest('.checkbox-pill, .toggle-label, .form-group');
}

function fieldValue(element) {
    if (element.type === 'checkbox') return element.checked ? 'checked' : 'unchecked';
    return element.value;
}

function selectText(id) {
    const element = document.getElementById(id);
    if (!element) return '';
    return element.options?.[element.selectedIndex]?.text || element.value;
}

function presetButton(preset, title, subtitle, icon) {
    return `
        <button type="button" class="preset-button" data-preset="${preset}">
            <span class="preset-icon"><i data-lucide="${escapeHtml(icon)}"></i></span>
            <span>
                <strong>${escapeHtml(title)}</strong>
                <small>${escapeHtml(subtitle)}</small>
            </span>
        </button>
    `;
}

function toggle(id, label, checked) {
    return `
        <label class="toggle-label">
            <span>${escapeHtml(label)}</span>
            <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
        </label>
    `;
}

function dayCheckbox(value, label, selectedDays) {
    return `<label class="checkbox-pill"><input type="checkbox" name="schedule_days" value="${value}" ${selectedDays.includes(value) ? 'checked' : ''}><span>${label}</span></label>`;
}
