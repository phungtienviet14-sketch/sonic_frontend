import { api } from '../api.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { renderChildMenu } from './childMenu.js';
import { buildCheckboxGroup, buildSelect, escapeHtml, getCheckedValues, refreshBlockedTags, showToast } from '../utils.js';

const englishLevelOptions = [
    { value: 'auto', label: 'Tự động' },
    { value: 'beginner', label: 'Mới bắt đầu' },
    { value: 'elementary', label: 'Sơ cấp' },
    { value: 'intermediate', label: 'Trung cấp' },
];

const levelOptions = englishLevelOptions;

const englishTopicOptions = [
    { value: 'animals', label: 'Động vật' },
    { value: 'colors', label: 'Màu sắc' },
    { value: 'fruits', label: 'Trái cây' },
    { value: 'family', label: 'Gia đình' },
    { value: 'body', label: 'Cơ thể' },
    { value: 'school', label: 'Trường học' },
    { value: 'weather', label: 'Thời tiết' },
    { value: 'food', label: 'Thức ăn' },
    { value: 'transport', label: 'Phương tiện' },
    { value: 'clothing', label: 'Quần áo' },
];

const englishMethodOptions = [
    { value: 'vocabulary', label: 'Từ vựng' },
    { value: 'game', label: 'Trò chơi' },
    { value: 'story', label: 'Câu chuyện' },
    { value: 'song', label: 'Bài hát' },
    { value: 'conversation', label: 'Hội thoại' },
];

const difficultyOptions = [
    { value: 'easy', label: 'Dễ' },
    { value: 'medium', label: 'Trung bình' },
    { value: 'hard', label: 'Khó' },
];

const mathOperationOptions = [
    { value: 'add', label: 'Cộng' },
    { value: 'subtract', label: 'Trừ' },
    { value: 'multiply', label: 'Nhân' },
    { value: 'divide', label: 'Chia' },
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

export async function renderConfig(activeSection = 'goals') {
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải cấu hình...</p>`;
    try {
        const config = await api.getTeachingConfig(state.currentChild.user_id);
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
                    <button id="backMenuBtn" class="btn btn-outline btn-inline" type="button">Trở lại</button>
                </header>

                <section class="surface preset-panel">
                    <div class="section-head">
                        <div>
                            <p class="eyebrow">Preset</p>
                            <h2>Chọn nhanh hướng dạy</h2>
                        </div>
                    </div>
                    <div class="preset-grid">
                        ${presetButton('gentle', 'Nhẹ nhàng', 'Ít áp lực, khen nhiều')}
                        ${presetButton('review_words', 'Ôn từ yếu', 'Ưu tiên word bank')}
                        ${presetButton('math_focus', 'Tập trung Toán', 'Luyện lỗi lặp lại')}
                        ${presetButton('bilingual', 'Song ngữ', 'Cân bằng Việt - Anh')}
                    </div>
                </section>

                <form id="configForm" class="config-layout">
                    <nav class="config-tabs" aria-label="Cấu hình robot">
                        ${sectionButton('goals', 'Mục tiêu', activeSection)}
                        ${sectionButton('english', 'Tiếng Anh', activeSection)}
                        ${sectionButton('math', 'Toán', activeSection)}
                        ${sectionButton('safety', 'An toàn & thời gian', activeSection)}
                    </nav>

                    <section class="surface config-panel">
                        <div class="config-section ${activeSection === 'goals' ? 'active' : ''}" data-config-section="goals">
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
                                    <input type="number" id="daily_limit" value="${config.daily_limit_minutes || 30}" min="5" max="1440">
                                </div>
                            </div>
                        </div>

                        <div class="config-section ${activeSection === 'english' ? 'active' : ''}" data-config-section="english">
                            <div class="section-head compact-head">
                                <h2>Tiếng Anh</h2>
                                ${toggle('en_enabled', 'Kích hoạt', config.english_enabled !== false)}
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="en_level">Cấp độ</label>
                                    ${buildSelect('en_level', englishLevelOptions, config.english_level || 'auto')}
                                </div>
                                <div class="form-group">
                                    <label for="en_difficulty">Độ khó</label>
                                    ${buildSelect('en_difficulty', difficultyOptions, config.english_difficulty || 'medium')}
                                </div>
                                <div class="form-group">
                                    <label for="en_words_per_session">Số từ mỗi buổi</label>
                                    <input type="number" id="en_words_per_session" value="${config.english_words_per_session ?? 5}" min="1" max="20">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Chủ đề</label>
                                ${buildCheckboxGroup('en_topics', englishTopicOptions, config.english_topics || [])}
                            </div>
                            <div class="form-group">
                                <label>Phương pháp</label>
                                ${buildCheckboxGroup('en_methods', englishMethodOptions, config.english_methods || [])}
                            </div>
                            <div class="form-group">
                                <label for="en_instruction">Hướng dẫn riêng</label>
                                <textarea id="en_instruction" rows="3">${escapeHtml(config.english_custom_instructions || '')}</textarea>
                            </div>
                        </div>

                        <div class="config-section ${activeSection === 'math' ? 'active' : ''}" data-config-section="math">
                            <div class="section-head compact-head">
                                <h2>Toán</h2>
                                ${toggle('math_enabled', 'Kích hoạt', config.math_enabled !== false)}
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="math_level">Cấp độ</label>
                                    ${buildSelect('math_level', levelOptions, config.math_level || 'auto')}
                                </div>
                                <div class="form-group">
                                    <label for="math_difficulty">Độ khó</label>
                                    ${buildSelect('math_difficulty', difficultyOptions, config.math_difficulty || 'medium')}
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Phép tính</label>
                                ${buildCheckboxGroup('math_ops', mathOperationOptions, config.math_operations || [])}
                            </div>
                            ${toggle('math_word_problems', 'Bài toán có lời', config.math_word_problems !== false)}
                            <div class="form-group">
                                <label for="math_instruction">Hướng dẫn riêng</label>
                                <textarea id="math_instruction" rows="3">${escapeHtml(config.math_custom_instructions || '')}</textarea>
                            </div>
                        </div>

                        <div class="config-section ${activeSection === 'safety' ? 'active' : ''}" data-config-section="safety">
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
                            ${toggle('camera_learning_enabled', 'Học qua camera khi bé yêu cầu', config.camera_learning_enabled !== false)}
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
                        <p class="eyebrow">Preview</p>
                        <h2>Robot sẽ dạy như thế nào</h2>
                        <div id="robotPreview" class="preview-copy"></div>
                        <button type="submit" class="btn btn-primary" id="saveConfigBtn">Lưu cấu hình</button>
                    </aside>
                </form>
            </main>
        `;

        bindConfigEvents();
        switchConfigSection(activeSection);
        updatePreview();
    } catch (error) {
        appElement.innerHTML = `
            <main class="page-shell narrow">
                <div class="surface error-panel">
                    <h2>Không tải được cấu hình</h2>
                    <p>${escapeHtml(error.message)}</p>
                    <button id="backMenuBtn" class="btn btn-primary" type="button">Quay lại</button>
                </div>
            </main>
        `;
        document.getElementById('backMenuBtn').addEventListener('click', () => renderChildMenu('overview'));
    }
}

function bindConfigEvents() {
    document.getElementById('backMenuBtn').addEventListener('click', () => renderChildMenu('overview'));

    document.querySelectorAll('[data-config-tab]').forEach(button => {
        button.addEventListener('click', () => switchConfigSection(button.getAttribute('data-config-tab')));
    });

    document.querySelectorAll('.preset-button').forEach(button => {
        button.addEventListener('click', () => {
            applyPreset(button.getAttribute('data-preset'));
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

    document.getElementById('configForm').addEventListener('input', updatePreview);
    document.getElementById('configForm').addEventListener('change', updatePreview);
    document.getElementById('configForm').addEventListener('submit', saveConfig);
}

function switchConfigSection(section) {
    document.querySelectorAll('[data-config-section]').forEach(panel => {
        panel.classList.toggle('active', panel.getAttribute('data-config-section') === section);
    });
    document.querySelectorAll('[data-config-tab]').forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-config-tab') === section);
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

    if (preset === 'gentle') {
        set('personality', 'patient');
        set('encouragement_level', 'high');
        set('daily_limit', 20);
        set('en_difficulty', 'easy');
        set('math_difficulty', 'easy');
        check('camera_learning_enabled', true);
    }
    if (preset === 'review_words') {
        check('en_enabled', true);
        set('en_words_per_session', 8);
        set('en_difficulty', 'medium');
        setCheckedGroup('en_methods', ['vocabulary', 'conversation', 'game']);
        set('encouragement_level', 'high');
    }
    if (preset === 'math_focus') {
        check('math_enabled', true);
        set('math_difficulty', 'medium');
        setCheckedGroup('math_ops', ['add', 'subtract']);
        check('math_word_problems', true);
        set('daily_limit', 35);
    }
    if (preset === 'bilingual') {
        set('language_ratio', 'balanced');
        check('en_enabled', true);
        check('math_enabled', true);
        setCheckedGroup('en_methods', ['story', 'conversation', 'vocabulary']);
        set('personality', 'playful');
    }
}

async function saveConfig(event) {
    event.preventDefault();
    const button = document.getElementById('saveConfigBtn');
    button.innerText = 'Đang lưu...';
    button.disabled = true;

    const updatedConfig = {
        personality: document.getElementById('personality').value,
        daily_limit_minutes: parseInt(document.getElementById('daily_limit').value, 10) || 30,
        study_schedule: {
            days: getCheckedValues('schedule_days'),
            time: document.getElementById('schedule_time').value,
        },
        english_enabled: document.getElementById('en_enabled').checked,
        english_level: document.getElementById('en_level').value,
        english_topics: getCheckedValues('en_topics'),
        english_methods: getCheckedValues('en_methods'),
        english_words_per_session: parseInt(document.getElementById('en_words_per_session').value, 10) || 5,
        english_difficulty: document.getElementById('en_difficulty').value,
        english_custom_instructions: document.getElementById('en_instruction').value,
        math_enabled: document.getElementById('math_enabled').checked,
        math_level: document.getElementById('math_level').value,
        math_operations: getCheckedValues('math_ops'),
        math_difficulty: document.getElementById('math_difficulty').value,
        math_word_problems: document.getElementById('math_word_problems').checked,
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
        renderChildMenu('overview');
    } catch (error) {
        showToast(error.message, 'error');
        button.innerText = 'Lưu cấu hình';
        button.disabled = false;
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
    const math = document.getElementById('math_enabled')?.checked ? `Toán level ${selectText('math_level')}` : 'Toán đang tắt';
    const camera = document.getElementById('camera_learning_enabled')?.checked
        ? 'Camera chỉ dùng khi bé chủ động yêu cầu.'
        : 'Robot sẽ bỏ qua các bài học qua camera.';

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

function setCheckedGroup(name, values) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => {
        input.checked = values.includes(input.value);
    });
}

function selectText(id) {
    const element = document.getElementById(id);
    if (!element) return '';
    return element.options?.[element.selectedIndex]?.text || element.value;
}

function presetButton(preset, title, subtitle) {
    return `
        <button type="button" class="preset-button" data-preset="${preset}">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(subtitle)}</span>
        </button>
    `;
}

function sectionButton(section, label, activeSection) {
    return `<button class="tab-button ${section === activeSection ? 'active' : ''}" data-config-tab="${section}" type="button">${escapeHtml(label)}</button>`;
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
