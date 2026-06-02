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
    wrapper.innerHTML = state.blockedTopicsTags.map(t => `<span class="tag-pill">${t}<button type="button" class="tag-remove" data-tag="${t}">&times;</button></span>`).join('');
}

export function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.className = 'toast';
    toast.innerHTML = type === 'success' ? `Đã xong: ${message}` : `Thông báo: ${message}`;

    void toast.offsetWidth;

    toast.classList.add('show');

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
