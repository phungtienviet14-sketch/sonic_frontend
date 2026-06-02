import { state } from '../state.js';
import { appElement } from './auth.js';
import { renderDashboard } from './dashboard.js';
import { renderReport } from './report.js';
import { renderConfig } from './config.js';

export function renderChildMenu() {
    appElement.innerHTML = `
        <div class="flex-between mb-2">
            <h2>Bé ${state.currentChild.full_name}</h2>
            <button id="backBtn" class="btn btn-outline" style="padding: 6px 12px; width: auto; font-size: 0.8em; border-radius: 8px;">Trở lại</button>
        </div>
        <div class="glass-panel child-card" id="btnReport">
            <h3>Xem báo cáo học tập</h3>
            <p style="margin:0">Theo dõi tiến độ Toán và Tiếng Anh</p>
        </div>
        <div class="glass-panel child-card" id="btnConfig">
            <h3>Tùy chỉnh giáo trình AI</h3>
            <p style="margin:0">Cài đặt cách robot dạy bé</p>
        </div>
    `;

    document.getElementById('backBtn').addEventListener('click', renderDashboard);
    document.getElementById('btnReport').addEventListener('click', renderReport);
    document.getElementById('btnConfig').addEventListener('click', renderConfig);
}
