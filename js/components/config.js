import { api } from '../api.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { renderChildMenu } from './childMenu.js';
import { buildCheckboxGroup, buildSelect, getCheckedValues, refreshBlockedTags, showToast } from '../utils.js';

export async function renderConfig() {
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Äang táº£i cáº¥u hÃ¬nh...</p>`;
    try {
        const config = await api.getTeachingConfig(state.currentChild.user_id);

        // Khá»Ÿi táº¡o state cho blocked topics
        state.blockedTopicsTags = Array.isArray(config.topics_blocked) ? [...config.topics_blocked] : [];

        // --- Dá»¯ liá»‡u dropdown & checkbox ---
        const englishLevelOptions = [
            { value: 'auto', label: 'Tá»± Ä‘á»™ng' },
            { value: 'beginner', label: 'Má»›i báº¯t Ä‘áº§u' },
            { value: 'elementary', label: 'SÆ¡ cáº¥p' },
            { value: 'intermediate', label: 'Trung cáº¥p' }
        ];
        const englishTopicOptions = [
            { value: 'animals', label: 'ðŸ¾ Äá»™ng váº­t' },
            { value: 'colors', label: 'ðŸŽ¨ MÃ u sáº¯c' },
            { value: 'fruits', label: 'ðŸŽ TrÃ¡i cÃ¢y' },
            { value: 'family', label: 'ðŸ‘¨â€ðŸ‘©â€ðŸ‘§ Gia Ä‘Ã¬nh' },
            { value: 'body', label: 'ðŸ¦µ CÆ¡ thá»ƒ' },
            { value: 'school', label: 'ðŸ« TrÆ°á»ng há»c' },
            { value: 'weather', label: 'ðŸŒ¤ï¸ Thá»i tiáº¿t' },
            { value: 'food', label: 'ðŸ• Thá»©c Äƒn' },
            { value: 'transport', label: 'ðŸš— PhÆ°Æ¡ng tiá»‡n' },
            { value: 'clothing', label: 'ðŸ‘• Quáº§n Ã¡o' }
        ];
        const englishMethodOptions = [
            { value: 'vocabulary', label: 'ðŸ“– Tá»« vá»±ng' },
            { value: 'game', label: 'ðŸŽ® TrÃ² chÆ¡i' },
            { value: 'story', label: 'ðŸ“š CÃ¢u chuyá»‡n' },
            { value: 'song', label: 'ðŸŽµ BÃ i hÃ¡t' },
            { value: 'conversation', label: 'ðŸ’¬ Há»™i thoáº¡i' }
        ];
        const difficultyOptions = [
            { value: 'easy', label: 'Dá»…' },
            { value: 'medium', label: 'Trung bÃ¬nh' },
            { value: 'hard', label: 'KhÃ³' }
        ];
        const mathLevelOptions = [
            { value: 'auto', label: 'Tá»± Ä‘á»™ng' },
            { value: 'beginner', label: 'Beginner' },
            { value: 'elementary', label: 'Elementary' },
            { value: 'intermediate', label: 'Intermediate' }
        ];
        const mathOperationOptions = [
            { value: 'add', label: 'âž• Cá»™ng' },
            { value: 'subtract', label: 'âž– Trá»«' },
            { value: 'multiply', label: 'âœ–ï¸ NhÃ¢n' },
            { value: 'divide', label: 'âž— Chia' }
        ];
        const encouragementOptions = [
            { value: 'high', label: 'Khen nhiá»u' },
            { value: 'medium', label: 'CÃ¢n báº±ng' },
            { value: 'low', label: 'Thá»±c dá»¥ng' }
        ];
        const languageRatioOptions = [
            { value: 'vi_primary', label: 'Tiáº¿ng Viá»‡t lÃ  chÃ­nh' },
            { value: 'en_primary', label: 'Tiáº¿ng Anh lÃ  chÃ­nh' },
            { value: 'balanced', label: 'CÃ¢n báº±ng' }
        ];

        // Lá»‹ch há»c hiá»‡n táº¡i
        const studySchedule = config.study_schedule || { days: [], time: "19:00" };
        const scheduleDays = studySchedule.days || [];
        const scheduleTime = studySchedule.time || "19:00";

        // GiÃ¡ trá»‹ hiá»‡n táº¡i tá»« config
        const enTopics = config.english_topics || [];
        const enMethods = config.english_methods || [];
        const mathOps = config.math_operations || [];

        // Render blocked topics tags
        const blockedTagsHTML = state.blockedTopicsTags.map(t => `<span class="tag-pill">${t}<button type="button" class="tag-remove" data-tag="${t}">&times;</button></span>`).join('');

        appElement.innerHTML = `
            <div class="flex-between mb-2">
                <h2>Cáº¥u HÃ¬nh AI</h2>
                <button id="backMenuBtn" class="btn btn-outline" style="padding: 6px 12px; width: auto; font-size: 0.8em; border-radius: 8px;">Trá»Ÿ láº¡i</button>
            </div>

            <!-- GÃ³i GiÃ¡o TrÃ¬nh Máº«u -->
            <div class="glass-panel mb-2">
                <h3 style="margin-bottom: 10px;">ðŸ“¦ GÃ³i GiÃ¡o TrÃ¬nh Máº«u</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                    <div class="preset-card" data-preset="mam_non" style="padding: 10px; background: rgba(255,255,255,0.4); border-radius: 8px; cursor: pointer; text-align: center; border: 1px solid rgba(255,255,255,0.6);">
                        <div style="font-size: 24px;">ðŸ£</div>
                        <strong>Máº§m non</strong>
                        <div style="font-size: 0.8em; color: var(--text-light)">Dá»…, vui nhá»™n</div>
                    </div>
                    <div class="preset-card" data-preset="tieu_chuan" style="padding: 10px; background: rgba(255,255,255,0.4); border-radius: 8px; cursor: pointer; text-align: center; border: 1px solid rgba(255,255,255,0.6);">
                        <div style="font-size: 24px;">âš–ï¸</div>
                        <strong>TiÃªu chuáº©n</strong>
                        <div style="font-size: 0.8em; color: var(--text-light)">CÃ¢n báº±ng</div>
                    </div>
                    <div class="preset-card" data-preset="nang_cao" style="padding: 10px; background: rgba(255,255,255,0.4); border-radius: 8px; cursor: pointer; text-align: center; border: 1px solid rgba(255,255,255,0.6);">
                        <div style="font-size: 24px;">ðŸš€</div>
                        <strong>NÃ¢ng cao</strong>
                        <div style="font-size: 0.8em; color: var(--text-light)">NghiÃªm tÃºc, KhÃ³</div>
                    </div>
                </div>
            </div>

            <form id="configForm">

                <!-- ===== TÃNH CÃCH & THá»œI GIAN ===== -->
                <div class="glass-panel">
                    <h3>ðŸ¤– TÃ­nh cÃ¡ch Robot</h3>
                    <div class="form-group">
                        <select id="personality">
                            <option value="playful" ${config.personality==='playful'?'selected':''}>Vui nhá»™n, thÃ¢n thiá»‡n</option>
                            <option value="patient" ${config.personality==='patient'?'selected':''}>KiÃªn nháº«n, nháº¹ nhÃ ng</option>
                            <option value="strict" ${config.personality==='strict'?'selected':''}>NghiÃªm kháº¯c, há»c thuáº­t</option>
                        </select>
                    </div>
                    
                    <div class="section-divider"></div>

                    <h3>â±ï¸ Giá»›i háº¡n thá»i gian</h3>
                    <div class="form-group">
                        <label for="daily_limit">Sá»‘ phÃºt/ngÃ y</label>
                        <input type="number" id="daily_limit" value="${config.daily_limit_minutes || 30}" placeholder="PhÃºt/ngÃ y" min="5" max="120">
                    </div>

                    <div class="section-divider"></div>

                    <h3>ðŸ“… Lá»‹ch há»c chá»§ Ä‘á»™ng</h3>
                    <div class="form-group">
                        <label>Chá»n ngÃ y há»c trong tuáº§n</label>
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
                        <label for="schedule_time">Giá» nháº¯c nhá»Ÿ</label>
                        <input type="time" id="schedule_time" value="${scheduleTime}">
                    </div>
                </div>

                <!-- ===== MÃ”N TIáº¾NG ANH ===== -->
                <div class="glass-panel">
                    <h3>ðŸ‡¬ðŸ‡§ MÃ´n Tiáº¿ng Anh</h3>
                    <label class="toggle-label">
                        KÃ­ch hoáº¡t Tiáº¿ng Anh
                        <input type="checkbox" id="en_enabled" ${config.english_enabled ? 'checked' : ''}>
                    </label>

                    <div class="section-divider"></div>

                    <div class="form-group">
                        <label>Cáº¥p Ä‘á»™</label>
                        ${buildSelect('en_level', englishLevelOptions, config.english_level || 'auto')}
                    </div>

                    <div class="form-group">
                        <label>Chá»§ Ä‘á» há»c</label>
                        ${buildCheckboxGroup('en_topics', englishTopicOptions, enTopics)}
                    </div>

                    <div class="form-group">
                        <label>PhÆ°Æ¡ng phÃ¡p dáº¡y</label>
                        ${buildCheckboxGroup('en_methods', englishMethodOptions, enMethods)}
                    </div>

                    <div class="form-group">
                        <label for="en_words_per_session">Sá»‘ tá»« má»—i buá»•i há»c</label>
                        <input type="number" id="en_words_per_session" value="${config.english_words_per_session ?? 5}" min="1" max="20">
                    </div>

                    <div class="form-group">
                        <label>Äá»™ khÃ³</label>
                        ${buildSelect('en_difficulty', difficultyOptions, config.english_difficulty || 'medium')}
                    </div>

                    <div class="section-divider"></div>

                    <div class="form-group">
                        <label for="en_instruction">HÆ°á»›ng dáº«n riÃªng cho mÃ´n Tiáº¿ng Anh</label>
                        <textarea id="en_instruction" rows="2" placeholder="VD: HÃ£y khen bÃ© nhiá»u hÆ¡n...">${config.english_custom_instructions || ''}</textarea>
                    </div>
                </div>

                <!-- ===== MÃ”N TOÃN Há»ŒC ===== -->
                <div class="glass-panel">
                    <h3>ðŸ”¢ MÃ´n ToÃ¡n Há»c</h3>
                    <label class="toggle-label">
                        KÃ­ch hoáº¡t ToÃ¡n
                        <input type="checkbox" id="math_enabled" ${config.math_enabled ? 'checked' : ''}>
                    </label>

                    <div class="section-divider"></div>

                    <div class="form-group">
                        <label>Cáº¥p Ä‘á»™</label>
                        ${buildSelect('math_level', mathLevelOptions, config.math_level || 'auto')}
                    </div>

                    <div class="form-group">
                        <label>PhÃ©p tÃ­nh</label>
                        ${buildCheckboxGroup('math_ops', mathOperationOptions, mathOps)}
                    </div>

                    <div class="form-group">
                        <label>Äá»™ khÃ³</label>
                        ${buildSelect('math_difficulty', difficultyOptions, config.math_difficulty || 'medium')}
                    </div>

                    <label class="toggle-label">
                        BÃ i toÃ¡n cÃ³ lá»i
                        <input type="checkbox" id="math_word_problems" ${config.math_word_problems ? 'checked' : ''}>
                    </label>

                    <div class="section-divider"></div>

                    <div class="form-group">
                        <label for="math_instruction">HÆ°á»›ng dáº«n riÃªng cho mÃ´n ToÃ¡n</label>
                        <textarea id="math_instruction" rows="2" placeholder="VD: Ra Ä‘á» vá» siÃªu nhÃ¢n">${config.math_custom_instructions || ''}</textarea>
                    </div>
                </div>

                <!-- ===== CÃ€I Äáº¶T CHUNG ===== -->
                <div class="glass-panel">
                    <h3>ðŸŽ¯ CÃ i Äáº·t Chung</h3>

                    <div class="form-group">
                        <label>Má»©c Ä‘á»™ khuyáº¿n khÃ­ch</label>
                        ${buildSelect('encouragement_level', encouragementOptions, config.encouragement_level || 'medium')}
                    </div>

                    <div class="form-group">
                        <label>Tá»‰ lá»‡ ngÃ´n ngá»¯</label>
                        ${buildSelect('language_ratio', languageRatioOptions, config.language_ratio || 'vi_primary')}
                    </div>

                    <div class="section-divider"></div>

                    <div class="form-group">
                        <label>Chá»§ Ä‘á» bá»‹ cháº·n</label>
                        <div class="tag-input-container" id="blockedTagsContainer">
                            <div class="tags-wrapper" id="tagsWrapper">
                                ${blockedTagsHTML}
                            </div>
                            <input type="text" id="blockedTopicInput" placeholder="Nháº­p chá»§ Ä‘á» rá»“i nháº¥n Enter..." class="tag-text-input">
                        </div>
                        <p style="font-size: 0.8em; color: var(--text-light); margin-top: 6px;">Nháº¥n Enter Ä‘á»ƒ thÃªm. Nháº¥n Ã— Ä‘á»ƒ xoÃ¡.</p>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary mb-2" id="saveConfigBtn">ðŸ’¾ LÆ°u Cáº¥u HÃ¬nh</button>
            </form>
        `;

        // --- Event Listeners ---

        // NÃºt trá»Ÿ láº¡i
        document.getElementById('backMenuBtn').addEventListener('click', renderChildMenu);

        // Preset cards
        document.querySelectorAll('.preset-card').forEach(card => {
            card.addEventListener('click', () => {
                const preset = card.getAttribute('data-preset');
                if (preset === 'mam_non') {
                    document.getElementById('personality').value = 'playful';
                    document.getElementById('en_level').value = 'beginner';
                    document.getElementById('en_difficulty').value = 'easy';
                    document.getElementById('math_level').value = 'beginner';
                    document.getElementById('math_difficulty').value = 'easy';
                    document.getElementById('math_word_problems').checked = false;
                    document.getElementById('encouragement_level').value = 'high';
                    document.getElementById('language_ratio').value = 'vi_primary';
                } else if (preset === 'tieu_chuan') {
                    document.getElementById('personality').value = 'patient';
                    document.getElementById('en_level').value = 'elementary';
                    document.getElementById('en_difficulty').value = 'medium';
                    document.getElementById('math_level').value = 'elementary';
                    document.getElementById('math_difficulty').value = 'medium';
                    document.getElementById('math_word_problems').checked = true;
                    document.getElementById('encouragement_level').value = 'medium';
                    document.getElementById('language_ratio').value = 'balanced';
                } else if (preset === 'nang_cao') {
                    document.getElementById('personality').value = 'strict';
                    document.getElementById('en_level').value = 'intermediate';
                    document.getElementById('en_difficulty').value = 'hard';
                    document.getElementById('math_level').value = 'intermediate';
                    document.getElementById('math_difficulty').value = 'hard';
                    document.getElementById('math_word_problems').checked = true;
                    document.getElementById('encouragement_level').value = 'low';
                    document.getElementById('language_ratio').value = 'en_primary';
                }
                const changedIds = ['personality', 'en_level', 'en_difficulty', 'math_level', 'math_difficulty', 'encouragement_level', 'language_ratio'];
                changedIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.classList.remove('highlight-change');
                        void el.offsetWidth;
                        el.classList.add('highlight-change');
                    }
                });
                showToast(`ÄÃ£ Ã¡p dá»¥ng máº«u: ${card.querySelector('strong').innerText}. KÃ©o xuá»‘ng báº¥m LÆ°u Ä‘á»ƒ xÃ¡c nháº­n.`);
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

        // Delegate click cho nÃºt xoÃ¡ tag
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
            btn.innerText = 'Äang lÆ°u...';
            btn.disabled = true;

            // Thu tháº­p checkbox groups
            const getCheckedValues = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);

            const updatedConfig = {
                // TÃ­nh cÃ¡ch & thá»i gian
                personality: document.getElementById('personality').value,
                daily_limit_minutes: parseInt(document.getElementById('daily_limit').value) || 30,
                study_schedule: {
                    days: getCheckedValues('schedule_days'),
                    time: document.getElementById('schedule_time').value
                },

                // Tiáº¿ng Anh
                english_enabled: document.getElementById('en_enabled').checked,
                english_level: document.getElementById('en_level').value,
                english_topics: getCheckedValues('en_topics'),
                english_methods: getCheckedValues('en_methods'),
                english_words_per_session: parseInt(document.getElementById('en_words_per_session').value) || 5,
                english_difficulty: document.getElementById('en_difficulty').value,
                english_custom_instructions: document.getElementById('en_instruction').value,

                // ToÃ¡n
                math_enabled: document.getElementById('math_enabled').checked,
                math_level: document.getElementById('math_level').value,
                math_operations: getCheckedValues('math_ops'),
                math_difficulty: document.getElementById('math_difficulty').value,
                math_word_problems: document.getElementById('math_word_problems').checked,
                math_custom_instructions: document.getElementById('math_instruction').value,

                // CÃ i Ä‘áº·t chung
                encouragement_level: document.getElementById('encouragement_level').value,
                language_ratio: document.getElementById('language_ratio').value,
                topics_blocked: state.blockedTopicsTags
            };

            try {
                await api.updateTeachingConfig(state.currentChild.user_id, updatedConfig);
                alert('ÄÃ£ lÆ°u cáº¥u hÃ¬nh thÃ nh cÃ´ng!');
                renderChildMenu();
            } catch (error) {
                alert('Lá»—i: ' + error.message);
                btn.innerText = 'ðŸ’¾ LÆ°u Cáº¥u HÃ¬nh';
                btn.disabled = false;
            }
        });

    } catch (error) {
        appElement.innerHTML = `<p class="text-center" style="color: var(--danger)">Lá»—i: ${error.message}</p><button id="backMenuBtn" class="btn btn-primary">Quay láº¡i</button>`;
        document.getElementById('backMenuBtn').addEventListener('click', renderChildMenu);
    }
}

