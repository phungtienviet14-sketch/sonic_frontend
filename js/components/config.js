import { api } from '../api.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { renderChildMenu } from './childMenu.js';
import { buildCheckboxGroup, buildSelect, getCheckedValues, refreshBlockedTags } from '../utils.js';

export async function renderConfig() {
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải cấu hình...</p>`;
    try {
        const config = await api.getTeachingConfig(state.currentChild.user_id);

        // Khởi tạo state cho blocked topics
        state.blockedTopicsTags = Array.isArray(config.topics_blocked) ? [...config.topics_blocked] : [];

        // --- Dữ liệu dropdown & checkbox ---
        const englishLevelOptions = [
            { value: 'auto', label: 'Tự động' },
            { value: 'beginner', label: 'Mới bắt đầu' },
            { value: 'elementary', label: 'Sơ cấp' },
            { value: 'intermediate', label: 'Trung cấp' }
        ];
        const englishTopicOptions = [
            { value: 'animals', label: '🐾 Động vật' },
            { value: 'colors', label: '🎨 Màu sắc' },
            { value: 'fruits', label: '🍎 Trái cây' },
            { value: 'family', label: '👨‍👩‍👧 Gia đình' },
            { value: 'body', label: '🦵 Cơ thể' },
            { value: 'school', label: '🏫 Trường học' },
            { value: 'weather', label: '🌤️ Thời tiết' },
            { value: 'food', label: '🍕 Thức ăn' },
            { value: 'transport', label: '🚗 Phương tiện' },
            { value: 'clothing', label: '👕 Quần áo' }
        ];
        const englishMethodOptions = [
            { value: 'vocabulary', label: '📖 Từ vựng' },
            { value: 'game', label: '🎮 Trò chơi' },
            { value: 'story', label: '📚 Câu chuyện' },
            { value: 'song', label: '🎵 Bài hát' },
            { value: 'conversation', label: '💬 Hội thoại' }
        ];
        const difficultyOptions = [
            { value: 'easy', label: 'Dễ' },
            { value: 'medium', label: 'Trung bình' },
            { value: 'hard', label: 'Khó' }
        ];
        const mathLevelOptions = [
            { value: 'auto', label: 'Tự động' },
            { value: 'grade1', label: 'Lớp 1' },
            { value: 'grade2', label: 'Lớp 2' },
            { value: 'grade3', label: 'Lớp 3' }
        ];
        const mathOperationOptions = [
            { value: 'add', label: '➕ Cộng' },
            { value: 'subtract', label: '➖ Trừ' },
            { value: 'multiply', label: '✖️ Nhân' },
            { value: 'divide', label: '➗ Chia' }
        ];
        const encouragementOptions = [
            { value: 'high', label: 'Khen nhiều' },
            { value: 'medium', label: 'Cân bằng' },
            { value: 'low', label: 'Thực dụng' }
        ];
        const languageRatioOptions = [
            { value: 'vi_primary', label: 'Tiếng Việt là chính' },
            { value: 'en_primary', label: 'Tiếng Anh là chính' },
            { value: 'balanced', label: 'Cân bằng' }
        ];

        // Lịch học hiện tại
        const studySchedule = config.study_schedule || { days: [], time: "19:00" };
        const scheduleDays = studySchedule.days || [];
        const scheduleTime = studySchedule.time || "19:00";

        // Giá trị hiện tại từ config
        const enTopics = config.english_topics || [];
        const enMethods = config.english_methods || [];
        const mathOps = config.math_operations || [];

        // Render blocked topics tags
        const blockedTagsHTML = state.blockedTopicsTags.map(t => `<span class="tag-pill">${t}<button type="button" class="tag-remove" data-tag="${t}">&times;</button></span>`).join('');

        appElement.innerHTML = `
            <div class="flex-between mb-2">
                <h2>Cấu Hình AI</h2>
                <button id="backMenuBtn" class="btn btn-outline" style="padding: 6px 12px; width: auto; font-size: 0.8em; border-radius: 8px;">Trở lại</button>
            </div>

            <!-- Gói Giáo Trình Mẫu -->
            <div class="glass-panel mb-2">
                <h3 style="margin-bottom: 10px;">📦 Gói Giáo Trình Mẫu</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                    <div class="preset-card" data-preset="mam_non" style="padding: 10px; background: rgba(255,255,255,0.4); border-radius: 8px; cursor: pointer; text-align: center; border: 1px solid rgba(255,255,255,0.6);">
                        <div style="font-size: 24px;">🐣</div>
                        <strong>Mầm non</strong>
                        <div style="font-size: 0.8em; color: var(--text-light)">Dễ, vui nhộn</div>
                    </div>
                    <div class="preset-card" data-preset="tieu_chuan" style="padding: 10px; background: rgba(255,255,255,0.4); border-radius: 8px; cursor: pointer; text-align: center; border: 1px solid rgba(255,255,255,0.6);">
                        <div style="font-size: 24px;">⚖️</div>
                        <strong>Tiêu chuẩn</strong>
                        <div style="font-size: 0.8em; color: var(--text-light)">Cân bằng</div>
                    </div>
                    <div class="preset-card" data-preset="nang_cao" style="padding: 10px; background: rgba(255,255,255,0.4); border-radius: 8px; cursor: pointer; text-align: center; border: 1px solid rgba(255,255,255,0.6);">
                        <div style="font-size: 24px;">🚀</div>
                        <strong>Nâng cao</strong>
                        <div style="font-size: 0.8em; color: var(--text-light)">Nghiêm túc, Khó</div>
                    </div>
                </div>
            </div>

            <form id="configForm">

                <!-- ===== TÍNH CÁCH & THỜI GIAN ===== -->
                <div class="glass-panel">
                    <h3>🤖 Tính cách Robot</h3>
                    <div class="form-group">
                        <select id="personality">
                            <option value="playful" ${config.personality==='playful'?'selected':''}>Vui nhộn, thân thiện</option>
                            <option value="patient" ${config.personality==='patient'?'selected':''}>Kiên nhẫn, nhẹ nhàng</option>
                            <option value="strict" ${config.personality==='strict'?'selected':''}>Nghiêm khắc, học thuật</option>
                        </select>
                    </div>
                    
                    <div class="section-divider"></div>

                    <h3>⏱️ Giới hạn thời gian</h3>
                    <div class="form-group">
                        <label for="daily_limit">Số phút/ngày</label>
                        <input type="number" id="daily_limit" value="${config.daily_limit_minutes || 30}" placeholder="Phút/ngày" min="5" max="120">
                    </div>

                    <div class="section-divider"></div>

                    <h3>📅 Lịch học chủ động</h3>
                    <div class="form-group">
                        <label>Chọn ngày học trong tuần</label>
                        <div class="checkbox-grid">
                            <label class="checkbox-pill"><input type="checkbox" name="schedule_days" value="Mon" ${scheduleDays.includes('Mon')?'checked':''}><span>T2</span></label>
                            <label class="checkbox-pill"><input type="checkbox" name="schedule_days" value="Tue" ${scheduleDays.includes('Tue')?'checked':''}><span>T3</span></label>
                            <label class="checkbox-pill"><input type="checkbox" name="schedule_days" value="Wed" ${scheduleDays.includes('Wed')?'checked':''}><span>T4</span></label>
                            <label class="checkbox-pill"><input type="checkbox" name="schedule_days" value="Thu" ${scheduleDays.includes('Thu')?'checked':''}><span>T5</span></label>
                            <label class="checkbox-pill"><input type="checkbox" name="schedule_days" value="Fri" ${scheduleDays.includes('Fri')?'checked':''}><span>T6</span></label>
                            <label class="checkbox-pill"><input type="checkbox" name="schedule_days" value="Sat" ${scheduleDays.includes('Sat')?'checked':''}><span>T7</span></label>
                            <label class="checkbox-pill"><input type="checkbox" name="schedule_days" value="Sun" ${scheduleDays.includes('Sun')?'checked':''}><span>CN</span></label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="schedule_time">Giờ nhắc nhở</label>
                        <input type="time" id="schedule_time" value="${scheduleTime}">
                    </div>
                </div>

                <!-- ===== MÔN TIẾNG ANH ===== -->
                <div class="glass-panel">
                    <h3>🇬🇧 Môn Tiếng Anh</h3>
                    <label class="toggle-label">
                        Kích hoạt Tiếng Anh
                        <input type="checkbox" id="en_enabled" ${config.english_enabled ? 'checked' : ''}>
                    </label>

                    <div class="section-divider"></div>

                    <div class="form-group">
                        <label>Cấp độ</label>
                        ${buildSelect('en_level', englishLevelOptions, config.english_level || 'auto')}
                    </div>

                    <div class="form-group">
                        <label>Chủ đề học</label>
                        ${buildCheckboxGroup('en_topics', englishTopicOptions, enTopics)}
                    </div>

                    <div class="form-group">
                        <label>Phương pháp dạy</label>
                        ${buildCheckboxGroup('en_methods', englishMethodOptions, enMethods)}
                    </div>

                    <div class="form-group">
                        <label for="en_words_per_session">Số từ mỗi buổi học</label>
                        <input type="number" id="en_words_per_session" value="${config.english_words_per_session ?? 5}" min="1" max="20">
                    </div>

                    <div class="form-group">
                        <label>Độ khó</label>
                        ${buildSelect('en_difficulty', difficultyOptions, config.english_difficulty || 'medium')}
                    </div>

                    <div class="section-divider"></div>

                    <div class="form-group">
                        <label for="en_instruction">Hướng dẫn riêng cho môn Tiếng Anh</label>
                        <textarea id="en_instruction" rows="2" placeholder="VD: Hãy khen bé nhiều hơn...">${config.english_custom_instructions || ''}</textarea>
                    </div>
                </div>

                <!-- ===== MÔN TOÁN HỌC ===== -->
                <div class="glass-panel">
                    <h3>🔢 Môn Toán Học</h3>
                    <label class="toggle-label">
                        Kích hoạt Toán
                        <input type="checkbox" id="math_enabled" ${config.math_enabled ? 'checked' : ''}>
                    </label>

                    <div class="section-divider"></div>

                    <div class="form-group">
                        <label>Cấp độ</label>
                        ${buildSelect('math_level', mathLevelOptions, config.math_level || 'auto')}
                    </div>

                    <div class="form-group">
                        <label>Phép tính</label>
                        ${buildCheckboxGroup('math_ops', mathOperationOptions, mathOps)}
                    </div>

                    <div class="form-group">
                        <label>Độ khó</label>
                        ${buildSelect('math_difficulty', difficultyOptions, config.math_difficulty || 'medium')}
                    </div>

                    <label class="toggle-label">
                        Bài toán có lời
                        <input type="checkbox" id="math_word_problems" ${config.math_word_problems ? 'checked' : ''}>
                    </label>

                    <div class="section-divider"></div>

                    <div class="form-group">
                        <label for="math_instruction">Hướng dẫn riêng cho môn Toán</label>
                        <textarea id="math_instruction" rows="2" placeholder="VD: Ra đề về siêu nhân">${config.math_custom_instructions || ''}</textarea>
                    </div>
                </div>

                <!-- ===== CÀI ĐẶT CHUNG ===== -->
                <div class="glass-panel">
                    <h3>🎯 Cài Đặt Chung</h3>

                    <div class="form-group">
                        <label>Mức độ khuyến khích</label>
                        ${buildSelect('encouragement_level', encouragementOptions, config.encouragement_level || 'medium')}
                    </div>

                    <div class="form-group">
                        <label>Tỉ lệ ngôn ngữ</label>
                        ${buildSelect('language_ratio', languageRatioOptions, config.language_ratio || 'vi_primary')}
                    </div>

                    <div class="section-divider"></div>

                    <div class="form-group">
                        <label>Chủ đề bị chặn</label>
                        <div class="tag-input-container" id="blockedTagsContainer">
                            <div class="tags-wrapper" id="tagsWrapper">
                                ${blockedTagsHTML}
                            </div>
                            <input type="text" id="blockedTopicInput" placeholder="Nhập chủ đề rồi nhấn Enter..." class="tag-text-input">
                        </div>
                        <p style="font-size: 0.8em; color: var(--text-light); margin-top: 6px;">Nhấn Enter để thêm. Nhấn × để xoá.</p>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary mb-2" id="saveConfigBtn">💾 Lưu Cấu Hình</button>
            </form>
        `;

        // --- Event Listeners ---

        // Nút trở lại
        document.getElementById('backMenuBtn').addEventListener('click', renderChildMenu);

        // Preset cards
        document.querySelectorAll('.preset-card').forEach(card => {
            card.addEventListener('click', () => {
                const preset = card.getAttribute('data-preset');
                if (preset === 'mam_non') {
                    document.getElementById('personality').value = 'playful';
                    document.getElementById('en_level').value = 'beginner';
                    document.getElementById('en_difficulty').value = 'easy';
                    document.getElementById('math_level').value = 'grade1';
                    document.getElementById('math_difficulty').value = 'easy';
                    document.getElementById('math_word_problems').checked = false;
                    document.getElementById('encouragement_level').value = 'high';
                    document.getElementById('language_ratio').value = 'vi_primary';
                    document.getElementById('en_instruction').value = 'Hãy kết hợp kể chuyện và trò chơi, khen bé thật nhiều';
                } else if (preset === 'tieu_chuan') {
                    document.getElementById('personality').value = 'patient';
                    document.getElementById('en_level').value = 'elementary';
                    document.getElementById('en_difficulty').value = 'medium';
                    document.getElementById('math_level').value = 'grade2';
                    document.getElementById('math_difficulty').value = 'medium';
                    document.getElementById('math_word_problems').checked = true;
                    document.getElementById('encouragement_level').value = 'medium';
                    document.getElementById('language_ratio').value = 'balanced';
                    document.getElementById('en_instruction').value = '';
                } else if (preset === 'nang_cao') {
                    document.getElementById('personality').value = 'strict';
                    document.getElementById('en_level').value = 'intermediate';
                    document.getElementById('en_difficulty').value = 'hard';
                    document.getElementById('math_level').value = 'grade3';
                    document.getElementById('math_difficulty').value = 'hard';
                    document.getElementById('math_word_problems').checked = true;
                    document.getElementById('encouragement_level').value = 'low';
                    document.getElementById('language_ratio').value = 'en_primary';
                    document.getElementById('en_instruction').value = 'Chỉ dùng tiếng Anh khi giảng bài Tiếng Anh';
                }
                alert(`Đã áp dụng mẫu: ${card.querySelector('strong').innerText}. Bạn hãy bấm "Lưu cấu hình" ở dưới cùng nhé.`);
            });
        });

        // Tag input cho topics_blocked
        const tagInput = document.getElementById('blockedTopicInput');
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = tagInput.value.trim();
                if (val && !state.blockedTopicsTags.includes(val)) {
                    state.blockedTopicsTags.push(val);
                    refreshBlockedTags();
                }
                tagInput.value = '';
            }
        });

        // Delegate click cho nút xoá tag
        document.getElementById('tagsWrapper').addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-remove')) {
                const tag = e.target.getAttribute('data-tag');
                state.blockedTopicsTags = state.blockedTopicsTags.filter(t => t !== tag);
                refreshBlockedTags();
            }
        });

        // Submit form
        document.getElementById('configForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('saveConfigBtn');
            btn.innerText = 'Đang lưu...';
            btn.disabled = true;

            // Thu thập checkbox groups
            const getCheckedValues = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);

            const updatedConfig = {
                // Tính cách & thời gian
                personality: document.getElementById('personality').value,
                daily_limit_minutes: parseInt(document.getElementById('daily_limit').value) || 30,
                study_schedule: {
                    days: getCheckedValues('schedule_days'),
                    time: document.getElementById('schedule_time').value
                },

                // Tiếng Anh
                english_enabled: document.getElementById('en_enabled').checked,
                english_level: document.getElementById('en_level').value,
                english_topics: getCheckedValues('en_topics'),
                english_methods: getCheckedValues('en_methods'),
                english_words_per_session: parseInt(document.getElementById('en_words_per_session').value) || 5,
                english_difficulty: document.getElementById('en_difficulty').value,
                english_custom_instructions: document.getElementById('en_instruction').value,

                // Toán
                math_enabled: document.getElementById('math_enabled').checked,
                math_level: document.getElementById('math_level').value,
                math_operations: getCheckedValues('math_ops'),
                math_difficulty: document.getElementById('math_difficulty').value,
                math_word_problems: document.getElementById('math_word_problems').checked,
                math_custom_instructions: document.getElementById('math_instruction').value,

                // Cài đặt chung
                encouragement_level: document.getElementById('encouragement_level').value,
                language_ratio: document.getElementById('language_ratio').value,
                topics_blocked: state.blockedTopicsTags
            };

            try {
                await api.updateTeachingConfig(state.currentChild.user_id, updatedConfig);
                alert('Đã lưu cấu hình thành công!');
                renderChildMenu();
            } catch (error) {
                alert('Lỗi: ' + error.message);
                btn.innerText = '💾 Lưu Cấu Hình';
                btn.disabled = false;
            }
        });

    } catch (error) {
        appElement.innerHTML = `<p class="text-center" style="color: var(--danger)">Lỗi: ${error.message}</p><button id="backMenuBtn" class="btn btn-primary">Quay lại</button>`;
        document.getElementById('backMenuBtn').addEventListener('click', renderChildMenu);
    }
}
