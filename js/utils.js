import { state } from './state.js';

export function buildCheckboxGroup(name, options, selectedValues = []) {
    return `<div class="checkbox-grid">${options.map(opt => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const checked = selectedValues.includes(val) ? 'checked' : '';
        return `<label class="checkbox-pill"><input type="checkbox" name="${name}" value="${val}" ${checked}><span>${label}</span></label>`;
    }).join('')}</div>`;
}

export function buildSelect(id, options, selectedValue) {
    return `<select id="${id}">${options.map(opt => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const selected = val === selectedValue ? 'selected' : '';
        return `<option value="${val}" ${selected}>${label}</option>`;
    }).join('')}</select>`;
}

export function getCheckedValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

export function refreshBlockedTags() {
    const wrapper = document.getElementById('tagsWrapper');
    if (!wrapper) return;
    wrapper.innerHTML = state.blockedTopicsTags
        .map(t => `<span class="tag-pill">${escapeHtml(t)}<button type="button" class="tag-remove" data-tag="${escapeHtml(t)}" aria-label="Xóa ${escapeHtml(t)}">&times;</button></span>`)
        .join('');
}

export function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.className = `toast toast-${type}`;
    toast.innerHTML = type === 'success' ? `Đã xong: ${escapeHtml(message)}` : `Thông báo: ${escapeHtml(message)}`;

    void toast.offsetWidth;
    toast.classList.add('show');

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

export function refreshIcons() {
    if (window.lucide?.createIcons) {
        window.lucide.createIcons({
            attrs: {
                'stroke-width': 2.2,
                'aria-hidden': 'true',
            },
        });
    }
}

export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================================================
// Nhãn thân thiện dùng chung (giấu số kỹ thuật cho phụ huynh).
// Gom 1 nguồn để Báo cáo / Tổng quan / Lộ trình hiển thị NHẤT QUÁN.
// ============================================================================

// Cấp độ học -> nhãn thân thiện. Đồng bộ Cấu hình / Lộ trình / Báo cáo.
export function formatLevel(level) {
    const labels = {
        auto: 'Tự động',
        beginner: 'Mới bắt đầu',
        elementary: 'Sơ cấp',
        intermediate: 'Trung cấp',
        pre_a1: 'Vỡ lòng',
        a1: 'Cơ bản',
        a2: 'Khá',
    };
    return labels[String(level || 'beginner').toLowerCase()] || String(level || 'beginner').toUpperCase();
}

// Mã skill / loại lỗi / lý do recommendation -> nhãn tiếng Việt.
export function labelCode(value) {
    const labels = {
        counting: 'đếm số',
        comparison: 'so sánh',
        compare: 'so sánh',
        addition: 'phép cộng',
        subtraction: 'phép trừ',
        multiplication: 'phép nhân',
        division: 'phép chia',
        geometry: 'hình học',
        geometry_shapes: 'nhận biết hình',
        time: 'xem giờ',
        money: 'tiền và mua bán',
        measurement: 'đo lường',
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
        word_problem_comprehension: 'đọc hiểu đề toán',
        careless_error: 'trả lời vội',
        review_word: 'ôn từ cần nhớ',
        repair_misconception: 'sửa lỗi hay gặp',
        practice_skill: 'luyện kỹ năng',
        next_lesson: 'bài tiếp theo',
        english: 'Tiếng Anh',
        math: 'Toán',
    };
    return labels[String(value || '').toLowerCase()] || String(value || 'chưa rõ');
}

// Phát âm: accuracy 0-100 -> Rõ / Tạm / Cần luyện (chuẩn bản ngữ khoan dung).
export function pronBand(accuracy) {
    if (accuracy == null) return { label: 'Chưa rõ', cls: 'is-new' };
    if (accuracy >= 70) return { label: 'Rõ', cls: 'is-done' };
    if (accuracy >= 50) return { label: 'Tạm', cls: 'is-learning' };
    return { label: 'Cần luyện', cls: 'is-poor' };
}

// Mức nắm KỸ NĂNG: 0-100 -> Tốt / Khá / Cần luyện. Mốc 60 = "đã giỏi" (đồng bộ
// backend lesson planner coi mastery < 60 là chưa giỏi).
export function masteryBand(score) {
    const s = Number(score || 0);
    if (s >= 60) return { label: 'Tốt', cls: 'is-done' };
    if (s >= 30) return { label: 'Khá', cls: 'is-learning' };
    return { label: 'Cần luyện', cls: 'is-poor' };
}

// Mức thuộc của TỪ: strength 0-100 -> Mới học / Đang nhớ / Đã thuộc.
// Mốc 30 / 80 đồng bộ với hiển thị ⚪🟡🟢 trong Lộ trình (word_status backend).
export function wordStrengthBand(score) {
    const s = Number(score || 0);
    if (s >= 80) return { label: 'Đã thuộc', cls: 'is-done' };
    if (s >= 30) return { label: 'Đang nhớ', cls: 'is-learning' };
    return { label: 'Mới học', cls: 'is-new' };
}
