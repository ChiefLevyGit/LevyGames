// כפתור "חשבון משפחתי" ב-nav + החלון שלו.
//   מנותקים: Google, או אימייל + סיסמה (כניסה / הרשמה)
//   מחוברים: מצב סנכרון, "מי משחקת עכשיו?" (החלפה / הוספת פרופיל), התנתקות
// בלי קונפיג Supabase הכפתור לא מוצג בכלל - האתר מקומי כמו תמיד.
//
// קלט משתמש (אימייל, שמות פרופילים) -> textContent בלבד.

import {
  isConfigured, getUser, signInWithGoogle, signInWithPassword, signUp, signOut, authErrorText,
} from './auth.js?v=1';
import { start as startSync, status as syncStatus, forget as forgetSync, push } from './cloud-sync.js?v=1';
import { listProfiles, getActiveProfile, setActiveProfile, createProfile, PROFILE_AVATARS } from './profiles.js?v=2';
import { playHello } from './hub-sounds.js?v=3';

const btn = document.getElementById('accountBtn');
let user = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function paintButton() {
  if (!btn) return;
  btn.classList.toggle('signed-in', Boolean(user));
  btn.setAttribute('aria-label', user ? 'החשבון המשפחתי (מחוברים)' : 'התחברות לחשבון משפחתי');
  btn.title = user ? 'מחוברים - ההתקדמות מסתנכרנת' : 'התחברות';
}

/* ================= החלון ================= */

function openModal() {
  const backdrop = el('div', 'gate-backdrop account-backdrop');
  const card = el('div', 'gate-card account-card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-labelledby', 'accountTitle');

  const close = el('button', 'account-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'סגירה');
  card.append(close);

  const body = el('div');
  card.append(body);
  backdrop.append(card);
  document.body.append(backdrop);

  const opener = document.activeElement;
  const shut = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    opener?.focus?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') shut(); };
  document.addEventListener('keydown', onKey);
  close.addEventListener('click', shut);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) shut(); });

  (user ? renderSignedIn : renderSignedOut)(body, shut);
  body.querySelector('button, input')?.focus();
}

function renderSignedOut(body) {
  body.replaceChildren();
  body.append(
    el('span', 'gate-emoji', '👨‍👩‍👧'),
    Object.assign(el('h2', 'gate-title', 'חשבון משפחתי'), { id: 'accountTitle' }),
    el('p', 'gate-sub', 'מתחברים פעם אחת, וההתקדמות, השיאים וההישגים של כל הבנות עוברים בין הטאבלט, הטלפון והמחשב.'),
  );

  const google = el('button', 'btn google-btn');
  google.type = 'button';
  google.innerHTML = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  google.append(document.createTextNode(' המשך עם Google'));

  const or = el('p', 'account-or', 'או עם אימייל');

  const form = el('form', 'account-form');
  const email = Object.assign(el('input', 'gate-input'), {
    type: 'email', required: true, autocomplete: 'email', placeholder: 'אימייל', dir: 'ltr',
  });
  email.setAttribute('aria-label', 'אימייל');
  const pass = Object.assign(el('input', 'gate-input'), {
    type: 'password', required: true, minLength: 6, autocomplete: 'current-password', placeholder: 'סיסמה', dir: 'ltr',
  });
  pass.setAttribute('aria-label', 'סיסמה');
  const row = el('div', 'account-row');
  const signInBtn = Object.assign(el('button', 'btn btn-primary', 'כניסה'), { type: 'submit' });
  const signUpBtn = Object.assign(el('button', 'btn btn-ghost', 'הרשמה'), { type: 'button' });
  row.append(signInBtn, signUpBtn);
  const msg = el('p', 'account-msg');
  msg.setAttribute('role', 'status');
  form.append(email, pass, row, msg);

  body.append(google, or, form);

  const busy = (on) => [google, signInBtn, signUpBtn].forEach((b) => { b.disabled = on; });
  const fail = (err) => { msg.textContent = authErrorText(err); msg.classList.add('error'); busy(false); };

  google.addEventListener('click', async () => {
    busy(true);
    msg.textContent = 'מעבירים ל-Google...';
    try { await signInWithGoogle(); } catch (err) { fail(err); } // הצלחה = הדף עובר ל-Google
  });

  // אחרי כניסה: טעינה מחדש, כדי שכל הדף (וה-sync) יעלו מחדש עם החשבון
  const afterSignIn = () => { playHello(); setTimeout(() => location.reload(), 350); };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    busy(true);
    msg.classList.remove('error');
    msg.textContent = 'מתחברים...';
    try {
      await signInWithPassword(email.value.trim(), pass.value);
      afterSignIn();
    } catch (err) { fail(err); }
  });

  signUpBtn.addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    busy(true);
    msg.classList.remove('error');
    msg.textContent = 'נרשמים...';
    try {
      const { needsConfirm } = await signUp(email.value.trim(), pass.value);
      if (needsConfirm) {
        msg.textContent = '📧 שלחנו מייל אישור. לוחצים על הקישור שבו - ואז "כניסה".';
        busy(false);
      } else {
        afterSignIn();
      }
    } catch (err) { fail(err); }
  });
}

async function renderSignedIn(body) {
  body.replaceChildren();
  const s = syncStatus();
  body.append(
    el('span', 'gate-emoji', '☁️'),
    Object.assign(el('h2', 'gate-title', 'חשבון משפחתי'), { id: 'accountTitle' }),
    el('p', 'gate-sub account-email', user.email || ''),
    el('p', 'account-sync', s.pending ? `⏳ ${s.pending} שינויים ממתינים לסנכרון` : '✓ הכל מסונכרן'),
  );

  // מי משחקת עכשיו - החלפה והוספה
  body.append(el('p', 'gate-label', 'מי משחקת עכשיו?'));
  const chips = el('div', 'profile-chips account-chips');
  const [profiles, active] = await Promise.all([listProfiles(), getActiveProfile()]);
  profiles.forEach((p) => {
    const chip = el('button', 'profile-chip', `${p.emoji} ${p.name}`);
    chip.type = 'button';
    chip.setAttribute('aria-pressed', String(p.id === active?.id));
    chip.addEventListener('click', async () => {
      if (p.id === active?.id) return;
      await setActiveProfile(p.id);
      playHello();
      setTimeout(() => location.reload(), 350);
    });
    chips.append(chip);
  });
  body.append(chips);

  const addForm = el('form', 'account-add');
  const nameInput = Object.assign(el('input', 'gate-input'), { type: 'text', maxLength: 20, required: true, placeholder: 'שם של ילדה חדשה...' });
  nameInput.setAttribute('aria-label', 'שם פרופיל חדש');
  const addBtn = Object.assign(el('button', 'btn btn-ghost', '➕ הוספה'), { type: 'submit' });
  addForm.append(nameInput, addBtn);
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const avatar = PROFILE_AVATARS[profiles.length % PROFILE_AVATARS.length];
    const created = await createProfile({ name, emoji: avatar.emoji });
    await setActiveProfile(created.id);
    await push();
    playHello();
    setTimeout(() => location.reload(), 350);
  });
  body.append(addForm);

  const out = Object.assign(el('button', 'btn btn-ghost account-signout', 'התנתקות'), { type: 'button' });
  out.addEventListener('click', async () => {
    out.disabled = true;
    await push(); // מה שממתין - לשלוח לפני שמתנתקים
    await signOut();
    await forgetSync();
    location.reload();
  });
  body.append(
    out,
    el('p', 'stats-note', 'בהתנתקות הנתונים נשארים במכשיר. הם פשוט מפסיקים להסתנכרן.'),
  );
}

/* ================= הפעלה ================= */

async function init() {
  if (!btn || !isConfigured()) return;
  btn.hidden = false;
  btn.addEventListener('click', openModal);
  document.addEventListener('levygames:open-account', openModal);
  user = await getUser();
  paintButton();
  if (user) startSync();
}

init();
