const API_BASE = (import.meta.env && import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : 'http://localhost:8000') + '/api/parents';
const API_LOG_PREFIX = '[Sonic cho ba mẹ][API]';

function sanitizeRequestBody(body) {
    if (!body) return null;
    try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        return Object.fromEntries(
            Object.entries(parsed).map(([key, value]) => {
                if (['password', 'confirm_password', 'token', 'accessToken'].includes(key)) {
                    return [key, value ? '[hidden]' : value];
                }
                return [key, value];
            })
        );
    } catch {
        return '[không đọc được dữ liệu gửi đi]';
    }
}

function logApi(step, details = {}) {
    console.log(API_LOG_PREFIX, step, {
        time: new Date().toISOString(),
        ...details,
    });
}

function logApiError(step, error, details = {}) {
    console.error(API_LOG_PREFIX, step, {
        time: new Date().toISOString(),
        message: error?.message || String(error),
        ...details,
    });
}

export const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };

        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers,
            },
        };

        try {
            logApi('Bắt đầu gọi API', {
                endpoint,
                method: config.method || 'GET',
                apiBase: API_BASE,
                hasAuthToken: Boolean(token),
                body: sanitizeRequestBody(config.body),
            });
            const response = await fetch(`${API_BASE}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                const requestError = new Error(data.detail || data.error || response.statusText);
                requestError.status = response.status;
                requestError.endpoint = endpoint;
                requestError.response = data;
                logApiError('Gọi API thất bại', requestError, {
                    endpoint,
                    status: response.status,
                    response: data,
                });
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.reload();
                }
                throw requestError;
            }
            logApi('Gọi API thành công', {
                endpoint,
                status: response.status,
            });
            return data;
        } catch (error) {
            logApiError('Lỗi khi gọi API', error, { endpoint });
            throw error;
        }
    },

    login(email, password) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    register(parentData) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify(parentData),
        });
    },

    socialLogin(provider, token) {
        logApi('Chuẩn bị đăng nhập mạng xã hội', {
            provider,
            hasProviderToken: Boolean(token),
            providerTokenLength: token ? token.length : 0,
        });
        return this.request('/social-login', {
            method: 'POST',
            body: JSON.stringify({ provider, token }),
        });
    },

    async getChildren() {
        const data = await this.request('/children');
        return data.children || [];
    },

    addChild(childData) {
        return this.request('/children', {
            method: 'POST',
            body: JSON.stringify(childData),
        });
    },

    updateChild(userId, childData) {
        return this.request(`/children/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(childData),
        });
    },

    deleteChild(userId) {
        return this.request(`/children/${userId}`, { method: 'DELETE' });
    },

    getMe() {
        return this.request('/me');
    },

    changePassword(currentPassword, newPassword) {
        return this.request('/me/change-password', {
            method: 'POST',
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        });
    },

    async getReport(userId) {
        try {
            // Hai môn độc lập -> tải SONG SONG (trước đây tuần tự, gấp đôi thời gian chờ).
            const [english, math] = await Promise.all([
                this.request(`/children/${userId}/progress/english`),
                this.request(`/children/${userId}/progress/math`),
            ]);
            return { english, math };
        } catch (error) {
            console.error('Lỗi tải báo cáo:', error);
            throw error;
        }
    },

    getOverview(userId) {
        return this.request(`/children/${userId}/overview`);
    },

    getTeachingConfig(userId) {
        return this.request(`/children/${userId}/teaching-config`);
    },

    updateTeachingConfig(userId, config) {
        return this.request(`/children/${userId}/teaching-config`, {
            method: 'PUT',
            body: JSON.stringify(config),
        });
    },

    // GĐ4a — Trí nhớ dài hạn theo bé
    getChildMemory(userId) {
        return this.request(`/children/${userId}/memory`);
    },

    deleteChildMemory(userId) {
        return this.request(`/children/${userId}/memory`, { method: 'DELETE' });
    },

    // GĐ4b — Voiceprint (dữ liệu sinh trắc học; Luật BVDLCN 2025 + NĐ 356/2025)
    getVoiceprintStatus(userId) {
        return this.request(`/children/${userId}/voiceprint`);
    },

    getVoiceprintConsentText(userId) {
        return this.request(`/children/${userId}/voiceprint/consent-text`);
    },

    grantVoiceprintConsent(userId, consentVersion, childAssentAttested = false) {
        return this.request(`/children/${userId}/voiceprint/consent`, {
            method: 'POST',
            body: JSON.stringify({
                consent_version: consentVersion,
                agreed: true,
                child_assent_attested: childAssentAttested,
            }),
        });
    },

    revokeVoiceprintConsent(userId) {
        return this.request(`/children/${userId}/voiceprint/consent`, { method: 'DELETE' });
    },

    deleteVoiceprint(userId) {
        return this.request(`/children/${userId}/voiceprint`, { method: 'DELETE' });
    },
};
