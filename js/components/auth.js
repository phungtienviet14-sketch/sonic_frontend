import { api } from '../api.js';
import { renderDashboard } from './dashboard.js';

export const appElement = document.getElementById('app');

const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = import.meta.env?.VITE_FACEBOOK_APP_ID || '';
const FACEBOOK_GRAPH_VERSION = import.meta.env?.VITE_FACEBOOK_GRAPH_VERSION || 'v20.0';
const AUTH_LOG_PREFIX = '[Sonic cho ba mẹ][Đăng nhập]';

let googleScriptPromise = null;
let facebookScriptPromise = null;
let facebookReady = false;
let facebookLoginInProgress = false;
let facebookLoginTimeout = null;

const FACEBOOK_DEFAULT_LABEL = 'Tiếp tục với Facebook';
const FACEBOOK_LOADING_LABEL = 'Đang chuẩn bị Facebook...';
const FACEBOOK_LOGIN_LABEL = 'Đang mở Facebook...';
const FACEBOOK_VERIFYING_LABEL = 'Đang xác thực Facebook...';

function maskValue(value) {
    if (!value) return '';
    if (value.length <= 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getAuthDebugContext() {
    return {
        url: window.location.href,
        origin: window.location.origin,
        facebookAppId: FACEBOOK_APP_ID,
        facebookGraphVersion: FACEBOOK_GRAPH_VERSION,
        googleClientId: maskValue(GOOGLE_CLIENT_ID),
        facebookReady,
        hasFacebookSdk: Boolean(window.FB),
    };
}

function logAuth(step, details = {}) {
    console.log(AUTH_LOG_PREFIX, step, {
        time: new Date().toISOString(),
        ...getAuthDebugContext(),
        ...details,
    });
}

function logAuthError(step, error, details = {}) {
    console.error(AUTH_LOG_PREFIX, step, {
        time: new Date().toISOString(),
        message: error?.message || String(error),
        ...getAuthDebugContext(),
        ...details,
    });
}

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
    logAuth('Đã nhận token đăng nhập, mở bảng điều khiển', {
        hasAccessToken: Boolean(accessToken),
    });
    localStorage.setItem('token', accessToken);
    renderDashboard();
}

function showError(message) {
    logAuthError('Hiển thị lỗi đăng nhập', new Error(message));
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

function setFacebookButtonState({ busy = false, disabled = false, label = FACEBOOK_DEFAULT_LABEL } = {}) {
    const button = document.getElementById('facebookLoginBtn');
    if (!button) return;
    button.disabled = disabled;
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
    button.innerText = label;
}

async function initGoogleButton() {
    if (!GOOGLE_CLIENT_ID) {
        logAuth('Bỏ qua Google vì chưa cấu hình mã ứng dụng');
        return;
    }
    googleScriptPromise ||= loadScript('https://accounts.google.com/gsi/client', 'google');
    await googleScriptPromise;
    const target = document.getElementById('googleButton');
    if (!target || !window.google?.accounts?.id) {
        logAuthError('Không tìm thấy nút hoặc SDK Google', new Error('Google unavailable'));
        return;
    }

    window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
            try {
                const res = await api.socialLogin('google', response.credential);
                setAuthToken(res.access_token);
            } catch (error) {
                logAuthError('Đăng nhập Google thất bại', error);
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

function loadFacebookSdk() {
    if (!FACEBOOK_APP_ID) {
        logAuthError('Facebook chưa có mã ứng dụng', new Error('Missing VITE_FACEBOOK_APP_ID'));
        return Promise.reject(new Error('Đăng nhập Facebook chưa được cấu hình.'));
    }
    if (facebookReady && window.FB) {
        return Promise.resolve(window.FB);
    }
    if (window.FB) {
        window.FB.init({
            appId: FACEBOOK_APP_ID,
            cookie: true,
            xfbml: false,
            version: FACEBOOK_GRAPH_VERSION,
        });
        facebookReady = true;
        return Promise.resolve(window.FB);
    }

    if (!facebookScriptPromise) {
        facebookScriptPromise = new Promise((resolve, reject) => {
            let settled = false;
            const finish = () => {
                if (settled || !window.FB) return;
                settled = true;
                window.FB.init({
                    appId: FACEBOOK_APP_ID,
                    cookie: true,
                    xfbml: false,
                    version: FACEBOOK_GRAPH_VERSION,
                });
                facebookReady = true;
                resolve(window.FB);
            };
            const fail = (message) => {
                if (settled) return;
                settled = true;
                reject(new Error(message));
            };

            window.fbAsyncInit = finish;

            const existing = document.getElementById('facebook-jssdk');
            if (existing) {
                existing.addEventListener('load', finish, { once: true });
                existing.addEventListener('error', () => fail('Không tải được Facebook SDK.'), { once: true });
                setTimeout(finish, 0);
            } else {
                const script = document.createElement('script');
                script.id = 'facebook-jssdk';
                script.src = 'https://connect.facebook.net/vi_VN/sdk.js';
                script.async = true;
                script.defer = true;
                script.crossOrigin = 'anonymous';
                script.onload = finish;
                script.onerror = () => fail('Không tải được Facebook SDK.');
                document.body.appendChild(script);
            }

            setTimeout(() => fail('Facebook SDK tải quá lâu. Hãy kiểm tra tên miền hoặc mã ứng dụng Facebook.'), 15000);
        }).catch((error) => {
            facebookScriptPromise = null;
            facebookReady = false;
            logAuthError('Tải Facebook SDK thất bại', error);
            throw error;
        });
    }

    return facebookScriptPromise;
}

function preloadFacebookSdk() {
    if (!FACEBOOK_APP_ID || facebookReady) return;
    setFacebookButtonState({ busy: true, disabled: true, label: FACEBOOK_LOADING_LABEL });
    loadFacebookSdk()
        .then(() => {
            if (!facebookLoginInProgress) {
                setFacebookButtonState();
            }
        })
        .catch((error) => {
            if (!facebookLoginInProgress) {
                setFacebookButtonState();
                showError(error.message);
            }
        });
}

function clearFacebookLoginTimeout() {
    if (!facebookLoginTimeout) return;
    clearTimeout(facebookLoginTimeout);
    facebookLoginTimeout = null;
}

async function handleFacebookLoginResponse(response) {
    clearFacebookLoginTimeout();
    try {
        if (!response?.authResponse?.accessToken) {
            showError('Bạn chưa hoàn tất đăng nhập Facebook hoặc chưa cấp quyền email.');
            return;
        }

        setFacebookButtonState({ busy: true, disabled: true, label: FACEBOOK_VERIFYING_LABEL });
        const res = await api.socialLogin('facebook', response.authResponse.accessToken);
        setAuthToken(res.access_token);
    } catch (error) {
        logAuthError('Xác thực Facebook với máy chủ thất bại', error);
        showError(error.message);
    } finally {
        facebookLoginInProgress = false;
        setFacebookButtonState();
    }
}

function loginWithFacebook(event) {
    event?.preventDefault();
    event?.stopPropagation();
    hideError();

    if (facebookLoginInProgress) return;

    if (!FACEBOOK_APP_ID) {
        showError('Đăng nhập Facebook chưa được cấu hình.');
        return;
    }
    if (!facebookReady || !window.FB) {
        preloadFacebookSdk();
        showError('Facebook đang khởi động. Vui lòng thử lại sau khi nút sẵn sàng.');
        return;
    }

    facebookLoginInProgress = true;
    setFacebookButtonState({ busy: true, disabled: true, label: FACEBOOK_LOGIN_LABEL });

    try {
        window.FB.login(function(response) {
            handleFacebookLoginResponse(response);
        }, {
            scope: 'email,public_profile',
            return_scopes: true,
        });

        facebookLoginTimeout = setTimeout(() => {
            facebookLoginInProgress = false;
            facebookLoginTimeout = null;
            setFacebookButtonState();
            showError('Không mở được cửa sổ Facebook. Hãy cho phép popup rồi bấm lại.');
        }, 30000);
    } catch (error) {
        facebookLoginInProgress = false;
        setFacebookButtonState();
        logAuthError('Không mở được đăng nhập Facebook', error);
        showError(error.message);
    }
}

export function renderLogin(mode = 'login') {
    const isRegister = mode === 'register';
    appElement.innerHTML = `
        <div class="text-center mb-2">
            <h2>Sonic cho ba mẹ</h2>
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
                    <input type="text" id="phone" placeholder="Số điện thoại, không bắt buộc">
                </div>
            ` : ''}
            <div id="authError" class="hidden auth-error"></div>
            <button type="submit" class="btn btn-primary" id="authBtn">${isRegister ? 'Đăng ký' : 'Đăng nhập'}</button>
        </form>

        <div class="auth-divider"><span>hoặc</span></div>
        <div class="social-login">
            <div id="googleButton" class="${GOOGLE_CLIENT_ID ? '' : 'hidden'}"></div>
            <button type="button" id="facebookLoginBtn" class="btn btn-social ${FACEBOOK_APP_ID ? '' : 'hidden'}">${FACEBOOK_DEFAULT_LABEL}</button>
            ${(!GOOGLE_CLIENT_ID && !FACEBOOK_APP_ID) ? '<p class="social-note">Đăng nhập mạng xã hội chưa được cấu hình.</p>' : ''}
        </div>
    `;

    document.getElementById('showLogin').addEventListener('click', () => renderLogin('login'));
    document.getElementById('showRegister').addEventListener('click', () => renderLogin('register'));
    document.getElementById('facebookLoginBtn')?.addEventListener('click', loginWithFacebook);

    document.getElementById('authForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = document.getElementById('authBtn');
        const errorDiv = document.getElementById('authError');
        button.innerText = 'Đang xử lý...';
        button.disabled = true;
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
            button.innerText = isRegister ? 'Đăng ký' : 'Đăng nhập';
            button.disabled = false;
        }
    });

    initGoogleButton().catch((error) => showError(`Không tải được đăng nhập Google: ${error.message}`));
    preloadFacebookSdk();
}
