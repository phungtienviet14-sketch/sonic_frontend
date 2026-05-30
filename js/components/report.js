import { api } from '../api.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { renderChildMenu } from './childMenu.js';

export async function renderReport() {
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải báo cáo...</p>`;
    try {
        const report = await api.getReport(state.currentChild.user_id);
        
        const engLvl = report.english?.level_info?.current_level || 'Chưa học';
        const engXp = report.english?.level_info?.total_xp || 0;
        const mathLvl = report.math?.level_info?.current_level || 'Chưa học';
        const mathXp = report.math?.level_info?.total_xp || 0;

        const engBadges = report.english?.level_info?.badges || [];
        const engBadgesHTML = engBadges.length > 0 ? `<p style="margin-top: 5px;">Huy hiệu: <span style="font-size: 1.1em;">${engBadges.join(' ')}</span></p>` : '';

        const mathBadges = report.math?.level_info?.badges || [];
        const mathBadgesHTML = mathBadges.length > 0 ? `<p style="margin-top: 5px;">Huy hiệu: <span style="font-size: 1.1em;">${mathBadges.join(' ')}</span></p>` : '';

        // Sử dụng recent_activities thay vì history
        const engHistory = report.english?.recent_activities?.slice(0,3) || [];
        const mathHistory = report.math?.recent_activities?.slice(0,3) || [];

        const engHistoryHTML = engHistory.length > 0
            ? engHistory.map(h => `<div style="padding: 8px; background: rgba(255,255,255,0.5); border-radius: 8px; margin-bottom: 8px;"><strong>${h.activity_type || 'Học'}</strong> — ${h.topic || 'N/A'} — Điểm: ${h.score ?? 'N/A'}</div>`).join('')
            : 'Chưa có lịch sử';

        const mathHistoryHTML = mathHistory.length > 0
            ? mathHistory.map(h => `<div style="padding: 8px; background: rgba(255,255,255,0.5); border-radius: 8px; margin-bottom: 8px;"><strong>${h.activity_type || 'Giải'}</strong> — ${h.topic || 'N/A'} — Điểm: ${h.score ?? 'N/A'}</div>`).join('')
            : 'Chưa có lịch sử';

        appElement.innerHTML = `
            <div class="flex-between mb-2">
                <h2>Báo Cáo Học Tập</h2>
                <button id="backMenuBtn" class="btn btn-outline" style="padding: 6px 12px; width: auto; font-size: 0.8em; border-radius: 8px;">Đóng</button>
            </div>
            
            <div class="glass-panel mb-2">
                <h3 style="margin-bottom: 10px;">📈 Biểu đồ Tiến độ</h3>
                <canvas id="learningChart" width="400" height="200"></canvas>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="glass-panel">
                    <h3 style="color: #3b82f6;">Tiếng Anh</h3>
                    <p>Cấp độ: <strong>${engLvl.toUpperCase()}</strong></p>
                    <p>Kinh nghiệm: <strong>${engXp} XP</strong></p>
                    ${engBadgesHTML}
                    <div style="font-size: 0.9em; margin-top: 10px;">
                        ${engHistoryHTML}
                    </div>
                </div>

                <div class="glass-panel">
                    <h3 style="color: #10b981;">Toán Học</h3>
                    <p>Cấp độ: <strong>${mathLvl.toUpperCase()}</strong></p>
                    <p>Kinh nghiệm: <strong>${mathXp} XP</strong></p>
                    ${mathBadgesHTML}
                    <div style="font-size: 0.9em; margin-top: 10px;">
                        ${mathHistoryHTML}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('backMenuBtn').addEventListener('click', renderChildMenu);

        // Khởi tạo Chart.js
        const ctx = document.getElementById('learningChart').getContext('2d');
        const engScores = engHistory.map(h => h.score || 0).reverse();
        const mathScores = mathHistory.map(h => h.score || 0).reverse();
        const maxLen = Math.max(engScores.length, mathScores.length, 5);
        const labels = Array.from({length: maxLen}, (_, i) => `Buổi ${i+1}`);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Tiếng Anh',
                        data: engScores,
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        borderRadius: 4
                    },
                    {
                        label: 'Toán Học',
                        data: mathScores,
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
    } catch (error) {
        appElement.innerHTML = `<p class="text-center" style="color: var(--danger)">Lỗi: ${error.message}</p><button id="backMenuBtn" class="btn btn-primary">Quay lại</button>`;
        document.getElementById('backMenuBtn').addEventListener('click', renderChildMenu);
    }
}
