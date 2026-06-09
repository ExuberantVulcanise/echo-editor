/**
 * editor/script.js
 * Library.js Generator — edits and exports library.js for the downloads app.
 * No import needed here; this tool generates the library.js file you download.
 */

// ── Type metadata ──────────────────────────────────────────────────────────
const TYPE_ICON = {
    folder:  '📁',
    audio:   '🎵',
    image:   '🖼',
    archive: '🗜',
    pdf:     '📄',
    apk:     '📦',
    file:    '📋'
};

const TYPE_LABEL_JP = {
    folder:  'フォルダ',
    audio:   '音楽',
    image:   '画像',
    archive: '圧縮',
    pdf:     '文書',
    apk:     'アプリ',
    file:    'ファイル'
};

const ALL_TYPES = ['folder', 'audio', 'image', 'archive', 'pdf', 'apk', 'file'];

// ── Initial library state ──────────────────────────────────────────────────
// This mirrors the default library.js so edits feel continuous.
let library = {
    name: 'ダウンロード',
    type: 'folder',
    items: [
        {
            name: 'NBA YoungBoy', type: 'folder',
            items: [
                { name: 'The Third Ft. YoungBoy Never Broke Again.mp3', type: 'audio', url: 'https://example.com', size: '8.1 MB', date: '2024-10-14' }
            ]
        },
        { name: 'Chief Keef',    type: 'folder', items: [] },
        { name: 'Playboi Carti', type: 'folder', items: [] },
        { name: 'Download Dump 001.rar', type: 'archive', url: 'https://example.com', size: '213 MB',  date: '2024-09-30' },
        { name: 'cover.webp',            type: 'image',   thumbnail: 'https://picsum.photos/200', size: '340 KB',  date: '2024-10-01' },
        { name: 'mihon-v0.19.9.apk',     type: 'apk',     url: 'https://example.com', size: '19.7 MB', date: '2024-11-03' },
        { name: 'proton-recovery-kit.pdf', type: 'pdf',   url: 'https://example.com', size: '1.2 MB',  date: '2024-08-22' }
    ]
};

// ── State ──────────────────────────────────────────────────────────────────
let selectedPath = null;   // array of indices into library.items recursively
let addingMode   = null;   // 'file' | 'folder' | null

// ── DOM refs ───────────────────────────────────────────────────────────────
const fileTree  = document.getElementById('fileTree');
const pathBar   = document.getElementById('pathBar');
const formLabel = document.getElementById('formLabel');
const formArea  = document.getElementById('formArea');
const codeOut   = document.getElementById('codeOut');
const btnDelete = document.getElementById('btnDelete');

// ── Tree navigation ────────────────────────────────────────────────────────
function getNode(path) {
    if (!path || path.length === 0) return library;
    let node = library;
    for (const idx of path) node = node.items[idx];
    return node;
}

function getParentAndIndex(path) {
    const parent = getNode(path.slice(0, -1));
    return { parent, idx: path[path.length - 1] };
}

// ── Render tree ────────────────────────────────────────────────────────────
function renderTree() {
    fileTree.innerHTML = '';
    walkTree(library, [], 0);
    btnDelete.style.display = selectedPath ? 'inline-block' : 'none';
    renderPathBar();
    renderCode();
}

function walkTree(node, path, depth) {
    if (depth > 0) {
        const isSelected = selectedPath && JSON.stringify(selectedPath) === JSON.stringify(path);
        const row = document.createElement('div');
        row.className = 'tree-item' + (isSelected ? ' selected' : '');
        row.style.paddingLeft = (isSelected ? 7 : 10) + (depth - 1) * 16 + 'px';

        const stamp = TYPE_LABEL_JP[node.type] || node.type;
        row.innerHTML =
            `<span class="tree-icon">${TYPE_ICON[node.type] || '📋'}</span>` +
            `<span class="tree-name" title="${node.name}">${node.name}</span>` +
            `<span class="tree-stamp">${stamp}</span>`;

        row.addEventListener('click', () => selectItem(path));
        fileTree.appendChild(row);
    }

    if (node.type === 'folder' && node.items) {
        node.items.forEach((child, i) => walkTree(child, [...path, i], depth + 1));
    }
}

function renderPathBar() {
    pathBar.innerHTML = '';
    const segs = [library.name];
    if (selectedPath) {
        let node = library;
        for (const idx of selectedPath) {
            node = node.items[idx];
            segs.push(node.name);
        }
    }
    segs.forEach((s, i) => {
        const span = document.createElement('span');
        span.className = 'path-seg';
        span.textContent = s;
        pathBar.appendChild(span);
        if (i < segs.length - 1) {
            const sep = document.createElement('span');
            sep.className = 'path-sep';
            sep.textContent = ' ＞ ';
            pathBar.appendChild(sep);
        }
    });
}

// ── Selection ──────────────────────────────────────────────────────────────
function selectItem(path) {
    selectedPath = path;
    addingMode   = null;
    renderTree();
    renderEditForm();
}

// ── Edit form ──────────────────────────────────────────────────────────────
function renderEditForm() {
    if (!selectedPath) {
        formLabel.textContent = 'アイテムを選択';
        formArea.innerHTML =
            `<div class="empty-state">
                <span class="empty-kanji">選</span>
                <span class="empty-text">ツリーからアイテムを選択するか、新規追加してください</span>
            </div>`;
        return;
    }
    const node = getNode(selectedPath);
    formLabel.textContent = '編集: ' + node.name;
    formArea.innerHTML = buildForm(node, 'edit');
}

function buildForm(node, mode) {
    const isEdit   = mode === 'edit';
    const typeOpts = ALL_TYPES.map(t =>
        `<option value="${t}"${node.type === t ? ' selected' : ''}>${t} — ${TYPE_LABEL_JP[t]}</option>`
    ).join('');

    return `<div class="form-wrap">
        <div class="form-group">
            <label class="form-label">名前 / Name</label>
            <input class="form-input" id="f_name" value="${esc(node.name)}" placeholder="ファイル名またはフォルダ名">
        </div>
        <div class="form-group">
            <label class="form-label">タイプ / Type</label>
            <select class="form-input" id="f_type" onchange="swapExtra(this.value, ${JSON.stringify(node)})">
                ${typeOpts}
            </select>
        </div>
        <div id="f_extra">${buildExtra(node)}</div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">サイズ / Size（任意）</label>
                <input class="form-input" id="f_size" value="${esc(node.size || '')}" placeholder="例: 4.2 MB">
            </div>
            <div class="form-group">
                <label class="form-label">日付 / Date（任意）</label>
                <input class="form-input" id="f_date" value="${esc(node.date || '')}" placeholder="例: 2024-11-03">
            </div>
        </div>
        <div class="form-actions">
            <button class="btn-primary" onclick="${isEdit ? 'saveEdit()' : 'saveNew()'}">
                ${isEdit ? '保存' : '追加'}
            </button>
            <button class="btn-outline" onclick="cancelForm()">キャンセル</button>
        </div>
    </div>`;
}

function buildExtra(node) {
    if (node.type === 'folder') return '';
    if (node.type === 'image') {
        return `<div class="form-group">
            <label class="form-label">サムネイル URL / Thumbnail URL</label>
            <input class="form-input" id="f_thumb" value="${esc(node.thumbnail || '')}" placeholder="https://...">
        </div>`;
    }
    return `<div class="form-group">
        <label class="form-label">URL</label>
        <input class="form-input" id="f_url" value="${esc(node.url || '')}" placeholder="https://...">
    </div>`;
}

function swapExtra(type, originalNode) {
    document.getElementById('f_extra').innerHTML = buildExtra({ type, url: originalNode.url || '', thumbnail: originalNode.thumbnail || '' });
}

function collectFormData() {
    const name = document.getElementById('f_name').value.trim();
    const type = document.getElementById('f_type').value;
    const size = document.getElementById('f_size').value.trim();
    const date = document.getElementById('f_date').value.trim();
    const urlEl   = document.getElementById('f_url');
    const thumbEl = document.getElementById('f_thumb');

    const obj = { name, type };
    if (type === 'folder') {
        obj.items = [];
    } else if (type === 'image') {
        if (thumbEl) obj.thumbnail = thumbEl.value.trim();
    } else {
        if (urlEl) obj.url = urlEl.value.trim();
    }
    if (size) obj.size = size;
    if (date) obj.date = date;
    return obj;
}

// ── Save / Add / Delete ────────────────────────────────────────────────────
function saveEdit() {
    if (!selectedPath) return;
    const data = collectFormData();
    if (!data.name) { alert('名前を入力してください。'); return; }

    const { parent, idx } = getParentAndIndex(selectedPath);
    const existing = parent.items[idx];
    // Preserve child items if it stays a folder
    if (existing.type === 'folder' && data.type === 'folder') {
        data.items = existing.items || [];
    }
    parent.items[idx] = { ...existing, ...data };

    toast('変更を保存しました');
    renderTree();
    renderEditForm();
}

function openAdd(kind) {
    selectedPath = null;
    addingMode   = kind;
    renderTree();
    formLabel.textContent = kind === 'folder' ? '新しいフォルダ' : '新しいファイル';
    const dummy = { name: '', type: kind === 'folder' ? 'folder' : 'file', url: '', thumbnail: '', size: '', date: '' };
    formArea.innerHTML = buildForm(dummy, 'add');
    if (kind === 'folder') document.getElementById('f_type').value = 'folder';
}

function saveNew() {
    const data = collectFormData();
    if (!data.name) { alert('名前を入力してください。'); return; }
    library.items.push(data);
    selectedPath = [library.items.length - 1];
    addingMode   = null;
    toast('アイテムを追加しました');
    renderTree();
    renderEditForm();
}

function deleteSelected() {
    if (!selectedPath) return;
    const node = getNode(selectedPath);
    if (!confirm(`「${node.name}」を削除しますか？`)) return;
    const { parent, idx } = getParentAndIndex(selectedPath);
    parent.items.splice(idx, 1);
    selectedPath = null;
    toast('削除しました');
    renderTree();
    renderEditForm();
}

function cancelForm() {
    selectedPath = null;
    addingMode   = null;
    renderTree();
    renderEditForm();
}

// ── Code generation ────────────────────────────────────────────────────────
function renderCode() {
    codeOut.textContent = generateCode();
}

function generateCode() {
    const now = new Date().toISOString().slice(0, 10);
    return [
        `/**`,
        ` * library.js — File Library Data`,
        ` * Last generated: ${now}`,
        ` *`,
        ` * Supported types: folder, audio, image, archive, pdf, apk, file`,
        ` * Edit this file or use the generator at editor/index.html`,
        ` */`,
        ``,
        `export const library = ${serializeNode(library, 0)};`
    ].join('\n');
}

function serializeNode(node, depth) {
    const pad  = '    '.repeat(depth + 1);
    const cpad = '    '.repeat(depth);

    const lines = [];
    lines.push(`${pad}name: ${JSON.stringify(node.name)}`);
    lines.push(`${pad}type: ${JSON.stringify(node.type)}`);
    if (node.url)       lines.push(`${pad}url: ${JSON.stringify(node.url)}`);
    if (node.thumbnail) lines.push(`${pad}thumbnail: ${JSON.stringify(node.thumbnail)}`);
    if (node.size)      lines.push(`${pad}size: ${JSON.stringify(node.size)}`);
    if (node.date)      lines.push(`${pad}date: ${JSON.stringify(node.date)}`);

    if (node.type === 'folder') {
        if (!node.items || node.items.length === 0) {
            lines.push(`${pad}items: []`);
        } else {
            const children = node.items
                .map(child => `${pad}    ` + serializeNode(child, depth + 1).trimStart())
                .join(',\n');
            lines.push(`${pad}items: [\n${children}\n${pad}]`);
        }
    }

    return `{\n${lines.join(',\n')}\n${cpad}}`;
}

// ── Actions ────────────────────────────────────────────────────────────────
function copyCode() {
    navigator.clipboard.writeText(generateCode())
        .then(() => toast('クリップボードにコピーしました'));
}

function downloadCode() {
    const blob = new Blob([generateCode()], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'library.js';
    a.click();
    toast('library.js をダウンロードしました');
}

// ── Utils ──────────────────────────────────────────────────────────────────
function esc(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

let toastTimer;
function toast(msg) {
    const el = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ── Boot ───────────────────────────────────────────────────────────────────
renderTree();
renderEditForm();
