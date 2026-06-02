import { api } from '../api.js';
import { renderDashboard } from './dashboard.js';

export const appElement = document.getElementById('app');

const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = import.meta.env?.VITE_FACEBOOK_APP_ID || '';
const FACEBOOK_GRAPH_VERSION = import.meta.env?.VITE_FACEBOOK_GRAPH_VERSION || 'v20.0';
const FACEBOOK_CALLBACK_PATH = '/facebook-callback.html';

let googleScriptPromise = null;

function loadScript(src, globalName) {
    if (globalName && window[globalName]) {
        return Promise.resolve(window[globalName]);
    }
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve(globalName ? window[globalName] : true), { once: true });
            existing.addEventListener('error', reject, { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(globalName ? window[globalName] : true);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function setAuthToken(accessToken) {
    localStorage.setItem('token', accessToken);
    renderDashboard();
}

function showError(message) {
    const errorDiv = document.getElementById('authError');
    if (!errorDiv) return;
    errorDiv.innerText = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    const errorDiv = document.getElementById('authError');
    if (!errorDiv) return;
    errorDiv.classList.add('hidden');
    errorDiv.innerText = '';
}

async function initGoogleButton() {
    if (!GOOGLE_CLIENT_ID) return;
    googleScriptPromise ||= loadScript('https://accounts.google.com/gsi/client', 'google');
    await googleScriptPromise;
    const target = document.getElementById('googleButton');
    if (!target || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
            try {
                const res = await api.socialLogin('google', response.credential);
                setAuthToken(res.access_token);
            } catch (error) {
                showError(error.message);
            }
        },
    });
    window.google.accounts.id.renderButton(target, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: target.offsetWidth || 320,
        text: 'continue_with',
    });
}

function loginWithFacebook(event) {
    event?.preventDefault();
    event?.stopPropagation();
    hideError();

    if (!FACEBOOK_APP_ID) {
        showError('Đăng nhập Facebook chưa được cấu hình.');
        return;
    }

    const redirectUri = new URL(FACEBOOK_CALLBACK_PATH, window.location.origin).href;
    const state = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    sessionStorage.setItem('facebook_oauth_state', state);

    const params = new URLSearchParams({
        client_id: FACEBOOK_APP_ID,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: 'email,public_profile',
        display: 'popup',
        state,
    });
    const popupUrl = `https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
    const popup = window.open(
        popupUrl,
        'sonicFacebookLogin',
        'width=520,height=680,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
        showError('Trình duyệt đang chặn popup Facebook. Hãy cho phép popup rồi bấm lại.');
        return;
    }

    const button = document.getElementById('facebookLoginBtn');
    if (button) {
        button.innerText = 'Đang chờ Facebook...';
        button.disabled = true;
    }

    const cleanup = () => {
        window.removeEventListener('message', handleFacebookMessage);
        clearInterval(closeWatcher);
        clearTimeout(timeout);
        if (button) {
            button.innerText = 'Tiếp tục với Facebook';
            button.disabled = false;
        }
    };

    const closeWatcher = setInterval(() => {
        if (popup.closed) {
            cleanup();
            showError('Bạn đã đóng cửa sổ Facebook trước khi hoàn tất đăng nhập.');
        }
    }, 500);

    const timeout = setTimeout(() => {
        cleanup();
        try {
            popup.close();
        } catch (error) {}
        showError('Đăng nhập Facebook quá lâu. Vui lòng thử lại.');
    }, 120000);

    async function handleFacebookMessage(messageEvent) {
        if (messageEvent.origin !== window.location.origin) return;
        const data = messageEvent.data || {};
        if (data.type !== 'sonic-facebook-login') return;

        cleanup();
        try {
            popup.close();
        } catch (error) {}

        const expectedState = sessionStorage.getItem('facebook_oauth_state');
        sessionStorage.removeItem('facebook_oauth_state');

        if (data.state !== expectedState) {
            showError('Phiên đăng nhập Facebook không hợp lệ. Vui lòng thử lại.');
            return;
        }
        if (data.error) {
            showError(data.error);
            return;
        }
        if (!data.accessToken) {
            showError('Không nhận được token Facebook.');
            return;
        }

        try {
            const res = await api.socialLogin('facebook', data.accessToken);
            setAuthToken(res.access_token);
        } catch (error) {
            showError(error.message);
        }
    }

    window.addEventListener('message', handleFacebookMessage);
}

export function renderLogin(mode = 'login') {
    const isRegister = mode === 'register';
    appElement.innerHTML = `
        <div class="text-center mb-2">
            <h2>Sonic Parent</h2>
            <p>${isRegister ? 'Tạo tài khoản phụ huynh' : 'Đăng nhập để quản lý tiến độ học tập của bé'}</p>
        </div>

        <div class="auth-tabs mb-2">
            <button type="button" id="showLogin" class="auth-tab ${!isRegister ? 'active' : ''}">Đăng nhập</button>
            <button type="button" id="showRegister" class="auth-tab ${isRegister ? 'active' : ''}">Đăng ký</button>
        </div>

        <form id="authForm">
            ${isRegister ? `
                <div class="form-group">
                    <input type="text" id="fullName" placeholder="Họ tên phụ huynh" required>
                </div>
            ` : ''}
            <div class="form-group">
                <input type="email" id="email" placeholder="Email" required value="${isRegister ? '' : 'bome1@gmail.com'}">
            </div>
            <div class="form-group">
                <input type="password" id="password" placeholder="Mật khẩu" required value="${isRegister ? '' : '123456'}">
            </div>
            ${isRegister ? `
                <div class="form-group">
                    <input type="password" id="confirmPassword" placeholder="Nhập lại mật khẩu" required>
                </div>
                <div class="form-group">
                    <input type="text" id="phone" placeholder="Số điện thoại (không bắt buộc)">
                </div>
            ` : ''}
            <div id="authError" class="hidden auth-error"></div>
            <button type="submit" class="btn btn-primary" id="authBtn">${isRegister ? 'Đăng ký' : 'Đăng nhập'}</button>
        </form>

        <div class="auth-divider"><span>hoặc</span></div>
        <div class="social-login">
            <div class="social-button-frame ${GOOGLE_CLIENT_ID ? '' : 'hidden'}">
                <div id="googleButton"></div>
            </div>
            <button type="button" id="facebookLoginBtn" class="btn btn-social ${FACEBOOK_APP_ID ? '' : 'hidden'}">Tiếp tục với Facebook</button>
            ${(!GOOGLE_CLIENT_ID && !FACEBOOK_APP_ID) ? '<p class="social-note">Đăng nhập mạng xã hội chưa được cấu hình.</p>' : ''}
        </div>
    `;

    document.getElementById('showLogin').addEventListener('click', () => renderLogin('login'));
    document.getElementById('showRegister').addEventListener('click', () => renderLogin('register'));
    document.getElementById('facebookLoginBtn')?.addEventListener('click', loginWithFacebook);

    document.getElementById('authForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('authBtn');
        const errorDiv = document.getElementById('authError');
        btn.innerText = 'Đang xử lý...';
        btn.disabled = true;
        errorDiv.classList.add('hidden');

        try {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            if (isRegister) {
                const confirmPassword = document.getElementById('confirmPassword').value;
                if (password !== confirmPassword) {
                    throw new Error('Mật khẩu xác nhận không khớp');
                }
                await api.register({
                    email,
                    password,
                    confirm_password: confirmPassword,
                    full_name: document.getElementById('fullName').value.trim(),
                    phone: document.getElementById('phone').value.trim() || null,
                });
            }

            const res = await api.login(email, password);
            setAuthToken(res.access_token);
        } catch (error) {
            errorDiv.innerText = error.message;
            errorDiv.classList.remove('hidden');
        } finally {
            btn.innerText = isRegister ? 'Đăng ký' : 'Đăng nhập';
            btn.disabled = false;
        }
    });

    initGoogleButton().catch((error) => showError(`Không tải được đăng nhập Google: ${error.message}`));
}
