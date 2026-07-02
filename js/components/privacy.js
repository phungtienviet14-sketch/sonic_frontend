import { api } from '../api.js';
import { navigateTo, paths } from '../navigation.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { escapeHtml, refreshIcons, showToast } from '../utils.js';

const MEMORY_GROUPS = [
    { key: 'interests', label: 'Sở thích', icon: 'heart' },
    { key: 'events', label: 'Chuyện bé kể', icon: 'message-circle' },
    { key: 'follow_ups', label: 'Robot sẽ hỏi thăm', icon: 'sparkles' },
];

// Câu mẫu cho bé đọc khi ghi giọng (xoay theo số mẫu đã ghi — mỗi mẫu một câu khác
// để đặc trưng giọng đa dạng hơn). ~5 giây đọc thong thả.
const VOICE_SAMPLE_SENTENCES = [
    'Xin chào Sonic, mình là bạn mới của cậu đây!',
    'Hôm nay trời đẹp quá, mình muốn học đếm số cùng Sonic.',
    'Một, hai, ba, bốn, năm — mình thích chơi với Sonic lắm!',
];
const VOICE_RECORD_SECONDS = 5;
const VOICE_TARGET_SAMPLES = 3;

export async function renderPrivacy() {
    if (!state.currentChild) {
        navigateTo(paths.dashboard(), { replace: true });
        return;
    }
    const childId = state.currentChild.user_id;
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải quyền riêng tư...</p>`;

    // Mỗi nguồn dữ liệu tự chịu lỗi: trí nhớ (đang bật) + voiceprint (có thể chưa bật).
    const [memory, voiceStatus] = await Promise.all([
        api.getChildMemory(childId).catch(() => null),
        api.getVoiceprintStatus(childId).catch(() => null),
    ]);

    appElement.innerHTML = `
        <main class="page-shell narrow">
            <header class="app-header simple">
                <div>
                    <p class="eyebrow">${escapeHtml(state.currentChild.full_name)}</p>
                    <h1>Quyền riêng tư & Bộ nhớ</h1>
                </div>
                <button id="backMenuBtn" class="btn btn-outline btn-inline" data-path="${paths.child(childId)}" type="button">
                    <i data-lucide="arrow-left"></i>
                    <span>Trở lại</span>
                </button>
            </header>

            <p class="privacy-intro">Ba mẹ toàn quyền kiểm soát dữ liệu của bé. Mọi thông tin dưới đây có thể xem và xóa bất cứ lúc nào.</p>

            ${renderMemoryCard(memory)}
            ${renderVoiceCard(voiceStatus)}
        </main>
    `;

    bindPrivacyEvents(childId);
    refreshIcons();
}

// --------------------------------------------------------------------------
// Card 1 — Trí nhớ dài hạn (GĐ4a)
// --------------------------------------------------------------------------
function renderMemoryCard(memory) {
    const json = (memory && memory.memory_json) || {};
    const hasAny = MEMORY_GROUPS.some(g => (json[g.key] || []).length > 0);

    const body = hasAny
        ? MEMORY_GROUPS.map(group => {
            const items = json[group.key] || [];
            if (!items.length) return '';
            return `
                <div class="memory-group">
                    <p class="memory-group-label"><i data-lucide="${group.icon}"></i><span>${group.label}</span></p>
                    <div class="memory-chips">
                        ${items.map(item => `<span class="memory-chip">${escapeHtml(item)}</span>`).join('')}
                    </div>
                </div>
            `;
        }).join('')
        : `<p class="muted compact">Robot chưa ghi nhớ điều gì về bé. Sau khi bé trò chuyện, robot sẽ nhớ sở thích và những chuyện bé kể để hỏi thăm thân mật hơn.</p>`;

    return `
        <section class="surface privacy-card">
            <div class="section-head compact-head">
                <div>
                    <p class="eyebrow">Trí nhớ của robot</p>
                    <h2>Robot nhớ gì về bé</h2>
                </div>
                <span class="soft-icon"><i data-lucide="brain"></i></span>
            </div>
            <p class="privacy-note">Robot chỉ lưu <strong>tóm tắt cô đọng</strong> (không lưu lại nguyên văn cuộc trò chuyện) để trò chuyện thân thiện và hỏi thăm bé tự nhiên hơn.</p>
            <div class="memory-body">${body}</div>
            ${hasAny ? `
                <div class="privacy-actions">
                    <button id="deleteMemoryBtn" class="btn btn-outline btn-danger" type="button">
                        <i data-lucide="trash-2"></i>
                        <span>Xóa toàn bộ trí nhớ</span>
                    </button>
                </div>
            ` : ''}
        </section>
    `;
}

// --------------------------------------------------------------------------
// Card 2 — Voiceprint (GĐ4b, tuân thủ Nghị định 13)
// --------------------------------------------------------------------------
function renderVoiceCard(status) {
    // Backend có thể chưa bật voiceprint (chưa có model) -> status null: hiển thị
    // dạng "sắp ra mắt" kèm cam kết quyền riêng tư.
    if (!status) {
        return `
            <section class="surface privacy-card">
                <div class="section-head compact-head">
                    <div>
                        <p class="eyebrow">Nhận diện giọng nói</p>
                        <h2>Phân biệt giọng từng bé <span class="badge-soon">Sắp ra mắt</span></h2>
                    </div>
                    <span class="soft-icon"><i data-lucide="mic"></i></span>
                </div>
                <p class="privacy-note">Tính năng giúp robot nhận ra <strong>giọng của từng bé</strong> khi nhiều bé dùng chung một robot, để ghi đúng tiến độ học cho mỗi bé. Tính năng sẽ sẵn sàng khi có robot thật.</p>
                <div class="consent-commitment">
                    <p><i data-lucide="shield-check"></i><span>Chỉ bật khi ba mẹ đồng ý rõ ràng.</span></p>
                    <p><i data-lucide="file-lock-2"></i><span>Chỉ lưu "đặc trưng giọng" (dãy số), <strong>không lưu đoạn ghi âm gốc</strong>.</span></p>
                    <p><i data-lucide="trash-2"></i><span>Ba mẹ rút đồng ý là dữ liệu giọng bị xóa ngay.</span></p>
                    <p><i data-lucide="info"></i><span><strong>Không bắt buộc để dùng robot</strong> — bé vẫn dùng bình thường nếu ba mẹ không bật.</span></p>
                </div>
                <p class="privacy-fineprint">Tuân thủ Luật Bảo vệ dữ liệu cá nhân 2025 và Nghị định 356/2025/NĐ-CP.</p>
            </section>
        `;
    }

    const consentActive = status.consent_active;
    const enrolled = status.enrolled;
    // 5 trạng thái vòng đời: chưa bật (status null, nhánh trên) · chưa đồng ý (sau rút) ·
    // đã đồng ý chưa ghi giọng (sau xóa giọng) · đã ghi giọng.
    const stateLabel = !consentActive
        ? 'Chưa đồng ý'
        : (enrolled ? `Đã ghi giọng (${status.sample_count} mẫu)` : 'Đã đồng ý — chưa ghi giọng');
    return `
        <section class="surface privacy-card">
            <div class="section-head compact-head">
                <div>
                    <p class="eyebrow">Nhận diện giọng nói</p>
                    <h2>Phân biệt giọng từng bé</h2>
                </div>
                <span class="status-chip ${consentActive ? 'ok' : 'muted-chip'}">
                    <i data-lucide="${consentActive ? 'circle-check' : 'circle-off'}"></i>
                    <span>${consentActive ? 'Đã đồng ý' : 'Chưa đồng ý'}</span>
                </span>
            </div>
            <p class="privacy-note">Giúp robot nhận ra giọng của từng bé khi nhiều bé dùng chung robot. Đây là dữ liệu sinh trắc học — cần ba mẹ đồng ý theo Luật Bảo vệ dữ liệu cá nhân 2025 + Nghị định 356/2025. <strong>Không bắt buộc để dùng robot</strong> — bé vẫn dùng bình thường nếu ba mẹ không bật.</p>
            <p class="voice-state-line"><i data-lucide="info"></i><span>Trạng thái hiện tại: <strong>${stateLabel}</strong></span></p>

            <details class="consent-details">
                <summary>Đọc cam kết quyền riêng tư</summary>
                <pre id="consentText" class="consent-text">Đang tải...</pre>
            </details>

            ${consentActive ? `
                <div class="voice-enroll-state">
                    <p><i data-lucide="${enrolled ? 'circle-check-big' : 'circle-dashed'}"></i><span>${enrolled ? `Đã ghi nhận giọng (${status.sample_count} mẫu)${status.ready ? '' : ' — cần thêm mẫu để nhận diện tốt'}` : 'Chưa ghi nhận giọng nào'}</span></p>
                </div>
                <div class="voice-record-block">
                    <p class="voice-sample-sentence">Khi ghi âm, bé đọc to câu này nhé:<br><strong>"${VOICE_SAMPLE_SENTENCES[(status.sample_count || 0) % VOICE_SAMPLE_SENTENCES.length]}"</strong></p>
                    <button id="recordVoiceBtn" class="btn btn-primary" type="button">
                        <i data-lucide="mic"></i>
                        <span>${enrolled ? 'Ghi thêm mẫu giọng' : 'Bắt đầu ghi giọng bé'} (${status.sample_count || 0}/${VOICE_TARGET_SAMPLES})</span>
                    </button>
                    <p id="recordHint" class="muted compact">Mỗi mẫu ghi ~${VOICE_RECORD_SECONDS} giây. Nên ghi đủ ${VOICE_TARGET_SAMPLES} mẫu để robot nhận giọng bé tốt nhất.</p>
                </div>
                <div class="privacy-actions">
                    ${enrolled ? `<button id="deleteVoiceBtn" class="btn btn-outline" type="button"><i data-lucide="eraser"></i><span>Xóa dữ liệu giọng</span></button>` : ''}
                    <button id="revokeConsentBtn" class="btn btn-outline btn-danger" type="button"><i data-lucide="shield-x"></i><span>Rút đồng ý & xóa</span></button>
                </div>
            ` : `
                <div class="privacy-actions voice-grant">
                    <label class="assent-check">
                        <input type="checkbox" id="childAssentCheck" />
                        <span>Với bé từ 7 tuổi: tôi xác nhận đã giải thích và hỏi ý kiến của bé. (Không bắt buộc với bé nhỏ hơn.)</span>
                    </label>
                    <button id="grantConsentBtn" class="btn btn-primary" type="button" data-version="">
                        <i data-lucide="shield-check"></i>
                        <span>Đồng ý cho nhận diện giọng</span>
                    </button>
                </div>
            `}
        </section>
    `;
}

// --------------------------------------------------------------------------
// Events
// --------------------------------------------------------------------------
function bindPrivacyEvents(childId) {
    document.getElementById('backMenuBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));

    document.getElementById('deleteMemoryBtn')?.addEventListener('click', async () => {
        if (!confirm('Xóa toàn bộ trí nhớ robot đã ghi về bé? Hành động này không hoàn tác được.')) return;
        try {
            await api.deleteChildMemory(childId);
            showToast('Đã xóa trí nhớ của bé');
            renderPrivacy();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // Nạp văn bản consent khi mở phần chi tiết (lazy).
    const consentDetails = document.querySelector('.consent-details');
    consentDetails?.addEventListener('toggle', async () => {
        if (!consentDetails.open) return;
        const target = document.getElementById('consentText');
        if (!target || target.dataset.loaded === '1') return;
        try {
            const data = await api.getVoiceprintConsentText(childId);
            target.textContent = data.text || 'Không tải được nội dung.';
            target.dataset.loaded = '1';
            const grantBtn = document.getElementById('grantConsentBtn');
            if (grantBtn) grantBtn.dataset.version = data.version || '1.1';
        } catch {
            target.textContent = 'Không tải được nội dung cam kết.';
        }
    }, { once: false });

    document.getElementById('grantConsentBtn')?.addEventListener('click', async (event) => {
        let version = event.currentTarget.dataset.version;
        if (!version) {
            try {
                const data = await api.getVoiceprintConsentText(childId);
                version = data.version || '1.1';
            } catch {
                version = '1.1';
            }
        }
        if (!confirm('Ba mẹ xác nhận đồng ý cho robot nhận diện giọng nói của bé theo cam kết quyền riêng tư?')) return;
        const childAssent = document.getElementById('childAssentCheck')?.checked || false;
        try {
            await api.grantVoiceprintConsent(childId, version, childAssent);
            showToast('Đã ghi nhận đồng ý');
            renderPrivacy();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    document.getElementById('revokeConsentBtn')?.addEventListener('click', async () => {
        if (!confirm('Rút đồng ý và xóa toàn bộ dữ liệu giọng của bé?')) return;
        try {
            await api.revokeVoiceprintConsent(childId);
            showToast('Đã rút đồng ý và xóa dữ liệu giọng');
            renderPrivacy();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    document.getElementById('deleteVoiceBtn')?.addEventListener('click', async () => {
        if (!confirm('Xóa dữ liệu giọng đã ghi của bé? (Giữ trạng thái đồng ý, có thể ghi lại sau.)')) return;
        try {
            await api.deleteVoiceprint(childId);
            showToast('Đã xóa dữ liệu giọng');
            renderPrivacy();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    document.getElementById('recordVoiceBtn')?.addEventListener('click', () => recordVoiceSample(childId));
}

// --------------------------------------------------------------------------
// Ghi mẫu giọng bé bằng MediaRecorder — blob -> data URL base64 -> backend
// (backend decode + trích đặc trưng CỤC BỘ; không lưu audio gốc). Cần HTTPS.
// --------------------------------------------------------------------------
async function recordVoiceSample(childId) {
    const btn = document.getElementById('recordVoiceBtn');
    const hint = document.getElementById('recordHint');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        showToast('Trình duyệt không hỗ trợ ghi âm — hãy dùng Chrome/Safari mới', 'error');
        return;
    }

    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
        showToast('Không truy cập được micro — hãy cho phép quyền micro rồi thử lại', 'error');
        return;
    }

    // Chọn định dạng trình duyệt hỗ trợ: Chrome/Edge = webm/opus, Safari = mp4.
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type)) || '';
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };

    const label = btn.querySelector('span');
    const originalLabel = label.textContent;
    const originalHint = hint ? hint.textContent : '';
    btn.disabled = true;
    let remain = VOICE_RECORD_SECONDS;
    label.textContent = `Đang ghi... ${remain}s`;
    if (hint) hint.textContent = 'Bé đọc to câu mẫu phía trên nhé!';
    const ticker = setInterval(() => {
        remain -= 1;
        if (remain > 0) label.textContent = `Đang ghi... ${remain}s`;
    }, 1000);

    const stopped = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start();
    setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, VOICE_RECORD_SECONDS * 1000);
    await stopped;
    clearInterval(ticker);
    stream.getTracks().forEach(track => track.stop());

    label.textContent = 'Đang xử lý...';
    try {
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
        if (!blob.size) throw new Error('Không thu được âm thanh — bé thử nói to hơn nhé');
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Không đọc được dữ liệu ghi âm'));
            reader.readAsDataURL(blob);
        });
        const result = await api.enrollVoiceprintAudio(childId, dataUrl, blob.type);
        showToast(`Đã ghi mẫu giọng (${result.sample_count}/${VOICE_TARGET_SAMPLES} mẫu)${result.ready ? ' — đủ để nhận diện!' : ''}`);
        renderPrivacy();
    } catch (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        label.textContent = originalLabel;
        if (hint) hint.textContent = originalHint;
    }
}
