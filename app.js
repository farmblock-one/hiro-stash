const KEY = 'hiro-stash-v1';
const $ = s => document.querySelector(s);
let ideas = load();
let topic = null, query = '', editId = null;

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
function save() { localStorage.setItem(KEY, JSON.stringify(ideas)); render(); }
const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const parseTopics = s => [...new Set(s.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))];

function allTopics() {
  const m = {};
  ideas.forEach(i => i.topics.forEach(t => m[t] = (m[t] || 0) + 1));
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function visible() {
  const q = query.toLowerCase();
  return ideas.filter(i =>
    (topic === null || (topic === '★' ? i.fav : i.topics.includes(topic))) &&
    (!q || (i.text + ' ' + i.source + ' ' + i.topics.join(' ')).toLowerCase().includes(q))
  ).sort((a, b) => b.created - a.created);
}

function render() {
  const items = [['', ideas.length, null], ['★ Yêu thích', ideas.filter(i => i.fav).length, '★'],
    ...allTopics().map(([t, n]) => [t, n, t])];
  $('#topics').innerHTML = items.map(([label, n, key]) =>
    `<li data-t="${key === null ? '' : esc(key)}" class="${topic === key ? 'active' : ''}">` +
    `<span>${esc(label || 'Tất cả')}</span><span>${n}</span></li>`).join('');
  $('#topic-list').innerHTML = allTopics().map(([t]) => `<option value="${esc(t)}">`).join('');
  const v = visible();
  $('#stats').textContent = `${v.length} ý tưởng`;
  $('#cards').innerHTML = v.length ? v.map(card).join('') :
    '<div class="empty">Chưa có ý tưởng nào. Bấm “+ Thêm ý tưởng” để bắt đầu.</div>';
}

function card(i) {
  return `<div class="card" data-id="${i.id}"><p>${esc(i.text)}</p>` +
    (i.source ? `<div class="src">📖 ${esc(i.source)}</div>` : '') +
    `<div class="tags">${i.topics.map(t => `<span class="tag" data-t="${esc(t)}">#${esc(t)}</span>`).join('')}</div>` +
    `<div class="acts"><button class="fav ${i.fav ? 'on' : ''}" data-a="fav">${i.fav ? '★' : '☆'}</button>` +
    `<button data-a="edit">✎</button><button data-a="del">🗑</button></div></div>`;
}

function openForm(i) {
  editId = i ? i.id : null;
  $('#dlg-title').textContent = i ? 'Sửa ý tưởng' : 'Ý tưởng mới';
  $('#f-text').value = i ? i.text : '';
  $('#f-topics').value = i ? i.topics.join(', ') : (topic && topic !== '★' ? topic : '');
  $('#f-source').value = i ? i.source : '';
  $('#dlg').showModal();
  $('#f-text').focus();
}

$('#btn-add').onclick = () => openForm();
$('#f-cancel').onclick = () => $('#dlg').close();
$('#form').onsubmit = () => {
  const data = { text: $('#f-text').value.trim(), topics: parseTopics($('#f-topics').value), source: $('#f-source').value.trim() };
  if (!data.text) return;
  if (editId) Object.assign(ideas.find(i => i.id === editId), data);
  else ideas.push({ id: crypto.randomUUID(), fav: false, created: Date.now(), ...data });
  save();
};

$('#search').oninput = e => { query = e.target.value; render(); };
$('#topics').onclick = e => {
  const li = e.target.closest('li'); if (!li) return;
  topic = li.dataset.t === '' ? null : li.dataset.t; render();
};
$('#cards').onclick = e => {
  const tag = e.target.closest('.tag');
  if (tag) { topic = tag.dataset.t; return render(); }
  const b = e.target.closest('button[data-a]'); if (!b) return;
  const i = ideas.find(x => x.id === b.closest('.card').dataset.id);
  if (b.dataset.a === 'fav') { i.fav = !i.fav; save(); }
  else if (b.dataset.a === 'edit') openForm(i);
  else if (confirm('Xóa ý tưởng này?')) { ideas = ideas.filter(x => x !== i); save(); }
};

function showReview() {
  const pool = visible();
  if (!pool.length) return alert('Chưa có ý tưởng để ôn.');
  const i = pool[Math.floor(Math.random() * pool.length)];
  $('#review-card').innerHTML = `<p>${esc(i.text)}</p>` + (i.source ? `<div class="src">📖 ${esc(i.source)}</div>` : '');
  if (!$('#review').open) $('#review').showModal();
}
$('#btn-review').onclick = showReview;
$('#r-next').onclick = showReview;
$('#r-close').onclick = () => $('#review').close();

$('#btn-export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(ideas, null, 2)], { type: 'application/json' }));
  a.download = `hiro-stash-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
};
$('#btn-import').onclick = () => $('#file').click();
$('#file').onchange = async e => {
  try {
    const data = JSON.parse(await e.target.files[0].text());
    const ids = new Set(ideas.map(i => i.id));
    const fresh = data.filter(i => i && i.id && i.text && !ids.has(i.id))
      .map(i => ({ fav: false, created: Date.now(), source: '', topics: [], ...i }));
    ideas.push(...fresh); save(); alert(`Đã nhập ${fresh.length} ý tưởng.`);
  } catch { alert('File không hợp lệ.'); }
  e.target.value = '';
};

render();
