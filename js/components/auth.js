import { api } from '../api.js';
import { renderDashboard } from './dashboard.js';

export const appElement = document.getElementById('app');

const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = import.meta.env?.VITE_FACEBOOK_APP_ID || '';
const FACEBOOK_GRAPH_VERSION = import.meta.env?.VITE_FACEBOOK_GRAPH_VERSION || 'v20.0';
const AUTH_LOG_PREFIX = '[Sonic Parent][Auth]';

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
    logAuth('Auth token received; opening dashboard', {
        hasAccessToken: Boolean(accessToken),
    });
    localStorage.setItem('token', accessToken);
    renderDashboard();
}

function showError(message) {
    logAuthError('UI error shown', new Error(message));
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
        logAuth('Google login skipped because VITE_GOOGLE_CLIENT_ID is empty');
        return;
    }
    logAuth('Google SDK load started');
    googleScriptPromise ||= loadScript('https://accounts.google.com/gsi/client', 'google');
    await googleScriptPromise;
    const target = document.getElementById('googleButton');
    if (!target || !window.google?.accounts?.id) {
        logAuthError('Google SDK loaded but button target or API is missing', new Error('Google button unavailable'), {
            hasTarget: Boolean(target),
            hasGoogleAccountsId: Boolean(window.google?.accounts?.id),
        });
        return;
    }

    logAuth('Google button initialized');
    window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
            try {
                logAuth('Google callback received', {
                    hasCredential: Boolean(response?.credential),
                });
                const res = await api.socialLogin('google', response.credential);
                setAuthToken(res.access_token);
            } catch (error) {
                logAuthError('Google login failed', error);
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
    logAuth('Facebook SDK load requested');
    if (!FACEBOOK_APP_ID) {
        logAuthError('Facebook App ID is missing', new Error('Missing VITE_FACEBOOK_APP_ID'));
        return Promise.reject(new Error('Đăng nhập Facebook chưa được cấu hình.'));
    }
    if (facebookReady && window.FB) {
        logAuth('Facebook SDK already ready');
        return Promise.resolve(window.FB);
    }
    if (window.FB) {
        logAuth('Facebook SDK found on window; initializing');
        window.FB.init({
            appId: FACEBOOK_APP_ID,
            cookie: true,
            xfbml: false,
            version: FACEBOOK_GRAPH_VERSION,
        });
        facebookReady = true;
        logAuth('Facebook SDK initialized from existing window.FB');
        return Promise.resolve(window.FB);
    }

    if (!facebookScriptPromise) {
        logAuth('Facebook SDK script injection started', {
            sdkUrl: 'https://connect.facebook.net/vi_VN/sdk.js',
        });
        facebookScriptPromise = new Promise((resolve, reject) => {
            let settled = false;
            const finish = () => {
                if (settled || !window.FB) return;
                settled = true;
                logAuth('Facebook SDK script loaded; initializing FB', {
                    appIdUsedForInit: FACEBOOK_APP_ID,
                });
                window.FB.init({
                    appId: FACEBOOK_APP_ID,
                    cookie: true,
                    xfbml: false,
                    version: FACEBOOK_GRAPH_VERSION,
                });
                facebookReady = true;
                logAuth('Facebook SDK initialized successfully');
                resolve(window.FB);
            };
            const fail = (message) => {
                if (settled) return;
                settled = true;
                logAuthError('Facebook SDK load failed', new Error(message));
                reject(new Error(message));
            };

            window.fbAsyncInit = finish;

            const existing = document.getElementById('facebook-jssdk');
            if (existing) {
                logAuth('Existing Facebook SDK script tag found');
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

            setTimeout(() => fail('Facebook SDK tải quá lâu. Hãy kiểm tra domain/app id Facebook.'), 15000);
        }).catch((error) => {
            facebookScriptPromise = null;
            facebookReady = false;
            logAuthError('Facebook SDK promise rejected and state reset', error);
            throw error;
        });
    } else {
        logAuth('Facebook SDK load already in progress');
    }

    return facebookScriptPromise;
}

function preloadFacebookSdk() {
    if (!FACEBOOK_APP_ID || facebookReady) {
        logAuth('Facebook SDK preload skipped', {
            hasFacebookAppId: Boolean(FACEBOOK_APP_ID),
            facebookReady,
        });
        return;
    }
    logAuth('Facebook SDK preload started');
    setFacebookButtonState({ busy: true, disabled: true, label: FACEBOOK_LOADING_LABEL });
    loadFacebookSdk()
        .then(() => {
            logAuth('Facebook SDK preload completed');
            if (!facebookLoginInProgress) {
                setFacebookButtonState();
            }
        })
        .catch((error) => {
            logAuthError('Facebook SDK preload failed', error);
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
    logAuth('Facebook login callback received', {
        status: response?.status,
        hasAuthResponse: Boolean(response?.authResponse),
        hasAccessToken: Boolean(response?.authResponse?.accessToken),
        grantedScopes: response?.authResponse?.grantedScopes,
        deniedScopes: response?.authResponse?.deniedScopes,
    });
    try {
        if (!response?.authResponse?.accessToken) {
            showError('Bạn chưa hoàn tất đăng nhập Facebook hoặc chưa cấp quyền email.');
            return;
        }

        setFacebookButtonState({ busy: true, disabled: true, label: FACEBOOK_VERIFYING_LABEL });
        logAuth('Sending Facebook access token to backend', {
            provider: 'facebook',
            tokenLength: response.authResponse.accessToken.length,
        });
        const res = await api.socialLogin('facebook', response.authResponse.accessToken);
        setAuthToken(res.access_token);
    } catch (error) {
        logAuthError('Facebook backend verification failed', error);
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

    logAuth('Facebook login button clicked', {
        scopeRequested: 'email,public_profile',
    });

    if (facebookLoginInProgress) {
        logAuth('Facebook login click ignored because another login is in progress');
        return;
    }

    if (!FACEBOOK_APP_ID) {
        logAuthError('Facebook login blocked because App ID is missing', new Error('Missing VITE_FACEBOOK_APP_ID'));
        showError('Đăng nhập Facebook chưa được cấu hình.');
        return;
    }
    if (!facebookReady || !window.FB) {
        logAuth('Facebook login blocked until SDK is ready');
        preloadFacebookSdk();
        showError('Facebook đang khởi động. Vui lòng thử lại sau khi nút sẵn sàng.');
        return;
    }

    facebookLoginInProgress = true;
    setFacebookButtonState({ busy: true, disabled: true, label: FACEBOOK_LOGIN_LABEL });

    try {
        logAuth('Calling window.FB.login', {
            appIdUsedForLogin: FACEBOOK_APP_ID,
            scopeRequested: 'email,public_profile',
            returnScopes: true,
        });
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
            logAuthError('Facebook login timed out waiting for callback', new Error('Facebook popup timeout'));
            showError('Không mở được cửa sổ Facebook. Hãy cho phép popup rồi bấm lại.');
        }, 30000);
    } catch (error) {
        facebookLoginInProgress = false;
        setFacebookButtonState();
        logAuthError('Facebook login threw before popup completed', error);
        showError(error.message);
    }
}

export function renderLogin(mode = 'login') {
    const isRegister = mode === 'register';
    logAuth('Login screen rendered', {
        mode,
        hasGoogleClientId: Boolean(GOOGLE_CLIENT_ID),
        hasFacebookAppId: Boolean(FACEBOOK_APP_ID),
    });
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
            <button type="button" id="facebookLoginBtn" class="btn btn-social ${FACEBOOK_APP_ID ? '' : 'hidden'}">${FACEBOOK_DEFAULT_LABEL}</button>
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
    preloadFacebookSdk();
}
