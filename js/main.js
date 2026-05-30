import { api } from './api.js';
import { renderLogin } from './components/auth.js';
import { renderDashboard } from './components/dashboard.js';

export function init() {
    const token = localStorage.getItem('token');
    if (token) {
        renderDashboard();
    } else {
        renderLogin();
    }
}

document.addEventListener('DOMContentLoaded', init);
