// דף "שיאים והישגים": לשונית לילדה (תגים, שיאים, רגעים) ולשונית להורים
// (זמן משחק יומי, חלוקה לפי משחק, השוואה בין הפרופילים).
// הכל נקרא מהאחסון - הדף לא כותב שום דבר חוץ מ"אילו הישגים כבר חגגנו".
//
// שמות פרופילים הם קלט משתמשת -> textContent בלבד, אף פעם לא innerHTML.

import { GAMES } from './games-data.js?v=13';
import { ensureProfile } from './profile-gate.js?v=2';
import { listProfiles } from './profiles.js?v=2';
import { readAllProgress, readFor, write, STATS_NS, dayKey } from './storage.js?v=2';
import { summarize, computeAchievements } from './achievements.js?v=1';
import { playUnlock, playHello } from './hub-sounds.js?v=3';
import { isConfigured, getUser } from './auth.js?v=1';

const SEEN_NS = 'achievements.seen.v1';
const CHART_DAYS = 14;
const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

const $ = (id) => document.getElementById(id);
const gameById = Object.fromEntries(GAMES.map((g) => [g.id, g]));

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fmtMinutes(ms) {
  if (ms > 0 && ms < 60_000) return 'פחות מדקה';
  const min = Math.round((ms || 0) / 60_000);
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ש׳ ${m} דק׳` : `${h} ש׳`;
}

function fmtAgo(ts) {
  if (!ts) return '—';
  const days = Math.round((new Date(dayKey()) - new Date(dayKey(new Date(ts)))) / 86_400_000);
  if (days <= 0) return 'היום';
  if (days === 1) return 'אתמול';
  return `לפני ${days} ימים`;
}

// מפתחות 14 הימים האחרונים, מהישן לחדש
function lastDays(n) {
  const out = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  for (let i = n - 1; i >= 0; i -= 1) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push({ key: dayKey(x), date: x });
  }
  return out;
}

/* ================= טעינת נתונים ================= */

async function loadProfileData(profile) {
  const [progress, stats] = await Promise.all([
    readAllProgress(profile.id),
    readFor(profile.id, STATS_NS, null),
  ]);
  const s = stats?.v === 1 ? stats : { games: {}, days: {}, records: [] };
  const summary = summarize(progress, s, GAMES, dayKey());
  return { profile, progress, stats: s, summary, achievements: computeAchievements(summary) };
}

/* ================= לשונית "שלי" ================= */

function renderHero(data) {
  const { profile, summary, achievements } = data;
  const hero = $('statsHero');
  hero.replaceChildren();

  const avatar = el('span', 'stats-avatar', profile.emoji);
  avatar.style.background = profile.color || '#F0ABFC';
  avatar.setAttribute('aria-hidden', 'true');

  const head = el('div', 'stats-hero-head');
  head.append(avatar);
  const titles = el('div');
  titles.append(el('h1', 'stats-title', `השיאים של ${profile.name}`));
  titles.append(el('p', 'stats-streak', summary.current > 0
    ? `🔥 ${summary.current} ${summary.current === 1 ? 'יום' : 'ימים'} ברצף!`
    : 'משחקים היום = מתחילות רצף חדש 🔥'));
  head.append(titles);

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const tiles = el('div', 'stat-tiles');
  [
    ['🏅', `${unlocked}/${achievements.length}`, 'הישגים'],
    ['🪜', String(summary.levels), 'שלבים'],
    ['🎮', `${summary.playedCount}/${summary.gamesCount}`, 'משחקים'],
    ['⏱️', fmtMinutes(summary.totalMs), 'זמן משחק'],
  ].forEach(([emoji, value, label]) => {
    const tile = el('div', 'stat-tile');
    tile.append(el('span', 'stat-tile-emoji', emoji), el('strong', 'stat-tile-value', value), el('span', 'stat-tile-label', label));
    tiles.append(tile);
  });

  hero.append(head, tiles);
}

function renderBadges(achievements, fresh = new Set()) {
  const grid = $('badgesGrid');
  grid.replaceChildren();
  achievements.forEach((a) => {
    const card = el('div', `badge-card${a.unlocked ? ' unlocked' : ''}${fresh.has(a.id) ? ' just-unlocked' : ''}`);
    card.dataset.id = a.id;
    card.append(el('span', 'badge-emoji', a.emoji));
    card.append(el('strong', 'badge-title', a.title));
    card.append(el('span', 'badge-desc', a.desc));
    if (!a.unlocked) {
      const bar = el('div', 'progress-bar');
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', String(a.max));
      bar.setAttribute('aria-valuenow', String(a.cur));
      bar.setAttribute('aria-label', a.title);
      const fill = el('div', 'progress-fill');
      fill.style.width = `${Math.round((a.cur / a.max) * 100)}%`;
      bar.append(fill);
      card.append(bar, el('span', 'badge-count', `${a.cur}/${a.max}`));
    } else {
      card.append(el('span', 'badge-done', '✓ הושג!'));
    }
    grid.append(card);
  });
}

function recordLine(game, record) {
  if (!record) return null;
  if (record.kind === 'levels' && record.total) {
    return { text: `${record.done}/${record.total} ${game.progressUnit || 'שלבים'}`, pct: record.done / record.total };
  }
  if (record.kind === 'score' && record.best) return { text: `🏆 שיא: ${record.best}` };
  if (record.kind === 'session') return { text: record.hasSave ? '▶ יש משחק שמור' : '✓ שיחקת' };
  return null;
}

function renderRecords(data) {
  const grid = $('recordsGrid');
  grid.replaceChildren();
  GAMES.forEach((game) => {
    const record = data.progress[game.id];
    const time = data.stats.games[game.id]?.ms || 0;
    const line = recordLine(game, record);
    const card = el('a', `record-card${line || time ? '' : ' untried'}`);
    card.href = game.playUrl;
    const [from, to] = game.gradient || ['#e9d5ff', '#fbcfe8'];
    card.style.setProperty('--g1', from);
    card.style.setProperty('--g2', to);
    card.append(el('span', 'record-emoji', game.emoji));
    const body = el('div', 'record-body');
    body.append(el('strong', 'record-name', game.name));
    if (line) {
      body.append(el('span', 'record-value', line.text));
      if (line.pct !== undefined) {
        const bar = el('div', 'progress-bar');
        const fill = el('div', 'progress-fill');
        fill.style.width = `${Math.min(100, Math.round(line.pct * 100))}%`;
        bar.append(fill);
        body.append(bar);
      }
    } else if (!time) {
      body.append(el('span', 'record-value', 'עוד לא שיחקת - בואי ננסה! ▶'));
    }
    if (time) body.append(el('span', 'record-time', `⏱️ ${fmtMinutes(time)}`));
    card.append(body);
    grid.append(card);
  });
}

function renderMoments(data) {
  const list = $('momentsList');
  list.replaceChildren();
  const recent = [...data.stats.records].reverse().slice(0, 8);
  if (!recent.length) {
    list.append(el('li', 'moment empty', 'כשתעברי שלב או תשברי שיא - זה יופיע כאן ✨'));
    return;
  }
  recent.forEach((r) => {
    const game = gameById[r.gameId];
    const name = game?.name || r.gameId;
    const text = r.type === 'best'
      ? `🏆 שיא חדש ב${name}: ${r.value}`
      : `🪜 ${r.value}${r.total ? `/${r.total}` : ''} ${game?.progressUnit || 'שלבים'} ב${name}`;
    const li = el('li', 'moment');
    li.append(el('span', 'moment-text', text), el('span', 'moment-when', fmtAgo(r.at)));
    list.append(li);
  });
}

/* ================= לשונית "להורים" ================= */

function renderDailyChart(data) {
  const wrap = $('dailyChart');
  wrap.replaceChildren();
  const days = lastDays(CHART_DAYS).map(({ key, date }) => {
    const day = data.stats.days[key];
    return { key, date, min: Math.round((day?.ms || 0) / 60_000), games: day?.games || [] };
  });

  if (days.every((d) => d.min === 0)) {
    wrap.append(el('p', 'chart-empty', 'עוד אין זמן משחק מתועד. הוא נספר מעכשיו, בכל פעם שמשחקים.'));
    return;
  }

  // ציר y "עגול" עם אמצע שלם: 10/20/30/40/60/90/120...
  const peak = Math.max(...days.map((d) => d.min));
  const yMax = [10, 20, 30, 40, 60, 90, 120, 180, 240].find((n) => n >= peak) || Math.ceil(peak / 60) * 60;

  const W = 640, H = 220, padL = 34, padR = 8, padT = 12, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const col = plotW / days.length;
  const barW = Math.min(28, col - 6);
  const y = (v) => padT + plotH - (v / yMax) * plotH;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  };

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'daily-svg', role: 'img', 'aria-label': 'דקות משחק ביום, 14 הימים האחרונים' });

  [0, yMax / 2, yMax].forEach((v) => {
    svg.append(svgEl('line', { x1: padL, x2: W - padR, y1: y(v), y2: y(v), class: 'grid-line' }));
    const t = svgEl('text', { x: padL - 6, y: y(v) + 4, class: 'axis-label', 'text-anchor': 'end' });
    t.textContent = String(v);
    svg.append(t);
  });

  const tip = el('div', 'chart-tip');
  tip.hidden = true;
  const today = dayKey();

  days.forEach((d, i) => {
    const cx = padL + col * i + col / 2;
    if (d.min > 0) {
      const top = y(d.min);
      const h = padT + plotH - top;
      const r = Math.min(4, h);
      const x0 = cx - barW / 2, x1 = cx + barW / 2, base = padT + plotH;
      // פינות מעוגלות למעלה בלבד, נעוץ לבסיס
      svg.append(svgEl('path', {
        class: `bar${d.key === today ? ' today' : ''}`,
        d: `M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x1 - r} Q${x1},${top} ${x1},${top + r} V${base} Z`,
      }));
    }
    const lbl = svgEl('text', { x: cx, y: H - 18, class: `axis-label${d.key === today ? ' strong' : ''}`, 'text-anchor': 'middle' });
    lbl.textContent = String(d.date.getDate());
    const wd = svgEl('text', { x: cx, y: H - 4, class: 'axis-label faint', 'text-anchor': 'middle' });
    wd.textContent = WEEKDAYS[d.date.getDay()];
    svg.append(lbl, wd);

    // אזור hover רחב מהעמודה - קל לפגוע גם בעמודה נמוכה
    const hit = svgEl('rect', { x: padL + col * i, y: padT, width: col, height: plotH, class: 'hit', tabindex: '0' });
    const show = () => {
      const names = d.games.map((id) => gameById[id]?.name || id).join(', ');
      tip.textContent = `יום ${WEEKDAYS[d.date.getDay()]} ${d.date.getDate()}/${d.date.getMonth() + 1} · ${d.min} דק׳${names ? ` · ${names}` : ''}`;
      tip.hidden = false;
      tip.style.left = `${(cx / W) * 100}%`;
      // בקצוות - מצמידים את הבועה פנימה כדי שלא תחרוג מהכרטיס
      const shiftX = cx / W > 0.75 ? '-100%' : cx / W < 0.25 ? '0%' : '-50%';
      tip.style.transform = `translate(${shiftX}, calc(-100% - 8px))`;
      tip.style.top = `${(y(d.min) / H) * 100}%`;
    };
    hit.addEventListener('pointerenter', show);
    hit.addEventListener('focus', show);
    hit.addEventListener('pointerleave', () => { tip.hidden = true; });
    hit.addEventListener('blur', () => { tip.hidden = true; });
    svg.append(hit);
  });

  // אותם נתונים כטבלה לקוראי מסך
  const table = el('table', 'sr-only');
  const cap = el('caption', '', 'דקות משחק ביום');
  table.append(cap);
  days.forEach((d) => {
    const tr = el('tr');
    tr.append(el('th', '', d.key), el('td', '', String(d.min)));
    table.append(tr);
  });

  wrap.append(svg, tip, table);
}

function renderGameShare(data) {
  const box = $('gameShare');
  box.replaceChildren();
  const rows = GAMES
    .map((g) => ({ game: g, ms: data.stats.games[g.id]?.ms || 0, sessions: data.stats.games[g.id]?.sessions || 0 }))
    .filter((r) => r.ms > 0 || r.sessions > 0)
    .sort((a, b) => b.ms - a.ms);
  if (!rows.length) {
    box.append(el('p', 'chart-empty', 'עוד אין נתונים.'));
    return;
  }
  const max = Math.max(...rows.map((r) => r.ms), 1);
  rows.forEach(({ game, ms, sessions }) => {
    const row = el('div', 'share-row');
    row.append(el('span', 'share-name', `${game.emoji} ${game.name}`));
    const track = el('div', 'share-track');
    const fill = el('div', 'share-fill');
    fill.style.width = `${Math.max(2, (ms / max) * 100)}%`;
    track.append(fill);
    row.append(track, el('span', 'share-value', `${fmtMinutes(ms)} · ${sessions} כניסות`));
    box.append(row);
  });
}

function renderCompare(all) {
  const table = $('compareTable');
  table.replaceChildren();
  const head = el('tr');
  ['', 'השבוע', 'סה״כ', 'רצף', 'הישגים', 'משחק אהוב', 'שיחקה לאחרונה'].forEach((h) => head.append(el('th', '', h)));
  const thead = el('thead');
  thead.append(head);
  const tbody = el('tbody');
  const week = lastDays(7).map((d) => d.key);

  all.forEach(({ profile, stats, summary, achievements }) => {
    const weekMs = week.reduce((sum, k) => sum + (stats.days[k]?.ms || 0), 0);
    const fav = Object.entries(stats.games).sort((a, b) => (b[1].ms || 0) - (a[1].ms || 0))[0];
    const last = Math.max(0, ...Object.values(stats.games).map((g) => g.lastPlayed || 0));
    const tr = el('tr');
    tr.append(
      el('th', 'compare-name', `${profile.emoji} ${profile.name}`),
      el('td', '', fmtMinutes(weekMs)),
      el('td', '', fmtMinutes(summary.totalMs)),
      el('td', '', summary.current ? `🔥 ${summary.current}` : '—'),
      el('td', '', `${achievements.filter((a) => a.unlocked).length}/${achievements.length}`),
      el('td', '', fav && fav[1].ms ? `${gameById[fav[0]]?.emoji || ''} ${gameById[fav[0]]?.name || fav[0]}` : '—'),
      el('td', '', fmtAgo(last)),
    );
    tbody.append(tr);
  });
  table.append(thead, tbody);
}

/* ================= חגיגת הישג חדש ================= */

function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const bits = ['🎉', '⭐', '✨', '💖', '🌟', '🎊'];
  for (let i = 0; i < 28; i += 1) {
    const s = el('span', 'confetti', bits[i % bits.length]);
    s.style.setProperty('--x', `${Math.random() * 100}vw`);
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}vw`);
    s.style.setProperty('--d', `${1.2 + Math.random()}s`);
    s.style.setProperty('--r', `${(Math.random() - 0.5) * 720}deg`);
    document.body.append(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

// הדפדפן לא ינגן צליל בטעינת דף בלי לחיצה - לכן כפתור "לחגוג!"
async function celebrateNew(data) {
  const unlockedIds = data.achievements.filter((a) => a.unlocked).map((a) => a.id);
  const seen = await readFor(data.profile.id, SEEN_NS, null);
  const seenIds = new Set(Array.isArray(seen?.ids) ? seen.ids : []);
  const fresh = data.achievements.filter((a) => a.unlocked && !seenIds.has(a.id));
  if (!fresh.length) return;

  const toast = $('unlockToast');
  $('unlockEmoji').textContent = fresh[0].emoji;
  $('unlockTitle').textContent = fresh.length === 1 ? 'הישג חדש נפתח!' : `${fresh.length} הישגים חדשים נפתחו!`;
  $('unlockText').textContent = fresh.map((a) => a.title).join(' · ');
  toast.hidden = false;

  $('unlockBtn').addEventListener('click', async () => {
    playUnlock();
    confetti();
    renderBadges(data.achievements, new Set(fresh.map((a) => a.id)));
    toast.hidden = true;
    await write(SEEN_NS, { v: 1, ids: unlockedIds }); // write = הפרופיל הפעיל, שהוא המוצג
  }, { once: true });
}

/* ================= לשוניות ופרופילים ================= */

function wireTabs() {
  const tabs = [$('tabKid'), $('tabParent')];
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const next = tabs[(i + 1) % tabs.length];
      next.focus();
      select(next);
    });
  });
}

function renderAll(data, all) {
  renderHero(data);
  renderBadges(data.achievements);
  renderRecords(data);
  renderMoments(data);
  if (parentLocked) return;
  renderDailyChart(data);
  renderGameShare(data);
  renderCompare(all);
}

function renderChips(all, viewedId, onPick) {
  const box = $('profileChips');
  box.replaceChildren();
  if (all.length < 2) { box.hidden = true; return; }
  all.forEach(({ profile }) => {
    const chip = el('button', 'profile-chip', `${profile.emoji} ${profile.name}`);
    chip.type = 'button';
    chip.setAttribute('role', 'radio');
    chip.setAttribute('aria-checked', String(profile.id === viewedId));
    chip.addEventListener('click', () => onPick(profile.id));
    box.append(chip);
  });
}

// כשיש חשבונות באתר, לשונית ההורים דורשת התחברות. זה לא מנעול אמיתי (הנתונים
// ממילא במכשיר), אלא "דלת סגורה": ילדה לא נתקלת במעקב זמן המסך שלה בטעות.
async function gateParentTab() {
  if (!isConfigured() || await getUser()) return false;
  const panel = $('panelParent');
  panel.replaceChildren();
  const card = el('div', 'chart-card parent-locked');
  card.append(
    el('span', 'gate-emoji', '🔒'),
    el('h2', 'stats-h2', 'האזור של ההורים'),
    el('p', 'stats-note', 'זמני משחק והשוואה בין הבנות מוצגים אחרי התחברות לחשבון המשפחתי.'),
  );
  const btn = el('button', 'btn btn-primary', 'התחברות');
  btn.type = 'button';
  btn.addEventListener('click', () => document.dispatchEvent(new CustomEvent('levygames:open-account')));
  card.append(btn);
  panel.append(card);
  return true;
}

let parentLocked = false;

async function init() {
  wireTabs();
  const active = await ensureProfile();
  parentLocked = await gateParentTab();
  const profiles = await listProfiles();
  const all = await Promise.all(profiles.map(loadProfileData));
  const byId = Object.fromEntries(all.map((d) => [d.profile.id, d]));

  const show = (id) => {
    const data = byId[id] || all[0];
    renderChips(all, data.profile.id, (next) => { playHello(); show(next); });
    renderAll(data, all);
  };

  show(active.id);
  const mine = byId[active.id];
  if (mine) celebrateNew(mine);
}

// נתונים חדשים ממכשיר אחר - טוענים את הדף מחדש (פעם אחת: המשיכה הבאה ריקה)
document.addEventListener('levygames:sync', (e) => {
  if (e.detail?.changed) location.reload();
});

init().catch((err) => {
  console.warn('טעינת דף ההישגים נכשלה', err);
  $('statsHero').append(el('p', 'chart-empty', 'לא הצלחנו לטעון את הנתונים 😕'));
});
