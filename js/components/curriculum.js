import { api } from '../api.js';
import { navigateTo, paths } from '../navigation.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { escapeHtml, refreshIcons } from '../utils.js';

// GĐ-Lesson — màn "Lộ trình bài học" cho phụ huynh: xem/sửa tập từ mỗi bài + 2 báo cáo.
// docs/bai_hoc_tieng_anh_co_kiem_soat.md. Theo pattern full re-render của app.

// Nhãn thân thiện cho phụ huynh (giấu số kỹ thuật).
const LESSON_PROGRESS = {
    new: { label: 'Chưa học', cls: 'is-new' },
    learning: { label: 'Đang học', cls: 'is-learning' },
    done: { label: 'Hoàn thành', cls: 'is-done' },
    empty: { label: 'Chưa có từ', cls: 'is-empty' },
};
const WORD_STATE = {
    new: 'st-new',
    learning: 'st-learning',
    mastered: 'st-mastered',
};

function levelLabel(level) {
    return { pre_a1: 'Vỡ lòng', a1: 'Cơ bản', a2: 'Khá' }[level] || (level || '');
}

function pronBand(accuracy) {
    if (accuracy == null) return { label: 'Chưa rõ', cls: 'is-new' };
    if (accuracy >= 70) return { label: 'Rõ', cls: 'is-done' };
    if (accuracy >= 50) return { label: 'Tạm', cls: 'is-learning' };
    return { label: 'Cần luyện', cls: 'is-poor' };
}

let _data = { lessons: [], templates: [], pron: { words: [] }, vocab: { words: [] } };
let editorLessonId = null;   // bài đang mở trình sửa từ
let editWords = [];          // [{word_id, word, meaning_vi}] — tập từ đang sửa
let editTitle = '';          // tên bài đang sửa
let searchResults = [];
let searchQuery = '';

// Builder "Tạo / thêm chủ đề": nạp từ bài mẫu (+ tên) rồi tìm thêm từ và tạo.
let builderTitle = '';
let builderWords = [];       // [{word_id, word, meaning_vi}]
let builderResults = [];
let builderQuery = '';

function captureEditorInputs() {
    // Giữ giá trị đang gõ qua các lần re-render (editor + builder).
    const editTitleEl = document.getElementById('editLessonTitle');
    if (editTitleEl) editTitle = editTitleEl.value;
    const editSearchEl = document.getElementById('vocabSearch');
    if (editSearchEl) searchQuery = editSearchEl.value;
    const builderTitleEl = document.getElementById('builderTitle');
    if (builderTitleEl) builderTitle = builderTitleEl.value;
    const builderSearchEl = document.getElementById('builderSearch');
    if (builderSearchEl) builderQuery = builderSearchEl.value;
}

function resetBuilder() {
    builderTitle = '';
    builderWords = [];
    builderResults = [];
    builderQuery = '';
}

export async function renderCurriculum() {
    if (!state.currentChild) {
        navigateTo(paths.dashboard(), { replace: true });
        return;
    }
    appElement.innerHTML = `<div class="loader"></div><p class="text-center">Đang tải lộ trình bài học...</p>`;
    try {
        await loadData();
        editorLessonId = null;
        editWords = [];
        searchResults = [];
        searchQuery = '';
        resetBuilder();
        paint();
    } catch (error) {
        appElement.innerHTML = `
            <main class="page-shell narrow">
                <div class="surface error-panel">
                    <h2>Không tải được lộ trình</h2>
                    <p>${escapeHtml(error.message || 'Đã có lỗi xảy ra.')}</p>
                    <button class="btn btn-primary" data-action="back" type="button">
                        <i data-lucide="arrow-left"></i><span>Trở lại</span>
                    </button>
                </div>
            </main>`;
        bindRoot();
        refreshIcons();
    }
}

async function loadData() {
    const childId = state.currentChild.user_id;
    const [lessons, templates, pron, vocab] = await Promise.all([
        api.getChildLessons(childId),
        api.getLessonTemplates(),
        api.getPronunciationReport(childId),
        api.getVocabularyReport(childId),
    ]);
    _data = { lessons, templates, pron, vocab };
}

function paint() {
    const childName = escapeHtml(state.currentChild.full_name || 'bé');
    appElement.innerHTML = `
        <main class="page-shell" id="curriculumRoot">
            <header class="workspace-header surface">
                <button class="btn btn-outline btn-inline" data-action="back" type="button">
                    <i data-lucide="arrow-left"></i><span>Trở lại</span>
                </button>
                <div class="workspace-title">
                    <div>
                        <p class="eyebrow">Lộ trình Tiếng Anh</p>
                        <h1>Bài học của ${childName}</h1>
                    </div>
                </div>
            </header>

            ${renderAddLessonPanel()}
            ${renderLessonsPanel()}
            ${renderPronunciationReport()}
            ${renderVocabularyReport()}
        </main>`;
    bindRoot();
    refreshIcons();
}

function renderAddLessonPanel() {
    const options = ['<option value="">— Chọn bài mẫu để nạp từ (tùy chọn) —</option>']
        .concat(_data.templates.map(t =>
            `<option value="${escapeHtml(t.lesson_id)}">${escapeHtml(t.title)} (${escapeHtml(t.level)})</option>`))
        .join('');
    const chips = builderWords
        .map(w => `<span class="word-chip">${escapeHtml(w.word)} <small>(${escapeHtml(w.meaning_vi || '')})</small> <button data-action="builder-remove-word" data-word="${escapeHtml(w.word_id)}" type="button" aria-label="Bỏ từ">×</button></span>`)
        .join('');
    const results = builderResults
        .map(w => `<button class="btn btn-outline btn-inline" data-action="builder-add-word" data-word="${escapeHtml(w.word_id)}" type="button">+ ${escapeHtml(w.word)} <small>(${escapeHtml(w.meaning_vi || '')})</small></button>`)
        .join('');
    return `
        <section class="surface lesson-builder" style="margin-bottom:1rem;">
            <div class="section-head"><h2>Tạo / thêm chủ đề vào lộ trình</h2></div>
            <label class="lesson-field">
                <span>Tên chủ đề</span>
                <input id="builderTitle" class="lesson-input" value="${escapeHtml(builderTitle)}"
                       placeholder="vd: Động vật của con (để trống sẽ lấy tên bài mẫu)" />
            </label>
            <label class="lesson-field">
                <span>Nạp từ bài mẫu (tùy chọn)</span>
                <select id="templateSelect" class="lesson-input" aria-label="Chọn bài mẫu">${options}</select>
            </label>
            <p class="eyebrow">Tập từ của chủ đề (${builderWords.length})</p>
            <div class="word-chips">${chips || '<span class="muted">Chưa có từ. Chọn bài mẫu hoặc tìm thêm từ bên dưới.</span>'}</div>
            <div class="lesson-search">
                <input id="builderSearch" class="lesson-input" value="${escapeHtml(builderQuery)}"
                       placeholder="Tìm từ để thêm (vd: cat, màu, con chó)" />
                <button class="btn btn-outline btn-inline" data-action="builder-search" type="button"><i data-lucide="search"></i><span>Tìm</span></button>
            </div>
            ${results ? `<div class="word-chips">${results}</div>` : ''}
            <div style="margin-top:.85rem;display:flex;gap:.5rem;flex-wrap:wrap;">
                <button class="btn btn-primary btn-inline" data-action="create-lesson" type="button"><i data-lucide="plus"></i><span>Thêm vào lộ trình</span></button>
                <button class="btn btn-outline btn-inline" data-action="builder-reset" type="button"><span>Xóa hết</span></button>
            </div>
        </section>`;
}

function renderLessonsPanel() {
    if (!_data.lessons.length) {
        return `<section class="surface"><p class="muted">Bé chưa có bài học nào. Hãy tạo/thêm chủ đề ở khung trên (chọn bài mẫu hoặc tự thêm từ).</p></section>`;
    }
    return `
        <section class="surface" style="margin-bottom:1rem;">
            <div class="section-head"><h2>Lộ trình (${_data.lessons.length} bài)</h2></div>
            <div class="lesson-list">
                ${_data.lessons.map(renderLessonCard).join('')}
            </div>
        </section>`;
}

function renderLessonCard(lesson) {
    const isEditing = editorLessonId === lesson.lesson_id;
    const prog = LESSON_PROGRESS[lesson.progress] || LESSON_PROGRESS.new;
    const chips = (lesson.words || [])
        .map(w => {
            const cls = WORD_STATE[w.state] || WORD_STATE.new;
            const flag = w.forgets_meaning ? ' <span class="chip-flag" title="Bé hay quên nghĩa từ này">hay quên</span>' : '';
            return `<span class="word-chip ${cls}">${escapeHtml(w.word)} <small>(${escapeHtml(w.meaning_vi || '')})</small>${flag}</span>`;
        })
        .join('');
    const total = lesson.total || 0;
    const learned = lesson.learned || 0;
    const pct = total ? Math.round((learned * 100) / total) : 0;
    return `
        <article class="lesson-card surface" data-lesson="${escapeHtml(lesson.lesson_id)}">
            <div class="section-head compact-head">
                <div>
                    <strong>${escapeHtml(lesson.title || 'Bài học')}</strong>
                    <p class="muted">${escapeHtml(levelLabel(lesson.level))} · <span class="lesson-badge ${prog.cls}">${prog.label}</span></p>
                </div>
                <div style="display:flex;gap:.4rem;">
                    <button class="btn btn-outline btn-inline" data-action="edit-lesson" data-lesson="${escapeHtml(lesson.lesson_id)}" type="button"><i data-lucide="pencil"></i><span>Sửa từ</span></button>
                    <button class="btn btn-outline btn-inline" data-action="remove-lesson" data-lesson="${escapeHtml(lesson.lesson_id)}" type="button"><i data-lucide="trash-2"></i><span>Xóa</span></button>
                </div>
            </div>
            ${total ? `<div class="lesson-progress"><div class="lesson-progress-bar"><span style="width:${pct}%"></span></div><small>Đã thuộc ${learned}/${total} từ</small></div>` : ''}
            <div class="word-chips">${chips || '<span class="muted">Bài chưa có từ nào.</span>'}</div>
            ${isEditing ? renderEditor(lesson) : ''}
        </article>`;
}

function renderEditor(lesson) {
    const working = editWords
        .map(w => `<span class="word-chip">${escapeHtml(w.word)} <button data-action="remove-word" data-word="${escapeHtml(w.word_id)}" type="button" aria-label="Bỏ từ">×</button></span>`)
        .join('');
    const results = searchResults
        .map(w => `<button class="btn btn-outline btn-inline" data-action="add-word" data-word="${escapeHtml(w.word_id)}" type="button">+ ${escapeHtml(w.word)} <small>(${escapeHtml(w.meaning_vi || '')})</small></button>`)
        .join('');
    return `
        <div class="lesson-editor" style="margin-top:.75rem;border-top:1px solid var(--border,#eee);padding-top:.75rem;">
            <p class="eyebrow">Tên bài</p>
            <input id="editLessonTitle" class="lesson-input" value="${escapeHtml(editTitle)}" placeholder="Tên chủ đề"
                   style="margin-bottom:.7rem;max-width:360px;" />
            <p class="eyebrow">Tập từ của bài (theo thứ tự)</p>
            <div class="word-chips" style="margin-bottom:.5rem;">${working || '<span class="muted">Chưa chọn từ nào.</span>'}</div>
            <div class="lesson-search" style="margin-bottom:.5rem;">
                <input id="vocabSearch" class="lesson-input" placeholder="Tìm từ (vd: cat, màu)" value="${escapeHtml(searchQuery)}" />
                <button class="btn btn-outline btn-inline" data-action="search" type="button"><i data-lucide="search"></i><span>Tìm</span></button>
            </div>
            <div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-bottom:.5rem;">${results}</div>
            <div style="display:flex;gap:.5rem;">
                <button class="btn btn-primary btn-inline" data-action="save-edit" data-lesson="${escapeHtml(lesson.lesson_id)}" type="button"><i data-lucide="check"></i><span>Lưu</span></button>
                <button class="btn btn-outline btn-inline" data-action="cancel-edit" type="button"><span>Hủy</span></button>
            </div>
        </div>`;
}

function renderPronunciationReport() {
    const words = _data.pron.words || [];
    return `
        <section class="surface" style="margin-bottom:1rem;">
            <div class="section-head"><h2>Phát âm cần luyện</h2></div>
            ${words.length ? `
                <div class="report-rows">
                    ${words.map(w => {
                        const band = pronBand(w.avg_accuracy);
                        return `<div class="report-row">
                            <span class="band ${band.cls}">${band.label}</span>
                            <strong>${escapeHtml(w.reference_word || '')}</strong>
                            <small class="muted">đọc ${w.attempts || 0} lần</small>
                        </div>`;
                    }).join('')}
                </div>` : '<p class="muted">Chưa có dữ liệu phát âm. Khi bé đọc theo trong bài, kết quả sẽ hiện ở đây.</p>'}
        </section>`;
}

function renderVocabularyReport() {
    const words = _data.vocab.words || [];
    return `
        <section class="surface">
            <div class="section-head"><h2>Từ bé hay quên nghĩa</h2></div>
            ${words.length ? `
                <div class="report-rows">
                    ${words.map(w => `
                        <div class="report-row">
                            <span class="band is-poor">Hay quên</span>
                            <strong>${escapeHtml(w.word)} <small>(${escapeHtml(w.meaning_vi || '')})</small></strong>
                            <small class="muted">${(w.meaning_wrong_count || 0) > 0 ? `sai nghĩa ${w.meaning_wrong_count} lần` : 'cần ôn lại'}</small>
                        </div>`).join('')}
                </div>` : '<p class="muted">Chưa ghi nhận từ nào bé hay quên nghĩa.</p>'}
        </section>`;
}

function bindRoot() {
    const root = document.getElementById('curriculumRoot') || appElement;
    root.addEventListener('click', onClick);

    const editorSearch = document.getElementById('vocabSearch');
    if (editorSearch) {
        editorSearch.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') { event.preventDefault(); captureEditorInputs(); runSearch(); }
        });
    }
    const builderSearch = document.getElementById('builderSearch');
    if (builderSearch) {
        builderSearch.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') { event.preventDefault(); captureEditorInputs(); runBuilderSearch(); }
        });
    }
    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect) {
        templateSelect.addEventListener('change', (event) => {
            captureEditorInputs();
            loadTemplateIntoBuilder(event.target.value);
        });
    }
}

async function onClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    const childId = state.currentChild.user_id;

    if (action === 'back') {
        navigateTo(paths.child(childId));
        return;
    }
    if (action === 'builder-search') {
        captureEditorInputs();
        await runBuilderSearch();
        return;
    }
    if (action === 'builder-add-word') {
        captureEditorInputs();
        const wordId = target.getAttribute('data-word');
        const word = builderResults.find(w => w.word_id === wordId);
        if (word && !builderWords.some(w => w.word_id === wordId)) {
            builderWords = [...builderWords, { word_id: word.word_id, word: word.word, meaning_vi: word.meaning_vi }];
        }
        paint();
        return;
    }
    if (action === 'builder-remove-word') {
        captureEditorInputs();
        const wordId = target.getAttribute('data-word');
        builderWords = builderWords.filter(w => w.word_id !== wordId);
        paint();
        return;
    }
    if (action === 'builder-reset') {
        resetBuilder();
        paint();
        return;
    }
    if (action === 'create-lesson') {
        captureEditorInputs();
        const title = (builderTitle || '').trim();
        if (!title) {
            window.alert('Nhập tên chủ đề (hoặc chọn bài mẫu để lấy tên).');
            return;
        }
        if (!builderWords.length && !window.confirm('Chủ đề chưa có từ nào. Vẫn tạo bài rỗng?')) return;
        await guard(() => api.createChildLesson(childId, {
            title, level: 'pre_a1', word_ids: builderWords.map(w => w.word_id),
        }));
        await renderCurriculum();
        return;
    }
    if (action === 'remove-lesson') {
        const lessonId = target.getAttribute('data-lesson');
        if (!window.confirm('Xóa bài này khỏi lộ trình của bé?')) return;
        await guard(() => api.deleteChildLesson(childId, lessonId));
        await renderCurriculum();
        return;
    }
    if (action === 'edit-lesson') {
        const lessonId = target.getAttribute('data-lesson');
        const lesson = _data.lessons.find(l => l.lesson_id === lessonId);
        editorLessonId = lessonId;
        editWords = (lesson?.words || []).map(w => ({ ...w }));
        editTitle = lesson?.title || '';
        searchResults = [];
        searchQuery = '';
        paint();
        return;
    }
    if (action === 'cancel-edit') {
        editorLessonId = null;
        editWords = [];
        paint();
        return;
    }
    if (action === 'search') {
        captureEditorInputs();
        await runSearch();
        return;
    }
    if (action === 'add-word') {
        captureEditorInputs();
        const wordId = target.getAttribute('data-word');
        const word = searchResults.find(w => w.word_id === wordId);
        if (word && !editWords.some(w => w.word_id === wordId)) {
            editWords = [...editWords, { word_id: word.word_id, word: word.word, meaning_vi: word.meaning_vi }];
        }
        paint();
        return;
    }
    if (action === 'remove-word') {
        captureEditorInputs();
        const wordId = target.getAttribute('data-word');
        editWords = editWords.filter(w => w.word_id !== wordId);
        paint();
        return;
    }
    if (action === 'save-edit') {
        captureEditorInputs();
        const lessonId = target.getAttribute('data-lesson');
        const title = (editTitle || '').trim();
        await guard(() => api.updateChildLesson(childId, lessonId, {
            title: title || undefined,
            word_ids: editWords.map(w => w.word_id),
        }));
        await renderCurriculum();
        return;
    }
}

async function runSearch() {
    try {
        searchResults = await api.searchVocabulary(searchQuery);
    } catch {
        searchResults = [];
    }
    paint();
}

async function runBuilderSearch() {
    try {
        builderResults = await api.searchVocabulary(builderQuery);
    } catch {
        builderResults = [];
    }
    paint();
}

async function loadTemplateIntoBuilder(lessonId) {
    // Chọn bài mẫu -> NẠP tập từ của mẫu vào builder (gộp, không trùng) + lấy tên nếu đang để trống.
    if (!lessonId) return;
    const tpl = _data.templates.find(t => t.lesson_id === lessonId);
    let words = [];
    try {
        words = await api.getTemplateWords(lessonId);
    } catch {
        words = [];
    }
    const existing = new Set(builderWords.map(w => w.word_id));
    for (const w of words) {
        if (!existing.has(w.word_id)) {
            builderWords.push({ word_id: w.word_id, word: w.word, meaning_vi: w.meaning_vi });
            existing.add(w.word_id);
        }
    }
    if (!builderTitle.trim() && tpl) builderTitle = tpl.title;
    paint();
}

async function guard(fn) {
    try {
        await fn();
    } catch (error) {
        window.alert(error.message || 'Thao tác thất bại.');
    }
}
