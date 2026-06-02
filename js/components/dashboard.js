import { api } from '../api.js';
import { state } from '../state.js';
import { renderLogin, appElement } from './auth.js';
import { renderChildMenu } from './childMenu.js';
import { showToast } from '../utils.js';

export async function renderDashboard() {
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải dữ liệu...</p>`;
    try {
        state.childrenList = await api.getChildren();

        let childrenHTML = state.childrenList.map(child => `
            <div class="glass-panel child-card" data-id="${child.user_id}" style="cursor: pointer; padding: 16px; display: flex; align-items: center; gap: 15px; transition: transform 0.2s, box-shadow 0.2s; margin-bottom: 12px;">
                <div class="avatar" style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; font-weight: bold; flex-shrink: 0; box-shadow: 0 4px 10px rgba(255, 123, 84, 0.3);">
                    ${child.full_name.charAt(0).toUpperCase()}
                </div>
                <div style="flex-grow: 1;">
                    <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-dark);">${child.full_name}</h3>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                        <span style="background: rgba(147, 155, 98, 0.2); color: var(--accent); padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">${child.age} tuổi</span>
                        <span class="copy-id-btn" data-id="${child.user_id}" title="Copy ID của bé" style="color: var(--text-light); font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 6px; background: rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            Copy ID
                        </span>
                    </div>
                    ${child.weak_points ? `<div style="font-size: 0.8rem; color: #ef4444; margin-top: 6px; background: rgba(239, 68, 68, 0.1); padding: 4px 8px; border-radius: 4px;"><strong>Cần ôn tập:</strong> ${child.weak_points}</div>` : ''}
                </div>
                <div style="color: var(--primary); opacity: 0.5;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
        `).join('');

        if (state.childrenList.length === 0) {
            childrenHTML = `<p class="text-center">Bạn chưa thêm bé nào.</p>`;
        }

        appElement.innerHTML = `
            <div class="flex-between mb-2" style="position: relative;">
                <h2>Trang chủ</h2>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button id="notiBtn" class="btn btn-outline" style="position: relative; padding: 4px 8px; font-size: 1.2em; border: none; background: transparent; cursor: pointer;">
                        🔔 <span id="notiBadge" style="position: absolute; top: -2px; right: -2px; background: #ef4444; color: white; border-radius: 50%; font-size: 0.5em; padding: 2px 5px; font-weight: bold; display: none;">0</span>
                    </button>
                    <button id="logoutBtn" class="btn btn-outline" style="padding: 6px 12px; width: auto; font-size: 0.8em; border-radius: 8px;">Đăng xuất</button>
                </div>
                <div id="notiDropdown" class="glass-panel hidden" style="position: absolute; top: 40px; right: 0; width: 280px; z-index: 100; font-size: 0.8em; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                    <h4 style="margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 5px; color: var(--primary);">Thông báo gần đây</h4>
                    <div id="notiList" style="max-height: 200px; overflow-y: auto;">Đang tải...</div>
                </div>
            </div>
            <div class="children-list">
                ${childrenHTML}
            </div>
            <button class="btn btn-primary mt-2" id="addChildBtn">+ Thêm bé mới</button>
        `;

        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            renderLogin();
        });

        document.getElementById('notiBtn').addEventListener('click', () => {
            document.getElementById('notiDropdown').classList.toggle('hidden');
        });

        setTimeout(async () => {
            let notis = [];
            for (let child of state.childrenList) {
                try {
                    const report = await api.getReport(child.user_id);
                    const engActs = report.english?.recent_activities || [];
                    const mathActs = report.math?.recent_activities || [];
                    const allActs = [...engActs, ...mathActs].filter(a => a.score >= 80);
                    allActs.slice(0, 3).forEach(a => {
                        notis.push(`🎉 <b>${child.full_name}</b> đạt ${a.score}đ môn ${a.activity_type || 'học'}`);
                    });
                } catch (e) {}
            }
            const notiList = document.getElementById('notiList');
            const notiBadge = document.getElementById('notiBadge');
            if (notis.length > 0) {
                notiBadge.innerText = notis.length;
                notiBadge.style.display = 'block';
                notiList.innerHTML = notis.map(n => `<div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">${n}</div>`).join('');
            } else {
                notiList.innerHTML = '<i style="color: var(--text-light)">Không có thành tích mới.</i>';
            }
        }, 1000);

        document.getElementById('addChildBtn').addEventListener('click', renderAddChildForm);

        document.querySelectorAll('.child-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.copy-id-btn')) {
                    const id = e.target.closest('.copy-id-btn').getAttribute('data-id');
                    navigator.clipboard.writeText(id).then(() => {
                        showToast('Đã copy ID: ' + id);
                    }).catch(() => {
                        showToast('Không thể copy ID', 'error');
                    });
                    return;
                }
                const id = card.getAttribute('data-id');
                state.currentChild = state.childrenList.find(c => c.user_id === id);
                renderChildMenu();
            });
        });

    } catch (error) {
        appElement.innerHTML = `<p class="text-center" style="color: var(--danger)">Lỗi tải dữ liệu: ${error.message}</p><button class="btn btn-primary mt-2" onclick="location.reload()">Thử lại</button>`;
    }
}

export function renderAddChildForm() {
    appElement.innerHTML = `
        <div class="flex-between mb-2">
            <h2>Thêm bé mới</h2>
            <button id="backBtn" class="btn btn-outline" style="padding: 6px 12px; width: auto; font-size: 0.8em; border-radius: 8px;">Trở lại</button>
        </div>
        <form id="addChildForm">
            <div class="glass-panel">
                <div class="form-group">
                    <label for="childName">Họ và tên bé</label>
                    <input type="text" id="childName" placeholder="VD: Nguyễn Bảo An" required>
                </div>
                <div class="form-group">
                    <label for="childAge">Tuổi</label>
                    <input type="number" id="childAge" placeholder="VD: 5" min="1" max="15" required>
                </div>
            </div>
            <div id="addChildError" class="hidden" style="color: var(--danger); margin-bottom: 10px; font-size: 0.9em;"></div>
            <div id="addChildSuccess" class="hidden" style="color: var(--success); margin-bottom: 10px; font-size: 0.9em;"></div>
            <button type="submit" class="btn btn-primary" id="addChildSubmitBtn">Thêm bé</button>
        </form>
    `;

    document.getElementById('backBtn').addEventListener('click', renderDashboard);
    document.getElementById('addChildForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('addChildSubmitBtn');
        const errorDiv = document.getElementById('addChildError');
        const successDiv = document.getElementById('addChildSuccess');
        const fullName = document.getElementById('childName').value.trim();
        const age = parseInt(document.getElementById('childAge').value);

        btn.innerText = 'Đang thêm...';
        btn.disabled = true;
        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');

        try {
            await api.addChild({ full_name: fullName, age });
            successDiv.innerText = `Đã thêm bé ${fullName} thành công! Đang quay lại...`;
            successDiv.classList.remove('hidden');
            setTimeout(() => renderDashboard(), 1500);
        } catch (error) {
            errorDiv.innerText = error.message;
            errorDiv.classList.remove('hidden');
            btn.innerText = 'Thêm bé';
            btn.disabled = false;
        }
    });
}
