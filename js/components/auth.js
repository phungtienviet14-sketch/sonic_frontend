import { api } from '../api.js';
import { renderDashboard } from './dashboard.js';
export const appElement = document.getElementById('app');

export function renderLogin() {
    appElement.innerHTML = `
        <div class="text-center mb-2">
            <h2>Sonic Parent</h2>
            <p>Đăng nhập để quản lý tiến độ học tập của bé</p>
        </div>
        <form id="loginForm">
            <div class="form-group">
                <input type="email" id="email" placeholder="Email" required value="bome1@gmail.com">
            </div>
            <div class="form-group">
                <input type="password" id="password" placeholder="Mật khẩu" required value="123456">
            </div>
            <div id="loginError" class="hidden" style="color: var(--danger); margin-bottom: 10px; font-size: 0.9em;"></div>
            <button type="submit" class="btn btn-primary" id="loginBtn">Đăng nhập</button>
        </form>
    `;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('loginBtn');
        const errorDiv = document.getElementById('loginError');
        btn.innerText = 'Đang xử lý...';
        btn.disabled = true;
        errorDiv.classList.add('hidden');

        try {
            const res = await api.login(
                document.getElementById('email').value,
                document.getElementById('password').value
            );
            localStorage.setItem('token', res.access_token);
            renderDashboard();
        } catch (error) {
            errorDiv.innerText = error.message;
            errorDiv.classList.remove('hidden');
        } finally {
            btn.innerText = 'Đăng nhập';
            btn.disabled = false;
        }
    });
}
