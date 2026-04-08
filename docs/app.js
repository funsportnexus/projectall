const state = {
  raw: [],
  filtered: []
};

const els = {
  reloadBtn: document.getElementById('reloadBtn'),
  projectTitle: document.getElementById('projectTitle'),
  generatedAt: document.getElementById('generatedAt'),
  stats: document.getElementById('stats'),
  searchInput: document.getElementById('searchInput'),
  eventFilter: document.getElementById('eventFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  statusFilter: document.getElementById('statusFilter'),
  priorityFilter: document.getElementById('priorityFilter'),
  taskTableBody: document.getElementById('taskTableBody'),
  emptyState: document.getElementById('emptyState')
};

init();

function init() {
  bindEvents();
  load();
}

function bindEvents() {
  els.reloadBtn.addEventListener('click', load);
  [els.searchInput, els.eventFilter, els.categoryFilter, els.statusFilter, els.priorityFilter]
    .forEach(el => el.addEventListener('input', applyFilters));
}

async function load() {
  try {
    const res = await fetch('./data/tasks.json?ts=' + Date.now());
    if (!res.ok) throw new Error('tasks.json の取得に失敗しました');
    const data = await res.json();
    state.raw = Array.isArray(data.items) ? data.items : [];
    els.projectTitle.textContent = data.project_title || 'fun sport nexus master';
    els.generatedAt.textContent = data.generated_at ? `最終更新: ${formatDateTime(data.generated_at)}` : '最終更新: 未取得';
    hydrateSelect(els.eventFilter, uniq(state.raw.map(x => x.event).filter(Boolean)), 'すべて');
    hydrateSelect(els.categoryFilter, uniq(state.raw.map(x => x.category).filter(Boolean)), 'すべて');
    hydrateSelect(els.statusFilter, uniq(state.raw.map(x => x.status).filter(Boolean)), 'すべて');
    hydrateSelect(els.priorityFilter, uniq(state.raw.map(x => x.priority).filter(Boolean)), 'すべて');
    applyFilters();
  } catch (err) {
    els.projectTitle.textContent = '読み込みエラー';
    els.generatedAt.textContent = err.message;
    state.raw = [];
    applyFilters();
  }
}

function hydrateSelect(el, values, allLabel) {
  const current = el.value || 'all';
  el.innerHTML = `<option value="all">${allLabel}</option>` + values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  el.value = values.includes(current) ? current : 'all';
}

function applyFilters() {
  const q = (els.searchInput.value || '').trim().toLowerCase();
  state.filtered = state.raw.filter(item => {
    if (els.eventFilter.value !== 'all' && item.event !== els.eventFilter.value) return false;
    if (els.categoryFilter.value !== 'all' && item.category !== els.categoryFilter.value) return false;
    if (els.statusFilter.value !== 'all' && item.status !== els.statusFilter.value) return false;
    if (els.priorityFilter.value !== 'all' && item.priority !== els.priorityFilter.value) return false;
    if (!q) return true;
    const hay = [item.title, item.owner, item.notes, item.body, ...(item.assignees || [])].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });
  renderStats();
  renderTable();
}

function renderStats() {
  const total = state.raw.length;
  const open = state.raw.filter(x => (x.state || '').toUpperCase() !== 'CLOSED' && x.status !== 'Done').length;
  const done = state.raw.filter(x => x.status === 'Done' || (x.state || '').toUpperCase() === 'CLOSED').length;
  const high = state.raw.filter(x => x.priority === 'High' && x.status !== 'Done').length;
  const visible = state.filtered.length;
  const stats = [
    ['全件数', total],
    ['表示中', visible],
    ['未完了', open],
    ['完了', done],
    ['High未完了', high]
  ];
  els.stats.innerHTML = stats.map(([label, value]) => `
    <div class="stat">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    </div>
  `).join('');
}

function renderTable() {
  els.taskTableBody.innerHTML = '';
  if (!state.filtered.length) {
    els.emptyState.classList.remove('hidden');
    return;
  }
  els.emptyState.classList.add('hidden');
  const rows = state.filtered
    .slice()
    .sort((a, b) => String(a.due || '9999-99-99').localeCompare(String(b.due || '9999-99-99')))
    .map(item => {
      const title = item.url ? `<a class="title-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title || '(無題)')}</a>` : `<span class="title-link">${escapeHtml(item.title || '(無題)')}</span>`;
      const sub = [item.issue_number ? `Issue #${item.issue_number}` : '', item.notes || ''].filter(Boolean).join(' / ');
      return `
        <tr>
          <td>${title}${sub ? `<span class="sub">${escapeHtml(sub)}</span>` : ''}</td>
          <td>${tag(item.event)}</td>
          <td>${tag(item.category)}</td>
          <td>${tag(item.status)}</td>
          <td>${tag(item.priority)}</td>
          <td>${escapeHtml(item.due || '-')}</td>
          <td>${escapeHtml(item.owner || (item.assignees || []).join(', ') || '-')}</td>
        </tr>
      `;
    }).join('');
  els.taskTableBody.innerHTML = rows;
}

function tag(value) {
  return value ? `<span class="tag">${escapeHtml(value)}</span>` : '-';
}

function uniq(arr) {
  return [...new Set(arr)].sort((a, b) => String(a).localeCompare(String(b), 'ja'));
}

function formatDateTime(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString('ja-JP');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
