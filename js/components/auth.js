import { api } from '../api.js';
import { renderDashboard } from './dashboard.js';

export const appElement = document.getElementById('app');

const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = import.meta.env?.VITE_FACEBOOK_APP_ID || '';
const FACEBOOK_GRAPH_VERSION = import.meta.env?.VITE_FACEBOOK_GRAPH_VERSION || 'v20.0';

let googleScriptPromise = null;
let facebookScriptPromise = null;

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

async function loginWithFacebook() {
    if (!FACEBOOK_APP_ID) {
        showError('Đăng nhập Facebook chưa được cấu hình.');
        return;
    }
    facebookScriptPromise ||= loadScript('https://connect.facebook.net/en_US/sdk.js', 'FB');
    await facebookScriptPromise;
    window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: FACEBOOK_GRAPH_VERSION,
    });
    window.FB.login(async (response) => {
        if (!response.authResponse?.accessToken) {
            showError('Không nhận được token Facebook.');
            return;
        }
        try {
            const res = await api.socialLogin('facebook', response.authResponse.accessToken);
            setAuthToken(res.access_token);
        } catch (error) {
            showError(error.message);
        }
    }, { scope: 'email,public_profile' });
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
            <div id="googleButton" class="${GOOGLE_CLIENT_ID ? '' : 'hidden'}"></div>
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
