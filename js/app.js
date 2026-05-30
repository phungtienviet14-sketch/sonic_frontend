import { api } from './api.js';

const app = document.getElementById('app');

// State
let childrenList = [];
let currentChild = null;
let blockedTopicsTags = []; // State cho tag input topics_blocked

// ==========================================
// RENDERERS (VIEWS)
// ==========================================

function renderLogin() {
    app.innerHTML = `
        <div class="text-center mb-2">
            <h2>Sonic Parent</h2>
            <p>Đăng nhập để quản lý tiến độ học tập của bé</p>
        </div>
        <form id="loginForm">
            <div class="form-group">
                <input type="email" id="email" placeholder="Email" required value="bome1@gmail.com">
            </div>
            <div class="form-group">
                <input type="password" id="password" placeholder="Mật khẩu" required value="123456">
            </div>
            <div id="loginError" class="hidden" style="color: var(--danger); margin-bottom: 10px; font-size: 0.9em;"></div>
            <button type="submit" class="btn btn-primary" id="loginBtn">Đăng nhập</button>
        </form>
    `;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('loginBtn');
        const errorDiv = document.getElementById('loginError');
        btn.innerText = 'Đang xử lý...';
        btn.disabled = true;
        errorDiv.classList.add('hidden');

        try {
            const res = await api.login(
                document.getElementById('email').value,
                document.getElementById('password').value
            );
            localStorage.setItem('token', res.access_token);
            renderDashboard();
        } catch (error) {
            errorDiv.innerText = error.message;
            errorDiv.classList.remove('hidden');
        } finally {
            btn.innerText = 'Đăng nhập';
            btn.disabled = false;
        }
    });
}

async function renderDashboard() {
    app.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải dữ liệu...</p>`;
    try {
        childrenList = await api.getChildren();
        
        let childrenHTML = childrenList.map(child => `
            <div class="glass-panel child-card" data-id="${child.user_id}">
                <div class="flex-between">
                    <h3>👶 ${child.full_name}</h3>
                    <span style="color: var(--primary); font-weight: bold;">${child.age} tuổi</span>
                </div>
            </div>
        `).join('');

        if (childrenList.length === 0) {
            childrenHTML = `<p class="text-center">Bạn chưa thêm bé nào.</p>`;
        }

        app.innerHTML = `
            <div class="flex-between mb-2">
                <h2>Trang chủ</h2>
                <button id="logoutBtn" class="btn btn-outline" style="padding: 6px 12px; width: auto; font-size: 0.8em; border-radius: 8px;">Đăng xuất</button>
            </div>
            <div class="children-list">
                ${childrenHTML}
            </div>
            <button class="btn btn-primary mt-2" id="addChildBtn">+ Thêm bé mới</button>
        `;

        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            renderLogin();
        });

        // TASK 2: Nút thêm bé mới gọi renderAddChildForm
        document.getElementById('addChildBtn').addEventListener('click', renderAddChildForm);

        document.querySelectorAll('.child-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                currentChild = childrenList.find(c => c.user_id === id);
                renderChildMenu();
            });
        });

    } catch (error) {
        app.innerHTML = `<p class="text-center" style="color: var(--danger)">Lỗi tải dữ liệu: ${error.message}</p><button class="btn btn-primary mt-2" onclick="location.reload()">Thử lại</button>`;
    }
}

// ==========================================
// TASK 2: Form Thêm Bé Mới
// ==========================================
function renderAddChildForm() {
    app.innerHTML = `
        <div class="flex-between mb-2">
            <h2>Thêm Bé Mới</h2>
            <button id="backBtn" class="btn btn-outline" style="padding: 6px 12px; width: auto; font-size: 0.8em; border-radius: 8px;">Trở lại</button>
        </div>
        <form id="addChildForm">
            <div class="glass-panel">
                <div class="form-group">
                    <label for="childName">Họ và tên bé</label>
                    <input type="text" id="childName" placeholder="VD: Nguyễn Bảo An" required>
                </div>
                <div class="form-group">
                    <label for="childAge">Tuổi</label>
                    <input type="number" id="childAge" placeholder="VD: 5" min="1" max="15" required>
                </div>
            </div>
            <div id="addChildError" class="hidden" style="color: var(--danger); margin-bottom: 10px; font-size: 0.9em;"></div>
            <div id="addChildSuccess" class="hidden" style="color: var(--success); margin-bottom: 10px; font-size: 0.9em;"></div>
            <button type="submit" class="btn btn-primary" id="addChildSubmitBtn">Thêm bé</button>
        </form>
    `;

    document.getElementById('backBtn').addEventListener('click', renderDashboard);
    document.getElementById('addChildForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('addChildSubmitBtn');
        const errorDiv = document.getElementById('addChildError');
        const successDiv = document.getElementById('addChildSuccess');
        const fullName = document.getElementById('childName').value.trim();
        const age = parseInt(document.getElementById('childAge').value);

        btn.innerText = 'Đang thêm...';
        btn.disabled = true;
        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');

        try {
            await api.addChild({ full_name: fullName, age });
            successDiv.innerText = `Đã thêm bé ${fullName} thành công! Đang quay lại...`;
            successDiv.classList.remove('hidden');
            setTimeout(() => renderDashboard(), 1500);
        } catch (error) {
            errorDiv.innerText = error.message;
            errorDiv.classList.remove('hidden');
            btn.innerText = 'Thêm bé';
            btn.disabled = false;
        }
    });
}

function renderChildMenu() {
    app.innerHTML = `
        <div class="flex-between mb-2">
            <h2>Bé ${currentChild.full_name}</h2>
            <button id="backBtn" class="btn btn-outline" style="padding: 6px 12px; width: auto; font-size: 0.8em; border-radius: 8px;">Trở lại</button>
        </div>
        <div class="glass-panel child-card" id="btnReport">
            <h3>📊 Xem báo cáo học tập</h3>
            <p style="margin:0">Theo dõi tiến độ Toán & Tiếng Anh</p>
        </div>
        <div class="glass-panel child-card" id="btnConfig">
            <h3>⚙️ Tùy chỉnh giáo trình AI</h3>
            <p style="margin:0">Cài đặt cách Robot dạy bé</p>
        </div>
    `;

    document.getElementById('backBtn').addEventListener('click', renderDashboard);
    document.getElementById('btnReport').addEventListener('click', renderReport);
    document.getElementById('btnConfig').addEventListener('click', renderConfig);
}

// ==========================================
// TASK 1: Sửa lỗi báo cáo - dùng recent_activities thay cho history
// ==========================================
async function renderReport() {
    app.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải báo cáo...</p>`;
    try {
        const report = await api.getReport(currentChild.user_id);
        
        const engLvl = report.english?.level_info?.current_level || 'Chưa học';
        const engXp = report.english?.level_info?.total_xp || 0;
        const mathLvl = report.math?.level_info?.current_level || 'Chưa học';
        const mathXp = report.math?.level_info?.total_xp || 0;

        // Sử dụng recent_activities thay vì history
        const engHistory = report.english?.recent_activities?.slice(0,3) || [];
        const mathHistory = report.math?.recent_activities?.slice(0,3) || [];

        const engHistoryHTML = engHistory.length > 0
            ? engHistory.map(h => `<div style="padding: 8px; background: rgba(255,255,255,0.5); border-radius: 8px; margin-bottom: 8px;"><strong>${h.activity_type || 'Học'}</strong> — ${h.topic || 'N/A'} — Điểm: ${h.score ?? 'N/A'}</div>`).join('')
            : 'Chưa có lịch sử';

        const mathHistoryHTML = mathHistory.length > 0
            ? mathHistory.map(h => `<div style="padding: 8px; background: rgba(255,255,255,0.5); border-radius: 8px; margin-bottom: 8px;"><strong>${h.activity_type || 'Giải'}</strong> — ${h.topic || 'N/A'} — Điểm: ${h.score ?? 'N/A'}</div>`).join('')
            : 'Chưa có lịch sử';

        app.innerHTML = `
            <div class="flex-between mb-2">
                <h2>Báo Cáo Học Tập</h2>
                <button id="backMenuBtn" class="btn btn-outline" style="padding: 6px 12px; width: auto; font-size: 0.8em; border-radius: 8px;">Đóng</button>
            </div>
            
            <div class="glass-panel">
                <h3 style="color: #3b82f6;">Tiếng Anh</h3>
                <p>Cấp độ: <strong>${engLvl.toUpperCase()}</strong></p>
                <p>Kinh nghiệm: <strong>${engXp} XP</strong></p>
                <div style="font-size: 0.9em; margin-top: 10px;">
                    ${engHistoryHTML}
                </div>
            </div>

            <div class="glass-panel">
                <h3 style="color: #10b981;">Toán Học</h3>
                <p>Cấp độ: <strong>${mathLvl.toUpperCase()}</strong></p>
                <p>Kinh nghiệm: <strong>${mathXp} XP</strong></p>
                <div style="font-size: 0.9em; margin-top: 10px;">
                    ${mathHistoryHTML}
                </div>
            </div>
        `;

        document.getElementById('backMenuBtn').addEventListener('click', renderChildMenu);
    } catch (error) {
        app.innerHTML = `<p class="text-center" style="color: var(--danger)">Lỗi: ${error.message}</p><button id="backMenuBtn" class="btn btn-primary">Quay lại</button>`;
        document.getElementById('backMenuBtn').addEventListener('click', renderChildMenu);
    }
}

// ==========================================
// HELPERS: tạo checkbox group và dropdown
// ==========================================

function buildCheckboxGroup(name, options, selectedValues = []) {
    return `<div class="checkbox-grid">${options.map(opt => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const checked = selectedValues.includes(val) ? 'checked' : '';
        return `<label class="checkbox-pill"><input type="checkbox" name="${name}" value="${val}" ${checked}><span>${label}</span></label>`;
    }).join('')}</div>`;
}

function buildSelect(id, options, selectedValue) {
    return `<select id="${id}">${options.map(opt => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const selected = val === selectedValue ? 'selected' : '';
        return `<option value="${val}" ${selected}>${label}</option>`;
    }).join('')}</select>`;
}

// ==========================================
// TASK 3: Cấu hình giáo trình đầy đủ
// ==========================================
async function renderConfig() {
    app.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải cấu hình...</p>`;
    try {
        const config = await api.getTeachingConfig(currentChild.user_id);

        // Khởi tạo state cho blocked topics
        blockedTopicsTags = Array.isArray(config.topics_blocked) ? [...config.topics_blocked] : [];

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

        // Giá trị hiện tại từ config
        const enTopics = config.english_topics || [];
        const enMethods = config.english_methods || [];
        const mathOps = config.math_operations || [];

        // Render blocked topics tags
        const blockedTagsHTML = blockedTopicsTags.map(t => `<span class="tag-pill">${t}<button type="button" class="tag-remove" data-tag="${t}">&times;</button></span>`).join('');

        app.innerHTML = `
            <div class="flex-between mb-2">
                <h2>Cấu Hình AI</h2>
                <button id="backMenuBtn" class="btn btn-outline" style="padding: 6px 12px; width: auto; font-size: 0.8em; border-radius: 8px;">Trở lại</button>
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

        // Tag input cho topics_blocked
        const tagInput = document.getElementById('blockedTopicInput');
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = tagInput.value.trim();
                if (val && !blockedTopicsTags.includes(val)) {
                    blockedTopicsTags.push(val);
                    refreshBlockedTags();
                }
                tagInput.value = '';
            }
        });

        // Delegate click cho nút xoá tag
        document.getElementById('tagsWrapper').addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-remove')) {
                const tag = e.target.getAttribute('data-tag');
                blockedTopicsTags = blockedTopicsTags.filter(t => t !== tag);
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
                topics_blocked: blockedTopicsTags
            };

            try {
                await api.updateTeachingConfig(currentChild.user_id, updatedConfig);
                alert('Đã lưu cấu hình thành công!');
                renderChildMenu();
            } catch (error) {
                alert('Lỗi: ' + error.message);
                btn.innerText = '💾 Lưu Cấu Hình';
                btn.disabled = false;
            }
        });

    } catch (error) {
        app.innerHTML = `<p class="text-center" style="color: var(--danger)">Lỗi: ${error.message}</p><button id="backMenuBtn" class="btn btn-primary">Quay lại</button>`;
        document.getElementById('backMenuBtn').addEventListener('click', renderChildMenu);
    }
}

// Hàm cập nhật lại danh sách tags trong DOM
function refreshBlockedTags() {
    const wrapper = document.getElementById('tagsWrapper');
    wrapper.innerHTML = blockedTopicsTags.map(t => `<span class="tag-pill">${t}<button type="button" class="tag-remove" data-tag="${t}">&times;</button></span>`).join('');
}


// ==========================================
// INIT APP
// ==========================================
function init() {
    const token = localStorage.getItem('token');
    if (token) {
        renderDashboard();
    } else {
        renderLogin();
    }
}

init();
