export const paths = {
    login: () => '/login',
    register: () => '/register',
    dashboard: () => '/dashboard',
    addChild: () => '/children/new',
    child: (childId, tab = 'overview') => `/children/${encodeURIComponent(childId)}/${tab}`,
    report: (childId, tab = 'overview') => `/children/${encodeURIComponent(childId)}/report/${tab}`,
    lessons: (childId) => `/children/${encodeURIComponent(childId)}/lessons`,
    mathRoadmap: (childId) => `/children/${encodeURIComponent(childId)}/math-roadmap`,
    config: (childId, section = 'goals') => `/children/${encodeURIComponent(childId)}/config/${section}`,
    privacy: (childId) => `/children/${encodeURIComponent(childId)}/privacy`,
    editChild: (childId) => `/children/${encodeURIComponent(childId)}/edit`,
    connect: (childId) => `/children/${encodeURIComponent(childId)}/connect`,
    account: () => '/account',
    guide: () => '/guide',
};

export function navigateTo(path, { replace = false } = {}) {
    const target = normalizePath(path);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (current !== target) {
        window.history[replace ? 'replaceState' : 'pushState']({}, '', target);
    }
    window.dispatchEvent(new CustomEvent('sonic:navigate'));
}

export function writePath(path, { replace = false } = {}) {
    const target = normalizePath(path);
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== target) {
        window.history[replace ? 'replaceState' : 'pushState']({}, '', target);
    }
}

export function replacePath(path) {
    const target = normalizePath(path);
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== target) {
        window.history.replaceState({}, '', target);
    }
}

function normalizePath(path) {
    if (!path || path === '/') return paths.dashboard();
    return path.startsWith('/') ? path : `/${path}`;
}
