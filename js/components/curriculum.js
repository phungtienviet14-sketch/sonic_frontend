import { api } from '../api.js';
import { navigateTo, paths } from '../navigation.js';
import { state } from '../state.js';
import { appElement } from './auth.js';
import { escapeHtml, refreshIcons } from '../utils.js';

// GĐ-Lesson — màn "Lộ trình bài học" cho phụ huynh: xem/sửa tập từ mỗi bài + 2 báo cáo.
// docs/bai_hoc_tieng_anh_co_kiem_soat.md. Theo pattern full re-render của app.

const STATUS_LABELS = { locked: 'Chưa mở', active: 'Đang học', done: 'Đã xong' };

let _data = { lessons: [], templates: [], pron: { words: [] }, vocab: { words: [] } };
let editorLessonId = null;   // bài đang mở trình sửa từ
let editWords = [];          // [{word_id, word, meaning_vi}] — tập từ đang sửa
let searchResults = [];
let searchQuery = '';

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
    const options = _data.templates
        .map(t => `<option value="${escapeHtml(t.lesson_id)}">${escapeHtml(t.title)} (${escapeHtml(t.level)})</option>`)
        .join('');
    return `
        <section class="surface" style="margin-bottom:1rem;">
            <div class="section-head"><h2>Thêm bài vào lộ trình</h2></div>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
                <select id="templateSelect" class="input" aria-label="Chọn bài mẫu">${options || '<option>Chưa có bài mẫu</option>'}</select>
                <button class="btn btn-primary btn-inline" data-action="assign-template" type="button">
                    <i data-lucide="plus"></i><span>Gán bài mẫu</span>
                </button>
            </div>
        </section>`;
}

function renderLessonsPanel() {
    if (!_data.lessons.length) {
        return `<section class="surface"><p class="muted">Bé chưa có bài học nào trong lộ trình. Hãy gán một bài mẫu ở trên.</p></section>`;
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
    const chips = (lesson.words || [])
        .map(w => `<span class="word-chip">${escapeHtml(w.word)} <small>(${escapeHtml(w.meaning_vi || '')})</small></span>`)
        .join('');
    return `
        <article class="lesson-card surface" data-lesson="${escapeHtml(lesson.lesson_id)}" style="padding:.75rem;margin-bottom:.5rem;">
            <div class="section-head compact-head">
                <div>
                    <strong>${escapeHtml(lesson.title || 'Bài học')}</strong>
                    <p class="muted">${escapeHtml(lesson.level || '')} · ${STATUS_LABELS[lesson.status] || escapeHtml(lesson.status || '')}</p>
                </div>
                <div style="display:flex;gap:.4rem;">
                    <button class="btn btn-outline btn-inline" data-action="edit-lesson" data-lesson="${escapeHtml(lesson.lesson_id)}" type="button"><i data-lucide="pencil"></i><span>Sửa từ</span></button>
                    <button class="btn btn-outline btn-inline" data-action="remove-lesson" data-lesson="${escapeHtml(lesson.lesson_id)}" type="button"><i data-lucide="trash-2"></i><span>Xóa</span></button>
                </div>
            </div>
            <div class="word-chips" style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem;">
                ${chips || '<span class="muted">Bài chưa có từ nào.</span>'}
            </div>
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
            <p class="eyebrow">Tập từ của bài (theo thứ tự)</p>
            <div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-bottom:.5rem;">${working || '<span class="muted">Chưa chọn từ nào.</span>'}</div>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-bottom:.5rem;">
                <input id="vocabSearch" class="input" placeholder="Tìm từ (vd: cat, màu)" value="${escapeHtml(searchQuery)}" />
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
            <div class="section-head"><h2>Điểm yếu phát âm</h2></div>
            ${words.length ? `
                <div class="report-rows">
                    ${words.map(w => `
                        <div class="alert-row ${accuracyClass(w.avg_accuracy)}">
                            <strong>${escapeHtml(w.reference_word || '')}</strong>
                            <p>Điểm phát âm trung bình: ${w.avg_accuracy ?? '—'}/100 · đọc ${w.attempts || 0} lần</p>
                        </div>`).join('')}
                </div>` : '<p class="muted">Chưa có dữ liệu phát âm. Khi bé đọc theo trong bài học, điểm sẽ hiện ở đây.</p>'}
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
                        <div class="alert-row ${(w.meaning_wrong_count || 0) >= 2 ? 'high' : 'medium'}">
                            <strong>${escapeHtml(w.word)} <small>(${escapeHtml(w.meaning_vi || '')})</small></strong>
                            <p>Sai nghĩa ${w.meaning_wrong_count || 0} lần · độ nhớ ${w.strength_score ?? 0}/100</p>
                        </div>`).join('')}
                </div>` : '<p class="muted">Chưa ghi nhận từ nào bé hay quên nghĩa.</p>'}
        </section>`;
}

function accuracyClass(accuracy) {
    if (accuracy == null) return 'medium';
    if (accuracy < 50) return 'high';
    if (accuracy < 70) return 'medium';
    return 'low';
}

function bindRoot() {
    const root = document.getElementById('curriculumRoot') || appElement;
    root.addEventListener('click', onClick);
    const searchInput = document.getElementById('vocabSearch');
    if (searchInput) {
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchQuery = searchInput.value;
                runSearch();
            }
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
    if (action === 'assign-template') {
        const select = document.getElementById('templateSelect');
        const templateId = select && select.value;
        if (!templateId) return;
        await guard(() => api.assignLessonTemplate(childId, templateId));
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
        const input = document.getElementById('vocabSearch');
        searchQuery = input ? input.value : '';
        await runSearch();
        return;
    }
    if (action === 'add-word') {
        const wordId = target.getAttribute('data-word');
        const word = searchResults.find(w => w.word_id === wordId);
        if (word && !editWords.some(w => w.word_id === wordId)) {
            editWords = [...editWords, { word_id: word.word_id, word: word.word, meaning_vi: word.meaning_vi }];
            paint();
        }
        return;
    }
    if (action === 'remove-word') {
        const wordId = target.getAttribute('data-word');
        editWords = editWords.filter(w => w.word_id !== wordId);
        paint();
        return;
    }
    if (action === 'save-edit') {
        const lessonId = target.getAttribute('data-lesson');
        await guard(() => api.updateChildLesson(childId, lessonId, { word_ids: editWords.map(w => w.word_id) }));
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

async function guard(fn) {
    try {
        await fn();
    } catch (error) {
        window.alert(error.message || 'Thao tác thất bại.');
    }
}
