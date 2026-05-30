const API_BASE = 'http://localhost:8000/api/parents';

export const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.reload();
                }
                throw new Error(data.detail || data.error || 'Có lỗi xảy ra');
            }
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    login(email, password) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    async getChildren() {
        const data = await this.request('/children');
        return data.children || [];
    },

    addChild(childData) {
        return this.request('/children', {
            method: 'POST',
            body: JSON.stringify(childData)
        });
    },

    async getReport(userId) {
        try {
            const english = await this.request(`/children/${userId}/progress/english`);
            const math = await this.request(`/children/${userId}/progress/math`);
            return { english, math };
        } catch (error) {
            console.error('Report Error:', error);
            throw error;
        }
    },

    getTeachingConfig(userId) {
        return this.request(`/children/${userId}/teaching-config`);
    },

    updateTeachingConfig(userId, config) {
        return this.request(`/children/${userId}/teaching-config`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    }
};
