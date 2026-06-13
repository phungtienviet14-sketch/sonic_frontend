import { api } from '../api.js';
import { navigateTo, paths } from '../navigation.js';
import { appElement } from './auth.js';
import { escapeHtml, refreshIcons, showToast } from '../utils.js';

export async function renderAccount() {
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải tài khoản...</p>`;
    let me = {};
    try {
        me = await api.getMe();
    } catch (error) {
        console.warn('[Sonic cho ba mẹ] Không tải được thông tin tài khoản', error);
    }
    const provider = me.auth_provider || 'password';

    appElement.innerHTML = `
        <main class="page-shell narrow">
            <header class="app-header simple">
                <div>
                    <p class="eyebrow">Tài khoản</p>
                    <h1>Tài khoản phụ huynh</h1>
                </div>
                <button id="backBtn" class="btn btn-outline btn-inline" data-path="${paths.dashboard()}" type="button">
                    <i data-lucide="arrow-left"></i>
                    <span>Trở lại</span>
                </button>
            </header>

            <section class="surface account-info">
                <div class="account-avatar">${escapeHtml((me.full_name || me.email || '?').trim().charAt(0).toUpperCase())}</div>
                <div>
                    <h2>${escapeHtml(me.full_name || 'Phụ huynh')}</h2>
                    <p class="muted">${escapeHtml(me.email || '')}</p>
                    <span class="provider-chip"><i data-lucide="${providerIcon(provider)}"></i>${providerLabel(provider)}</span>
                </div>
            </section>

            <section class="surface form-surface">
                <h2>Đổi mật khẩu</h2>
                ${provider === 'password' ? renderPasswordForm() : `
                    <p class="muted compact">Tài khoản này đăng nhập bằng ${providerLabel(provider)} nên không đổi mật khẩu tại đây. Hãy quản lý mật khẩu trong tài khoản ${providerLabel(provider)} của bạn.</p>
                `}
            </section>

            <button id="logoutBtn" class="btn btn-outline btn-wide btn-danger" data-path="${paths.login()}" type="button">
                <i data-lucide="log-out"></i>
                <span>Đăng xuất</span>
            </button>
        </main>
    `;

    document.getElementById('backBtn').addEventListener('click', (event) => navigateTo(event.currentTarget.getAttribute('data-path')));
    document.getElementById('logoutBtn').addEventListener('click', (event) => {
        localStorage.removeItem('token');
        navigateTo(event.currentTarget.getAttribute('data-path'), { replace: true });
    });
    document.getElementById('changePasswordForm')?.addEventListener('submit', handleChangePassword);
    refreshIcons();
}

function renderPasswordForm() {
    return `
        <form id="changePasswordForm">
            <div class="form-group">
                <label for="currentPassword">Mật khẩu hiện tại</label>
                <input type="password" id="currentPassword" autocomplete="current-password" required>
            </div>
            <div class="form-group">
                <label for="newPassword">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                <input type="password" id="newPassword" autocomplete="new-password" minlength="6" required>
            </div>
            <div class="form-group">
                <label for="confirmPassword">Nhập lại mật khẩu mới</label>
                <input type="password" id="confirmPassword" autocomplete="new-password" minlength="6" required>
            </div>
            <div id="passwordError" class="hidden form-message danger"></div>
            <div id="passwordSuccess" class="hidden form-message success"></div>
            <button type="submit" class="btn btn-primary" id="changePasswordBtn">
                <i data-lucide="key-round"></i>
                <span>Đổi mật khẩu</span>
            </button>
        </form>
    `;
}

async function handleChangePassword(event) {
    event.preventDefault();
    const button = document.getElementById('changePasswordBtn');
    const errorDiv = document.getElementById('passwordError');
    const successDiv = document.getElementById('passwordSuccess');
    const current = document.getElementById('currentPassword').value;
    const next = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    if (next !== confirm) {
        errorDiv.innerText = 'Mật khẩu mới và phần nhập lại không khớp.';
        errorDiv.classList.remove('hidden');
        return;
    }

    button.innerHTML = '<i data-lucide="loader-circle"></i><span>Đang đổi...</span>';
    button.disabled = true;
    refreshIcons();
    try {
        await api.changePassword(current, next);
        successDiv.innerText = 'Đã đổi mật khẩu thành công.';
        successDiv.classList.remove('hidden');
        document.getElementById('changePasswordForm').reset();
        showToast('Đã đổi mật khẩu');
    } catch (error) {
        errorDiv.innerText = error.message;
        errorDiv.classList.remove('hidden');
    } finally {
        button.innerHTML = '<i data-lucide="key-round"></i><span>Đổi mật khẩu</span>';
        button.disabled = false;
        refreshIcons();
    }
}

function providerLabel(provider) {
    return { password: 'Email & mật khẩu', google: 'Google', facebook: 'Facebook' }[provider] || provider;
}

function providerIcon(provider) {
    return { password: 'mail', google: 'globe', facebook: 'globe' }[provider] || 'shield';
}
