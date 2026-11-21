// GTA VI trophy guide and tracker: a checklist saved in the browser, filters by kind,
// a spoiler setting for story trophies, export and import of progress, and a platinum
// roadmap. All data lives in data/trophies.json; nothing is fetched over the network.
const KEY = 'gta6-trophy-guide-v1';
const params = new URLSearchParams(location.search);
// Compact view for screenshots (?compact=1): hide the hero, roadmap and footer so the
// trophy list itself fills the frame. The list, filters and spoiler setting are unchanged.
if (params.get('compact') === '1') document.body.classList.add('compact');

const list = document.getElementById('list');
const stagesEl = document.getElementById('stages');
const earnedCount = document.getElementById('earnedCount');
const barFill = document.getElementById('barFill');
const progressNote = document.getElementById('progressNote');
const gradeCounts = document.getElementById('gradeCounts');
const stats = document.getElementById('stats');
const searchInput = document.getElementById('search');
const spoilerInput = document.getElementById('spoiler');
const filtersEl = document.getElementById('filters');

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const sources = doc.sources;

let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { saved = {}; }
let earned = new Set(Array.isArray(saved.earned) ? saved.earned : []);
// Screenshot setup from the URL (?checked=2,3&open=17&spoiler=1&filter=missable&view=roadmap)
// sets the state for this load only; it is never written to localStorage.
const shotChecked = params.get('checked');
if (shotChecked) earned = new Set(shotChecked.split(',').map(Number).filter((n) => trophies.some((t) => t.id === n)));
let spoiler = saved.spoiler === true || params.get('spoiler') === '1';
let filter = params.get('filter') || 'all';
let query = '';
// Jump to the ?open trophy only on the first render (see render()).
let scrolledToOpen = false;

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ earned: [...earned], spoiler })); } catch { /* private mode */ }
}

function gradeLabel(g) {
  return g === 'platinum' ? 'Platinum' : g === 'gold' ? 'Gold' : g === 'silver' ? 'Silver' : 'Bronze';
}

function trophyCard(t) {
  const isEarned = earned.has(t.id);
  const hidden = spoiler && t.kind === 'story' && !isEarned;
  const card = document.createElement('article');
  card.className = `card grade-${t.grade}${isEarned ? ' earned' : ''}`;
  card.id = `trophy-${t.id}`;

  const head = document.createElement('div');
  head.className = 'card-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned;
  box.setAttribute('aria-label', `Mark ${t.name} earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.id); else earned.delete(t.id);
    save();
    render();
  });
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = gradeLabel(t.grade);
  const name = document.createElement('h3');
  name.textContent = hidden ? 'Hidden story trophy' : t.name;
  head.append(box, badge, name);
  card.append(head);

  const desc = document.createElement('p');
  desc.className = 'official';
  desc.textContent = hidden ? 'Earn this trophy to reveal its official name and description.' : t.description;
  card.append(desc);

  const tags = document.createElement('p');
  tags.className = 'tags';
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = t.kind === 'platinum' ? 'Platinum' : t.kind === 'story' ? 'Story' : t.kind === 'collectibles' ? 'Collectible' : 'Activity';
  tags.append(kindTag);
  const stageTag = document.createElement('span');
  stageTag.className = 'tag';
  stageTag.textContent = `Roadmap stage ${t.stage}`;
  tags.append(stageTag);
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'tag missable';
    m.textContent = 'Possibly missable';
    tags.append(m);
  }
  card.append(tags);

  if (!hidden) {
    const guide = document.createElement('p');
    guide.className = 'guide';
    guide.textContent = t.guide;
    card.append(guide);
    const src = document.createElement('p');
    src.className = 'sources';
    src.textContent = 'Sources: ';
    (t.src || []).forEach((key, i) => {
      const s = sources[key];
      if (!s) return;
      if (i > 0) src.append(document.createTextNode(' · '));
      const a = document.createElement('a');
      a.href = s.url;
      a.textContent = s.label;
      a.target = '_blank';
      a.rel = 'noopener';
      src.append(a);
    });
    card.append(src);
  }
  return card;
}

function renderRoadmap() {
  stagesEl.replaceChildren();
  for (const s of doc.stages) {
    const count = trophies.filter((t) => t.stage === s.n).length;
    const card = document.createElement('div');
    card.className = 'stage';
    const h = document.createElement('h3');
    h.textContent = `Stage ${s.n} — ${s.title}`;
    const c = document.createElement('p');
    c.className = 'stage-count';
    c.textContent = `${count} trophies`;
    const p = document.createElement('p');
    p.textContent = s.text;
    card.append(h, c, p);
    stagesEl.append(card);
  }
}

function render() {
  const shown = trophies.filter((t) => {
    if (filter === 'missable' && !t.missable) return false;
    if (filter !== 'all' && filter !== 'missable' && t.kind !== filter) return false;
    if (query) {
      const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
  list.replaceChildren(...shown.map(trophyCard));

  const n = earned.size;
  earnedCount.textContent = String(n);
  barFill.style.width = `${Math.round((n / trophies.length) * 100)}%`;
  progressNote.textContent = n === 0
    ? '0% — the platinum is a long road. Start with the story.'
    : n === trophies.length
      ? '100% — Leonida Legend. The platinum is yours.'
      : `${Math.round((n / trophies.length) * 100)}% — ${trophies.length - n} to go.`;
  const counts = {};
  for (const t of trophies) if (earned.has(t.id)) counts[t.grade] = (counts[t.grade] || 0) + 1;
  gradeCounts.textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${counts[g] || 0} ${gradeLabel(g)}`)
    .join(' · ');
  const missableLeft = trophies.filter((t) => t.missable && !earned.has(t.id)).length;
  stats.textContent = shown.length === trophies.length
    ? `${n} of ${trophies.length} earned · ${missableLeft} possibly-missable trophy still open · no online trophies`
    : `Showing ${shown.length} of ${trophies.length} trophies · ${n} earned`;
  filtersEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.kind === filter));
  spoilerInput.checked = spoiler;
  // Jump to the ?open trophy only on the first render: re-rendering after a checkbox
  // toggle must not yank the page back to it.
  if (!scrolledToOpen) {
    scrolledToOpen = true;
    const open = params.get('open');
    if (open) document.getElementById(`trophy-${open}`)?.scrollIntoView({ block: 'center' });
  }
}

filtersEl.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-kind]');
  if (!b) return;
  filter = b.dataset.kind;
  render();
});
searchInput.addEventListener('input', () => { query = searchInput.value.trim().toLowerCase(); render(); });
spoilerInput.addEventListener('change', () => { spoiler = spoilerInput.checked; save(); render(); });

document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ earned: [...earned].sort((x, y) => x - y) }, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
});
document.getElementById('reset').addEventListener('click', () => {
  if (!earned.size) return;
  if (!confirm('Clear all earned trophies? This cannot be undone.')) return;
  earned = new Set();
  save();
  render();
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = new Set((Array.isArray(data) ? data : data.earned || []).map(Number));
    earned = new Set(trophies.map((t) => t.id).filter((id) => ids.has(id)));
    save();
    render();
  } catch { alert('That file is not a trophy progress export.'); }
});

function updateFilterCounts() {
  const counts = {
    all: trophies.length,
    story: trophies.filter((t) => t.kind === 'story').length,
    missable: trophies.filter((t) => t.missable).length,
    collectibles: trophies.filter((t) => t.kind === 'collectibles').length,
    activities: trophies.filter((t) => t.kind === 'activities').length,
  };
  const labels = { all: 'All', story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities' };
  filtersEl.querySelectorAll('button').forEach((b) => {
    b.textContent = `${labels[b.dataset.kind]} (${counts[b.dataset.kind]})`;
  });
}

const sourceList = document.getElementById('sourceList');
sourceList.replaceChildren(...Object.values(sources).map((s) => {
  const a = document.createElement('a');
  a.href = s.url;
  a.textContent = s.label;
  a.target = '_blank';
  a.rel = 'noopener';
  const span = document.createElement('span');
  span.append(a, document.createTextNode(' · '));
  return span;
}));

renderRoadmap();
updateFilterCounts();
render();
if (params.get('view') === 'roadmap') document.getElementById('roadmap')?.scrollIntoView();
