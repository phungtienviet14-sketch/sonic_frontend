export const paths = {
    login: () => '/login',
    register: () => '/register',
    dashboard: () => '/dashboard',
    addChild: () => '/children/new',
    child: (childId, tab = 'overview') => `/children/${encodeURIComponent(childId)}/${tab}`,
    report: (childId, tab = 'overview') => `/children/${encodeURIComponent(childId)}/report/${tab}`,
    config: (childId, section = 'goals') => `/children/${encodeURIComponent(childId)}/config/${section}`,
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
