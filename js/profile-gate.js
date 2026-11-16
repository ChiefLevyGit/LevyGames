// מסך "איך קוראים לך?" - נפתח רק בכניסה הראשונה, כשאין עדיין פרופיל.
// אחרי יצירת הפרופיל הראשון גם מריצים את המיגרציה, כדי שהתקדמות מלפני
// הפרופילים תיכנס אליו ולא תיאבד.

import { getActiveProfile, createProfile, PROFILE_AVATARS } from './profiles.js?v=2';
import { migrateLegacyData } from './storage.js?v=2';
import { isConfigured } from './auth.js?v=1';

function buildGate() {
  const backdrop = document.createElement('div');
  backdrop.className = 'gate-backdrop';

  const avatarsHTML = PROFILE_AVATARS.map((avatar, i) => `
    <button type="button" class="gate-avatar${i === 0 ? ' selected' : ''}"
            role="radio" aria-checked="${i === 0}"
            data-emoji="${avatar.emoji}" style="background: ${avatar.color};">
      <span aria-hidden="true">${avatar.emoji}</span>
    </button>
  `).join('');

  backdrop.innerHTML = `
    <form class="gate-card" role="dialog" aria-modal="true" aria-labelledby="gateTitle">
      <span class="gate-emoji" aria-hidden="true">✨</span>
      <h2 class="gate-title" id="gateTitle">איך קוראים לך?</h2>
      <p class="gate-sub">כדי שנשמור לך את ההתקדמות בכל המשחקים</p>
      <input class="gate-input" id="gateName" type="text" maxlength="20" required
             autocomplete="off" placeholder="השם שלך..." aria-label="השם שלך">
      <p class="gate-label">ובחרי דמות:</p>
      <div class="gate-avatars" role="radiogroup" aria-label="בחירת דמות">${avatarsHTML}</div>
      <button type="submit" class="btn btn-primary gate-submit">יאללה, נתחיל! 🎮</button>
      ${isConfigured() ? '<button type="button" class="gate-account-link">יש לנו כבר חשבון משפחתי - התחברות ☁️</button>' : ''}
    </form>
  `;
  // החלון של js/account-ui.js נפתח מעל המסך הזה; אחרי ההתחברות הדף נטען מחדש
  backdrop.querySelector('.gate-account-link')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('levygames:open-account'));
  });
  return backdrop;
}

function askForProfile() {
  return new Promise((resolve) => {
    const backdrop = buildGate();
    document.body.appendChild(backdrop);

    const form = backdrop.querySelector('.gate-card');
    const input = backdrop.querySelector('#gateName');
    const avatars = [...backdrop.querySelectorAll('.gate-avatar')];
    let chosenEmoji = PROFILE_AVATARS[0].emoji;

    avatars.forEach((btn) => {
      btn.addEventListener('click', () => {
        chosenEmoji = btn.dataset.emoji;
        avatars.forEach((other) => {
          const isChosen = other === btn;
          other.classList.toggle('selected', isChosen);
          other.setAttribute('aria-checked', String(isChosen));
        });
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) { input.focus(); return; }

      const profile = await createProfile({ name, emoji: chosenEmoji });
      backdrop.remove();
      resolve(profile);
    });

    input.focus();
  });
}

// מחזיר את הפרופיל הפעיל; פותח את המסך רק אם אין אחד
export async function ensureProfile() {
  const existing = await getActiveProfile();
  if (existing) return existing;

  // מכשיר חדש עם חשבון מחובר: הבנות כבר בענן. מחכים לסנכרון (עד 5 שניות)
  // לפני ששואלים "איך קוראים לך" - אחרת ייווצר פרופיל כפול.
  const synced = await Promise.race([
    import('./cloud-sync.js?v=1').then((m) => m.start()).catch(() => false),
    new Promise((resolve) => { setTimeout(() => resolve(false), 5000); }),
  ]);
  if (synced) {
    const fromCloud = await getActiveProfile();
    if (fromCloud) return fromCloud;
  }

  const profile = await askForProfile();
  await migrateLegacyData(profile.id);
  return profile;
}
