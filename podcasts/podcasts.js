// אוזניים גדולות: קטלוג סטטי (data/podcasts.json, נבנה ב-scripts/podcasts/build_podcasts.py)
// + <audio> יחיד מול ה-mp3 של המארח המקורי. פאנל נגן אחד שעובר בין המסך הראשי למסך
// הפודקאסט, ופס תחתון כשהפאנל לא על המסך. ההתקדמות לכל פרופיל נשמרת דרך storage.js.
import { read, write } from '../js/storage.js?v=2';
import { isMuted } from '../js/synth.js?v=1';

const NS = 'podcasts.v1';
const SAVE_EVERY_MS = 10000;
const DONE_RATIO = 0.95;
const PAGE = 20;
const SKIP = 10;
const DECK_SIZE = 8;
const NO_SEASON = 'extra';

// ---------- צלילים ----------
// 4 צלילים רכים (scripts/podcasts/sounds.txt → ElevenLabs, מנורמלים ב-loudnorm ל-‎-20 LUFS).
// ההשתקה משותפת לפורטל (sound.muted).
const SFX = {
  tap: ['pod_tap', 0.55],
  play: ['pod_play', 0.6],
  magic: ['surprise_magic', 0.55],
  ding: ['heard_ding', 0.65],
};
const sfxCache = {};
let muted = false;
isMuted().then((m) => { muted = m; }).catch(() => {});
function sfx(name) {
  if (muted) return;
  const [file, vol] = SFX[name];
  sfxCache[name] ||= Object.assign(new Audio(`sfx/${file}.mp3`), { preload: 'auto' });
  const a = sfxCache[name].cloneNode();
  a.volume = vol;
  a.play().catch(() => {});
}

// צבע לכל קטגוריה (רקע הקמע, צ'יפ בכותרת)
const CAT_BG = {
  history: '#FFE08A', science: '#C9BEFF', nature: '#BFE9D8',
  stories: '#FFD0E4', society: '#A5D4FF', parents: '#FFC9B5',
};

const $ = (id) => document.getElementById(id);
const audio = $('audio');

const S = {
  data: { categories: [], podcasts: [] },
  st: { last: null, pos: {}, done: [] },
  cat: 'all',
  pid: null,          // הפודקאסט שפתוח במסך הפודקאסט
  season: {},         // pid -> עונה נבחרת
  limit: {},          // pid -> כמה פרקים מוצגים (בלי עונות)
  open: null,         // eid שהתיאור שלו פתוח
  cur: null,          // { pod, ep } — מה שטעון בנגן
  deck: [],
  panelVisible: false,
  lastSave: 0,
};

// ---------- עזרים ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmt(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
const podById = (id) => S.data.podcasts.find((p) => p.id === id);
const catById = (id) => S.data.categories.find((c) => c.id === id);
const findEp = (eid) => {
  const pod = podById(String(eid).split(':')[0]);
  const ep = pod?.episodes.find((e) => e.id === eid);
  return pod && ep ? { pod, ep } : null;
};
const isDone = (eid) => S.st.done.includes(eid);
const heardCount = (pod) => pod.episodes.filter((e) => isDone(e.id)).length;
const nextUnheard = (pod) => pod.episodes.find((e) => !isDone(e.id)) || pod.episodes[0];
const seasonOf = (ep) => ep.s || NO_SEASON;
const hasSeasons = (pod) => pod.episodes.some((e) => e.s);
const isPlaying = (eid) => S.cur?.ep.id === eid && !audio.paused;
const curDuration = () => audio.duration || S.cur?.ep.d || 0;

async function save(force = false) {
  const now = Date.now();
  if (!force && now - S.lastSave < SAVE_EVERY_MS) return;
  S.lastSave = now;
  try { await write(NS, S.st); } catch (err) { console.warn('שמירה נכשלה', err); }
}

function buddySVG(bg = '#FFB400', accent = '#FF6B5E') {
  return `<svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
    <ellipse cx="60" cy="112" rx="34" ry="5" fill="#1F2A4D" opacity="0.15"/>
    <path d="M57 20 V8 A6 6 0 1 1 63 8 V20Z" fill="${accent}" stroke="#1F2A4D" stroke-width="3" stroke-linejoin="round"/>
    <path d="M60 14 C88 14 104 36 104 62 C104 90 86 106 60 106 C34 106 16 90 16 62 C16 36 32 14 60 14Z" fill="${bg}" stroke="#1F2A4D" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M24 64 C24 38 42 24 60 24 C78 24 96 38 96 64" fill="none" stroke="#1F2A4D" stroke-width="6" stroke-linecap="round"/>
    <rect x="15" y="54" width="14" height="28" rx="7" fill="#1F2A4D"/>
    <rect x="91" y="54" width="14" height="28" rx="7" fill="#1F2A4D"/>
    <g class="eyes">
      <circle cx="47" cy="60" r="9" fill="#fff"/><circle cx="73" cy="60" r="9" fill="#fff"/>
      <circle cx="48.5" cy="61" r="4.5" fill="#1F2A4D"/><circle cx="74.5" cy="61" r="4.5" fill="#1F2A4D"/>
    </g>
    <circle cx="35" cy="76" r="5" fill="#FF8FA3" opacity="0.7"/><circle cx="85" cy="76" r="5" fill="#FF8FA3" opacity="0.7"/>
    <path d="M51 76 Q60 86 69 76" fill="none" stroke="#1F2A4D" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`;
}

const ICON_PLAY = '<svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.5v15l12-7.5z" fill="#1F2A4D" stroke="#1F2A4D" stroke-width="2" stroke-linejoin="round"/></svg>';
const ICON_PAUSE = '<svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="4.5" width="4.5" height="15" rx="1.5" fill="#1F2A4D"/><rect x="14" y="4.5" width="4.5" height="15" rx="1.5" fill="#1F2A4D"/></svg>';
const ICON_PLAY_SM = ICON_PLAY.replace(/width="34" height="34"/, 'width="20" height="20"');
const EQ = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>';
const CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1F2A4D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';

// עטיפה: אנימציה אם קיימת, אחרת התמונה מהפיד
const REDUCED = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function coverHTML(pod, cls = '') {
  if (pod.anim && !REDUCED) {
    return `<video class="${cls} lazy-anim" data-src="${esc(pod.anim)}" poster="${esc(pod.art)}" muted loop
            playsinline preload="none" aria-hidden="true" tabindex="-1"></video>`;
  }
  return `<img class="${cls}" src="${esc(pod.art)}" alt="" loading="lazy">`;
}

// האנימציות יורדות ומתנגנות רק כשהכרטיס על המסך, ונעצרות כשהוא יוצא
const animObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const { target: v, isIntersecting } of entries) {
    if (isIntersecting) {
      if (!v.src) v.src = v.dataset.src;
      v.play().catch(() => {});
    } else v.pause();
  }
}, { rootMargin: '100px' }) : null;
function wireAnims(root) {
  root.querySelectorAll('video.lazy-anim').forEach((v) => {
    if (animObserver) animObserver.observe(v);
    else { v.src = v.dataset.src; v.play().catch(() => {}); }
  });
}

// ---------- מסך ראשי ----------
function renderChips() {
  const chips = [{ id: 'all', name: 'הכל', emoji: '✨' }, ...S.data.categories];
  $('chips').innerHTML = chips.map((c) => `
    <button type="button" class="chip" data-cat="${c.id}" aria-pressed="${c.id === S.cat}">
      ${c.id === 'all' ? '' : `<span aria-hidden="true">${c.emoji}</span>`} ${esc(c.name)}
    </button>`).join('');
}

function renderGrid() {
  // מיון: הכי הרבה פרקים ששמעו, אחר כך הכניסה האחרונה, אחר כך הסדר בקטלוג
  const seen = S.st.seen || {};
  const order = new Map(S.data.podcasts.map((p, i) => [p.id, i]));
  const pods = S.data.podcasts
    .filter((p) => S.cat === 'all' || p.cat === S.cat)
    .sort((a, b) => heardCount(b) - heardCount(a)
      || (seen[b.id] || 0) - (seen[a.id] || 0)
      || order.get(a.id) - order.get(b.id));
  $('podGrid').innerHTML = pods.map((p) => {
    const heard = heardCount(p);
    // ▶ מנגן ישר: מה שמתנגן מהפודקאסט הזה, אחרת הפרק הבא שלא נשמע (ממשיך מאיפה שעצרו)
    const target = S.cur?.pod.id === p.id ? S.cur.ep : nextUnheard(p);
    const live = isPlaying(target.id);
    return `
      <article class="card">
        <a href="#${p.id}" class="card-link" data-pod="${p.id}">
          <span class="card-cover">${coverHTML(p)}</span>
          <span class="card-name">${esc(p.name)}</span>
        </a>
        <span class="card-foot">
          <span class="tags">
            <span class="tag tag-yellow">${p.episodes.length} פרקים</span>
            ${heard ? `<span class="tag tag-green">✓ ${heard}</span>` : ''}
          </span>
          <button type="button" class="card-play" data-play="${target.id}"
                  aria-label="${live ? 'עצרי' : 'נגני'}: ${esc(p.name)}, פרק ${target.n}">${live ? EQ : ICON_PLAY_SM}</button>
        </span>
      </article>`;
  }).join('');
  $('podGrid').removeAttribute('aria-busy');
  wireAnims($('podGrid'));
}

function buildDeck() {
  const pool = S.data.podcasts
    .filter((p) => p.cat !== 'parents')
    .flatMap((p) => p.episodes.filter((e) => !isDone(e.id)).map((e) => ({ pod: p, ep: e })));
  // ערבוב Fisher-Yates, ולכל היותר שני פרקים מאותו פודקאסט
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const per = {};
  S.deck = pool.filter(({ pod }) => (per[pod.id] = (per[pod.id] || 0) + 1) <= 2).slice(0, DECK_SIZE);
}

function renderDeck() {
  $('deck').innerHTML = S.deck.map(({ pod, ep }) => `
    <article class="dcard">
      <span class="dcard-cover"><img src="${esc(pod.art)}" alt="" loading="lazy"></span>
      <span class="dcard-body">
        <span class="tag tag-yellow tag-pod">${esc(pod.name)}</span>
        <h3>${esc(ep.t)}</h3>
        <span class="dcard-foot">
          <span class="meta">פרק ${ep.n}${ep.d ? ` · ${fmt(ep.d)}` : ''}</span>
          <button type="button" class="play-dot" data-play="${ep.id}" aria-label="נגני את ${esc(ep.t)}">
            ${isPlaying(ep.id) ? EQ : ICON_PLAY_SM}
          </button>
        </span>
      </span>
    </article>`).join('');
}

function renderList() {
  const hasCur = Boolean(S.cur);
  $('hero').hidden = hasCur;
  $('listTop').classList.toggle('with-panel', hasCur);
  if (hasCur) $('listPanelSlot').append($('panel'));
  $('panel').hidden = !hasCur;
  $('panelBadge').hidden = false;
  renderChips();
  renderGrid();
  renderDeck();
}

// ---------- מסך פודקאסט ----------
function renderShowHead(pod) {
  const cat = catById(pod.cat);
  $('showHead').innerHTML = `
    <div class="show-cover">${coverHTML(pod)}</div>
    <div class="show-info">
      <div class="tags">
        <span class="tag tag-big" style="background:${CAT_BG[pod.cat]}">${cat.emoji} ${esc(cat.name)}</span>
        <span class="tag tag-big tag-mint">${pod.episodes.length} פרקים</span>
      </div>
      <h1>${esc(pod.name)}</h1>
      <div class="about" id="about">
        <h2>על הפודקאסט</h2>
        <p>${esc(pod.summary)}</p>
        <button type="button" class="about-more" id="aboutMore" aria-expanded="false">עוד</button>
      </div>
      ${pod.from ? `<p class="from">מבית: ${esc(pod.from)}</p>` : ''}
    </div>`;
  wireAnims($('showHead'));
  $('aboutMore').addEventListener('click', () => {
    const open = $('about').classList.toggle('open');
    $('aboutMore').setAttribute('aria-expanded', String(open));
    $('aboutMore').textContent = open ? 'פחות' : 'עוד';
  });
}

function seasonsOf(pod) {
  const keys = [...new Set(pod.episodes.map(seasonOf))];
  return keys.sort((a, b) => (a === NO_SEASON) - (b === NO_SEASON) || Number(a) - Number(b));
}

function visibleEpisodes(pod) {
  if (hasSeasons(pod)) {
    const s = S.season[pod.id];
    return { eps: pod.episodes.filter((e) => seasonOf(e) === s), more: false };
  }
  const lim = S.limit[pod.id] || PAGE;
  return { eps: pod.episodes.slice(0, lim), more: pod.episodes.length > lim };
}

function epRowHTML(pod, e) {
  const playing = isPlaying(e.id);
  const isCur = S.cur?.ep.id === e.id;
  const done = isDone(e.id);
  const open = S.open === e.id;
  const t = S.st.pos[e.id] || 0;
  const pct = !done && e.d && t ? Math.min(100, (t / e.d) * 100) : 0;
  return `
    <li class="ep${isCur ? ' cur' : ''}${done ? ' done' : ''}" data-eid="${e.id}">
      <div class="ep-row">
        <button type="button" class="play-dot${isCur ? ' hot' : ''}" data-play="${e.id}"
                aria-label="${playing ? 'עצרי את' : 'נגני את'} ${esc(e.t)}">${playing ? EQ : ICON_PLAY_SM}</button>
        <button type="button" class="ep-main" data-open="${e.id}" aria-expanded="${open}">
          <span class="ep-text">
            <span class="ep-title">${esc(e.t)}</span>
            <span class="ep-meta">פרק ${e.n}${e.d ? ` · ${fmt(e.d)}` : ''}</span>
            ${pct ? `<span class="ep-prog"><span style="width:${pct}%"></span></span>` : ''}
          </span>
        </button>
        <button type="button" class="heard-chip" data-heard="${e.id}" aria-pressed="${done}">
          <span class="check" aria-hidden="true">${CHECK}</span><span class="heard-label">שמעתי כבר</span>
        </button>
      </div>
      ${open && e.desc ? `<p class="ep-desc">${esc(e.desc)}</p>` : ''}
    </li>`;
}

function renderEpisodes() {
  const pod = podById(S.pid);
  if (!pod) return;
  $('heardSum').textContent = `שמעת ${heardCount(pod)} מתוך ${pod.episodes.length}`;
  const tabs = $('seasonTabs');
  if (hasSeasons(pod)) {
    tabs.hidden = false;
    tabs.innerHTML = seasonsOf(pod).map((s) => `
      <button type="button" class="chip" role="tab" data-season="${s}" aria-selected="${s === S.season[pod.id]}"
              aria-pressed="${s === S.season[pod.id]}">${s === NO_SEASON ? 'פרקים נוספים' : `עונה ${s}`}</button>`).join('');
  } else {
    tabs.hidden = true;
  }
  const { eps, more } = visibleEpisodes(pod);
  $('epList').innerHTML = eps.map((e) => epRowHTML(pod, e)).join('');
  $('moreBtn').hidden = !more;
}

// מכוון את העונה/העמוד כך שהפרק יופיע ברשימה
function revealEpisode(pod, ep) {
  if (hasSeasons(pod)) S.season[pod.id] = seasonOf(ep);
  else {
    const idx = pod.episodes.indexOf(ep);
    S.limit[pod.id] = Math.max(S.limit[pod.id] || PAGE, Math.ceil((idx + 1) / PAGE) * PAGE);
  }
}

function openShow(pid, { push = true } = {}) {
  const pod = podById(pid);
  if (!pod) return;
  S.pid = pid;
  S.open = null;
  S.st.seen = { ...(S.st.seen || {}), [pid]: Date.now() };
  save(true);
  renderShowHead(pod);
  // בנגן: מה שמתנגן עכשיו, ואם לא מתנגן כלום — הפרק הבא שלא נשמע בפודקאסט הזה
  if (!S.cur || (audio.paused && S.cur.pod.id !== pid)) load(nextUnheard(pod).id, { autoplay: false });
  const focus = S.cur.pod.id === pid ? S.cur.ep : nextUnheard(pod);
  if (!(pod.id in S.season) && !(pod.id in S.limit)) revealEpisode(pod, focus);
  $('showPanelSlot').append($('panel'));
  $('panel').hidden = false;
  $('panelBadge').hidden = true;
  renderEpisodes();
  $('listView').hidden = true;
  $('showView').hidden = false;
  document.body.classList.add('in-show');
  $('backBtn').hidden = false;
  if (push) history.pushState({ pod: pid }, '', `#${pid}`);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function closeShow({ push = true } = {}) {
  S.pid = null;
  document.body.classList.remove('in-show');
  $('showView').hidden = true;
  $('listView').hidden = false;
  $('backBtn').hidden = true;
  renderList();
  if (push) history.pushState({}, '', location.pathname);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ---------- נגן ----------
function load(eid, { autoplay = true } = {}) {
  const hit = findEp(eid);
  if (!hit) return;
  if (S.cur?.ep.id === eid) { if (autoplay) togglePlay(); return; }
  S.cur = hit;
  const { pod, ep } = hit;
  $('panelError').hidden = true;
  audio.src = ep.u;
  const resume = S.st.pos[eid] || 0;
  audio.addEventListener('loadedmetadata', () => {
    if (resume && (!audio.duration || resume < audio.duration - 5)) audio.currentTime = resume;
  }, { once: true });
  if (autoplay) {
    sfx('play');
    audio.play().catch((err) => console.warn('ניגון נכשל', err));
    S.st.last = { eid, at: Date.now() };
    save(true);
  }
  paintPanel();
  setMediaSession(pod, ep);
}

function togglePlay() {
  if (!S.cur) return;
  if (audio.paused) {
    sfx('play');
    audio.play().catch(() => {});
    S.st.last = { eid: S.cur.ep.id, at: Date.now() };
  } else audio.pause();
}

function step(dir) {
  if (!S.cur) return;
  const eps = S.cur.pod.episodes;
  const next = eps[eps.indexOf(S.cur.ep) + dir];
  if (!next) return;
  const wasPlaying = !audio.paused;
  load(next.id, { autoplay: wasPlaying });
  if (S.pid === S.cur.pod.id) { revealEpisode(S.cur.pod, next); renderEpisodes(); }
}

function toggleHeard(eid) {
  const i = S.st.done.indexOf(eid);
  if (i >= 0) S.st.done.splice(i, 1);
  else { S.st.done.push(eid); sfx('ding'); }
  save(true);
  refresh();
}

function paintPanel() {
  if (!S.cur) return;
  const { pod, ep } = S.cur;
  $('panelBuddy').innerHTML = buddySVG(CAT_BG[pod.cat]);
  $('panelShow').textContent = `${pod.name} · פרק ${ep.n} מתוך ${pod.episodes.length}`;
  $('panelTitle').textContent = ep.t;
  $('panelDesc').textContent = ep.desc || 'אין תקציר לפרק הזה. פשוט להקשיב!';
  const eps = pod.episodes;
  $('prevBtn').disabled = eps[0] === ep;
  $('nextBtn').disabled = eps[eps.length - 1] === ep;
  const done = isDone(ep.id);
  $('heardBtn').setAttribute('aria-pressed', String(done));
  $('heardBtn').querySelector('.check').innerHTML = CHECK;
  $('miniCover').src = ep.img || pod.art;
  $('miniTitle').textContent = `${ep.t} · ${pod.name}`;
  paintPlayState();
  paintTime();
}

function paintPlayState() {
  const playing = S.cur && !audio.paused;
  $('playBtn').innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  $('miniPlay').innerHTML = (playing ? ICON_PAUSE : ICON_PLAY).replace(/width="34" height="34"/, 'width="26" height="26"');
  $('playBtn').setAttribute('aria-label', playing ? 'עצרי' : 'נגני');
  $('miniPlay').setAttribute('aria-label', playing ? 'עצרי' : 'נגני');
  $('panel').classList.toggle('playing', Boolean(playing));
  paintMini();
}

function paintTime() {
  if (!S.cur) return;
  const t = audio.src ? audio.currentTime || S.st.pos[S.cur.ep.id] || 0 : 0;
  const d = curDuration();
  const pct = d ? Math.min(100, (t / d) * 100) : 0;
  $('tNow').textContent = fmt(t);
  $('tDur').textContent = fmt(d);
  $('panelFill').style.width = `${pct}%`;
  $('miniFill').style.width = `${pct}%`;
  $('panelBar').setAttribute('aria-valuenow', String(Math.round(pct)));
}

function paintMini() {
  $('mini').hidden = !(S.cur && !S.panelVisible);
  document.body.classList.toggle('has-mini', !$('mini').hidden);
}

// רינדור מחדש של כל מה שמושפע מניגון / "שמעתי כבר"
function refresh() {
  paintPanel();
  if (S.pid) renderEpisodes();
  else { renderGrid(); renderDeck(); }
}

function setMediaSession(pod, ep) {
  if (!('mediaSession' in navigator)) return;
  const art = new URL(ep.img || pod.art, location.href).href;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: ep.t, artist: pod.name, album: 'אוזניים גדולות',
    artwork: [{ src: art, sizes: '600x600' }],
  });
  navigator.mediaSession.setActionHandler('seekbackward', () => { audio.currentTime -= SKIP; });
  navigator.mediaSession.setActionHandler('seekforward', () => { audio.currentTime += SKIP; });
  navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
  navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
}

audio.addEventListener('play', () => { paintPlayState(); refresh(); });
audio.addEventListener('pause', () => { paintPlayState(); refresh(); save(true); });
audio.addEventListener('loadedmetadata', paintTime);
// הפרק לא נטען (המארח נפל / אין רשת): אומרים את זה בפאנל במקום שקט
audio.addEventListener('error', () => {
  if (!S.cur || !audio.src) return;
  $('panelError').hidden = false;
  paintPlayState();
});
audio.addEventListener('timeupdate', () => {
  if (!S.cur) return;
  const t = audio.currentTime;
  const d = curDuration();
  S.st.pos[S.cur.ep.id] = Math.floor(t);
  paintTime();
  if (d && t / d >= DONE_RATIO && !isDone(S.cur.ep.id)) {
    S.st.done.push(S.cur.ep.id);
    sfx('ding');
    save(true);
    refresh();
  }
  save();
});
audio.addEventListener('ended', () => {
  if (!S.cur) return;
  if (!isDone(S.cur.ep.id)) S.st.done.push(S.cur.ep.id);
  S.st.pos[S.cur.ep.id] = 0;
  save(true);
  refresh(); // בלי ניגון אוטומטי של הפרק הבא — החלטה מכוונת
});

// לחיצה / גרירה על פס ההתקדמות
function seekFromPointer(e) {
  const bar = $('panelBar');
  const r = bar.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); // הפס LTR
  const d = curDuration();
  if (d) { audio.currentTime = ratio * d; paintTime(); }
}
$('panelBar').addEventListener('pointerdown', (e) => {
  seekFromPointer(e);
  const move = (ev) => seekFromPointer(ev);
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});
$('panelBar').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') audio.currentTime -= SKIP;
  if (e.key === 'ArrowRight') audio.currentTime += SKIP;
});

// הפס התחתון מופיע כשהפאנל הגדול לא על המסך
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    S.panelVisible = entry.isIntersecting;
    paintMini();
  }, { threshold: 0.25 }).observe($('panel'));
}

// ---------- אירועים ----------
// hub-sounds.js מחליף את ההשתקה; קוראים את המצב החדש אחרי שהוא סיים
$('muteToggle').addEventListener('click', () => {
  setTimeout(() => { isMuted().then((m) => { muted = m; }); }, 50);
});
$('playBtn').addEventListener('click', togglePlay);
$('miniPlay').addEventListener('click', togglePlay);
$('back10').addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - SKIP); });
$('fwd10').addEventListener('click', () => { audio.currentTime += SKIP; });
$('miniBack').addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - SKIP); });
$('miniFwd').addEventListener('click', () => { audio.currentTime += SKIP; });
$('prevBtn').addEventListener('click', () => step(-1));
$('nextBtn').addEventListener('click', () => step(1));
$('heardBtn').addEventListener('click', () => S.cur && toggleHeard(S.cur.ep.id));
$('panelShow').addEventListener('click', () => S.cur && openShow(S.cur.pod.id));
$('miniOpen').addEventListener('click', () => S.cur && openShow(S.cur.pod.id));
$('backBtn').addEventListener('click', () => { sfx('tap'); closeShow(); });
$('logoLink').addEventListener('click', (e) => { e.preventDefault(); if (S.pid) closeShow(); });

$('jumpBtn').addEventListener('click', () => {
  const pod = podById(S.pid);
  const ep = nextUnheard(pod);
  revealEpisode(pod, ep);
  S.open = ep.id;
  renderEpisodes();
  document.querySelector(`[data-eid="${CSS.escape(ep.id)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
$('moreBtn').addEventListener('click', () => {
  S.limit[S.pid] = (S.limit[S.pid] || PAGE) + PAGE;
  renderEpisodes();
});

function roll() {
  const dice = $('diceBtn');
  dice.classList.add('rolling');
  $('deck').classList.add('dim');
  sfx('magic');
  setTimeout(() => {
    buildDeck();
    renderDeck();
    dice.classList.remove('rolling');
    $('deck').classList.remove('dim');
    $('deck').scrollTo({ left: 0, behavior: 'smooth' });
  }, 700);
}
$('diceBtn').addEventListener('click', roll);
$('rollBtn').addEventListener('click', roll);
// ב-RTL גלילה "קדימה" היא שמאלה (scrollLeft שלילי)
$('deckNext').addEventListener('click', () => $('deck').scrollBy({ left: -300, behavior: 'smooth' }));
$('deckPrev').addEventListener('click', () => $('deck').scrollBy({ left: 300, behavior: 'smooth' }));

document.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-cat]');
  if (chip) { S.cat = chip.dataset.cat; sfx('tap'); renderChips(); renderGrid(); return; }
  const season = e.target.closest('[data-season]');
  if (season) { S.season[S.pid] = season.dataset.season; sfx('tap'); renderEpisodes(); return; }
  const play = e.target.closest('[data-play]');
  if (play) { load(play.dataset.play); return; }
  const card = e.target.closest('[data-pod]');
  if (card) { e.preventDefault(); sfx('tap'); openShow(card.dataset.pod); return; }
  const heard = e.target.closest('[data-heard]');
  if (heard) { toggleHeard(heard.dataset.heard); return; }
  const open = e.target.closest('[data-open]');
  if (open) { S.open = S.open === open.dataset.open ? null : open.dataset.open; renderEpisodes(); }
});

window.addEventListener('popstate', () => {
  const pid = location.hash.slice(1);
  if (podById(pid)) openShow(pid, { push: false }); else closeShow({ push: false });
});
window.addEventListener('pagehide', () => { save(true); });

// ---------- אתחול ----------
async function init() {
  const [res, saved] = await Promise.all([
    fetch('data/podcasts.json?v=5').then((r) => r.json()),
    read(NS, null).catch(() => null),
  ]);
  S.data = res;
  if (saved && typeof saved === 'object') {
    S.st = {
      last: saved.last || null,
      pos: saved.pos || {},
      done: Array.isArray(saved.done) ? saved.done : [],
      seen: saved.seen || {},
    };
  }
  $('heroBuddy').innerHTML = buddySVG('#FFB400');
  buildDeck();
  if (S.st.last && findEp(S.st.last.eid)) load(S.st.last.eid, { autoplay: false });
  const pid = location.hash.slice(1);
  if (podById(pid)) openShow(pid, { push: false }); else renderList();
}

init().catch((err) => {
  console.error(err);
  $('podGrid').innerHTML = '<p class="oops">הפודקאסטים לא נטענו. בדקי את האינטרנט ורענני את הדף.</p>';
});
