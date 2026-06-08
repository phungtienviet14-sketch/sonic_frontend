import { api } from './api.js';
import { navigateTo, paths, replacePath } from './navigation.js';
import { state } from './state.js';
import { appElement, renderLogin } from './components/auth.js';
import { renderChildMenu } from './components/childMenu.js';
import { renderConfig } from './components/config.js';
import { renderDashboard, renderAddChildForm } from './components/dashboard.js';
import { renderReport } from './components/report.js';
import { escapeHtml, refreshIcons } from './utils.js';

const CHILD_TABS = new Set(['overview', 'next']);
const REPORT_TABS = new Set(['overview', 'english', 'math', 'history']);
const CONFIG_SECTIONS = new Set(['goals', 'english', 'math', 'safety']);

export function initRouter() {
    window.addEventListener('popstate', routeCurrentPath);
    window.addEventListener('sonic:navigate', routeCurrentPath);
    routeCurrentPath();
}

export async function routeCurrentPath() {
    const token = localStorage.getItem('token');
    const route = parseRoute(window.location.pathname);

    if (!token) {
        renderPublicRoute(route);
        return;
    }

    if (route.type === 'login' || route.type === 'register' || route.type === 'root') {
        replacePath(paths.dashboard());
        await renderDashboard();
        return;
    }

    try {
        if (route.type === 'dashboard') {
            await renderDashboard();
            return;
        }

        if (route.type === 'add-child') {
            renderAddChildForm();
            return;
        }

        if (route.type === 'child') {
            if (await selectChild(route.childId)) {
                await renderChildMenu(route.tab);
            }
            return;
        }

        if (route.type === 'report') {
            if (await selectChild(route.childId)) {
                await renderReport(route.tab);
            }
            return;
        }

        if (route.type === 'config') {
            if (await selectChild(route.childId)) {
                await renderConfig(route.section);
            }
            return;
        }

        replacePath(paths.dashboard());
        await renderDashboard();
    } catch (error) {
        renderRouteError(error);
    }
}

function renderPublicRoute(route) {
    if (route.type === 'register') {
        renderLogin('register');
        return;
    }
    if (route.type !== 'login') {
        replacePath(paths.login());
    }
    renderLogin('login');
}

function parseRoute(pathname) {
    const segments = pathname.split('/').filter(Boolean).map(safeDecodeSegment);

    if (!segments.length) return { type: 'root' };
    if (segments[0] === 'login') return { type: 'login' };
    if (segments[0] === 'register') return { type: 'register' };
    if (segments[0] === 'dashboard') return { type: 'dashboard' };

    if (segments[0] === 'children' && segments[1] === 'new') {
        return { type: 'add-child' };
    }

    if (segments[0] === 'children' && segments[1]) {
        const childId = segments[1];
        if (segments[2] === 'report') {
            return {
                type: 'report',
                childId,
                tab: REPORT_TABS.has(segments[3]) ? segments[3] : 'overview',
            };
        }
        if (segments[2] === 'config') {
            return {
                type: 'config',
                childId,
                section: CONFIG_SECTIONS.has(segments[3]) ? segments[3] : 'goals',
            };
        }
        return {
            type: 'child',
            childId,
            tab: CHILD_TABS.has(segments[2]) ? segments[2] : 'overview',
        };
    }

    return { type: 'not-found' };
}

function safeDecodeSegment(segment) {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

async function selectChild(childId) {
    if (!state.childrenList.length) {
        state.childrenList = await api.getChildren();
    }

    const child = state.childrenList.find(item => String(item.user_id) === String(childId));
    if (!child) {
        replacePath(paths.dashboard());
        await renderDashboard();
        return false;
    }

    state.currentChild = child;
    state.currentOverview = state.overviewCache[child.user_id] || null;
    return true;
}

function renderRouteError(error) {
    appElement.innerHTML = `
        <main class="page-shell narrow">
            <div class="surface error-panel">
                <h2>Không mở được trang</h2>
                <p>${escapeHtml(error.message || 'Đường dẫn hiện tại chưa sẵn sàng.')}</p>
                <button id="routeHomeBtn" class="btn btn-primary" data-path="${paths.dashboard()}" type="button">
                    <i data-lucide="layout-dashboard"></i>
                    <span>Về bảng điều khiển</span>
                </button>
            </div>
        </main>
    `;
    document.getElementById('routeHomeBtn').addEventListener('click', (event) => {
        navigateTo(event.currentTarget.getAttribute('data-path'), { replace: true });
    });
    refreshIcons();
}
