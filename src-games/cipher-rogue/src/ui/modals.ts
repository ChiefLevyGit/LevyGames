import type { Level, SaveData } from '../types.ts';
import { h, wait, animate, reducedMotion } from './dom.ts';
import { button, starsRow, gradeLabel } from './components.ts';
import { IMG } from '../media.ts';
import { Sound } from '../core/SoundManager.ts';
import { canSpeak, speak, stopSpeaking } from '../core/speech.ts';
import { FX, centerOf } from '../fx/Particles.ts';
import { MAIN_LEVELS, SECRET_UNLOCK_STARS } from '../config/levels.ts';
import { isValve } from '../systems/MathSystem.ts';
import { vaultNo } from '../config/levels.ts';

/** שכבת מודאל אחת: רקע מוחשך (60%), כרטיס במרכז, ופוקוס נלכד בתוכו */
function overlay(cls: string, card: HTMLElement, label: string): { root: HTMLDivElement; close: () => Promise<void> } {
  const root = h('div', { class: `modal-overlay ${cls}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, card);
  document.getElementById('app')!.append(root);
  requestAnimationFrame(() => root.classList.add('in'));
  const prevFocus = document.activeElement as HTMLElement | null;
  setTimeout(() => card.querySelector<HTMLElement>('.btn-primary, button')?.focus({ preventScroll: true }), 60);
  return {
    root,
    close: async () => {
      root.classList.remove('in');
      await wait(reducedMotion() ? 0 : 220);
      root.remove();
      prevFocus?.focus?.({ preventScroll: true });
    },
  };
}

// ------------------------------------------------------------------ intro

/** שלב "התצפית": עין הקריסטל חושפת את החוק של המנעול לפני שנכנסים */
export function showIntro(level: Level): Promise<'go' | 'map'> {
  return new Promise((resolve) => {
    const valve = isValve(level);
    const speakText = `${level.title}. ${level.narrative} המנעול נפתח רק ל${level.target}.`;
    const card = h(
      'div',
      { class: `card intro-card ${level.secret ? 'is-secret' : ''}` },
      h('img', { class: 'intro-eye', src: IMG.eye, alt: '' }),
      h(
        'div',
        { class: 'chips' },
        h('span', { class: 'chip' }, level.secret ? 'הכספת הסודית' : `כספת ${vaultNo(level)} מתוך ${MAIN_LEVELS.length}`),
        h('span', { class: 'chip chip-grade' }, gradeLabel(level.grade)),
      ),
      h('h2', { class: 'intro-title' }, level.title),
      h('p', { class: 'intro-story' }, level.narrative),
      h(
        'div',
        { class: 'lock-plate' },
        h('span', { class: 'lock-plate-k' }, 'המנעול נפתח רק ל:'),
        h('strong', { class: 'lock-plate-v' }, level.target),
      ),
      valve
        ? h(
            'div',
            { class: 'valve-explain' },
            h('p', {}, 'כאן כל צעד שני חייב להשלים את הקודם ל-100:'),
            h('div', { class: 'valve-demo', dir: 'ltr' },
              h('span', { class: 'vd vd-open' }, '35'),
              h('span', { class: 'vd-op' }, '+'),
              h('span', { class: 'vd vd-close' }, '65'),
              h('span', { class: 'vd-op' }, '='),
              h('span', { class: 'vd vd-sum' }, '100'),
            ),
            h('p', { class: 'small' }, 'הצעד הראשון פותח את השסתום (ענבר). פתחת ואין השלמה ליד? חזרי לאבן ירוקה כדי לשחרר אותו.'),
          )
        : level.mechanic === 'equation_trail'
          ? h(
              'div',
              { class: 'valve-explain trail-explain' },
              h('p', {}, 'כאן אין אבנים אסורות — כל אבן מוסיפה או מורידה אנרגיה למאזניים:'),
              h('div', { class: 'valve-demo', dir: 'ltr' },
                h('span', { class: 'vd vd-close' }, '+30'),
                h('span', { class: 'vd vd-close' }, '+45'),
                h('span', { class: 'vd vd-open' }, '−5'),
                h('span', { class: 'vd vd-close' }, '+30'),
                h('span', { class: 'vd-op' }, '='),
                h('span', { class: 'vd vd-sum' }, String(level.targetNumber)),
              ),
              h('p', { class: 'small' }, `לשער נכנסים רק עם ${level.targetNumber} בדיוק. אבן שעוזבים נשרפת — אז מתכננים את השביל מראש!`),
            )
          : null,
      h(
        'p',
        { class: 'intro-treasure' },
        'בתוך הכספת: ',
        h('span', { class: 'emoji' }, level.treasure.emoji),
        ' ',
        level.treasure.name,
      ),
      h(
        'div',
        { class: 'actions' },
        button('קדימה, לכספת!', () => done('go'), { variant: 'primary', icon: '➔' }),
        canSpeak() ? button('הקראה', () => speak(speakText), { variant: 'ghost', icon: '🗣️', sfx: null }) : null,
        button('למגדל', () => done('map'), { variant: 'ghost', icon: '🏰' }),
      ),
    );
    const m = overlay('intro', card, `כספת: ${level.title}`);
    const done = (r: 'go' | 'map') => {
      stopSpeaking();
      void m.close().then(() => resolve(r));
    };
  });
}

// ------------------------------------------------------------------ tutorial

export function showTutorial(): Promise<void> {
  return new Promise((resolve) => {
    const tip = (icon: string, title: string, text: string) =>
      h('li', { class: 'tip' }, h('span', { class: 'tip-icon', 'aria-hidden': 'true' }, icon),
        h('div', {}, h('strong', {}, title), h('p', {}, text)));
    const card = h(
      'div',
      { class: 'card tutorial-card' },
      h('h2', {}, 'איך פורצים כספת?'),
      h(
        'ul',
        { class: 'tips' },
        tip('🐾', 'קופצים לאבן צמודה', 'נגעי באבן שליד צל כדי לקפוץ אליה. במקלדת — החצים. האבנים שזוהרות בתכלת הן הצעדים האפשריים.'),
        tip('🔢', 'רק אבנים בטוחות', 'דרכי רק על מספרים שמתאימים לחוק של המנעול. אבן נכונה נדלקת בירוק.'),
        tip('🔔', 'שלושה פעמונים', 'צעד שגוי מצלצל בפעמון. בפעמון השלישי השומר מתעורר — וצל חוזרת להתחלה.'),
        tip('🔍', 'תקועה?', 'זכוכית המגדלת מראה את הצעד הבא — אבל אז אפשר לקבל רק 2 כוכבים.'),
        tip('🚪', 'עד הדלת', 'הגיעי לאבן שמתחת לדלת הכספת, והיא תיפתח.'),
      ),
      h('div', { class: 'actions' }, button('הבנתי, יוצאות לדרך!', () => void m.close().then(resolve), { variant: 'primary' })),
    );
    const m = overlay('tutorial', card, 'הדרכה');
  });
}

// ------------------------------------------------------------------ reset

export async function showGuardWake(): Promise<void> {
  const card = h(
    'div',
    { class: 'card wake-card' },
    h('img', { class: 'wake-bell', src: IMG.bell, alt: '' }),
    h('h2', {}, 'השומר התעורר! 😾'),
    h('p', {}, 'שלושה פעמונים צלצלו. צל חוזרת לנקודת ההתחלה — הפעמונים נרגעו, ואפשר לנסות שוב, בשקט.'),
  );
  const m = overlay('wake', card, 'השומר התעורר');
  await wait(2600);
  await m.close();
}

// ------------------------------------------------------------------ complete

export interface CompleteInfo {
  level: Level;
  stars: number;
  mistakes: number;
  hinted: boolean;
  improved: boolean;
  firstTime: boolean;
  nextLabel: string | null;
  secretJustUnlocked: boolean;
}

export function showComplete(info: CompleteInfo): Promise<'next' | 'replay' | 'map'> {
  return new Promise((resolve) => {
    const { level, stars, mistakes, hinted } = info;
    const reason =
      stars === 3
        ? 'בלי אף טעות ובלי רמזים — פריצה מושלמת!'
        : hinted && mistakes === 0
          ? 'בלי טעויות, אבל עם רמז אחד. בפעם הבאה — בלי זכוכית המגדלת?'
          : mistakes === 1
            ? 'טעות אחת בדרך. אפשר לחזור ולנסות בלי אף אחת.'
            : `${mistakes} טעויות בדרך. כל פריצה מחדדת את העין!`;

    const starsEl = starsRow(0, 3, 'big');
    const card = h(
      'div',
      { class: `card complete-card ${level.secret ? 'is-secret' : ''}` },
      h('div', { class: 'complete-vault' }, h('img', { src: IMG.doorOpen, alt: '' })),
      h('h2', { class: 'complete-title' }, 'הכספת נפתחה!'),
      starsEl,
      info.improved && !info.firstTime ? h('p', { class: 'badge-new' }, 'שיא חדש!') : null,
      h('p', { class: 'complete-reason' }, reason),
      h(
        'div',
        { class: 'treasure-return' },
        h('span', { class: 'treasure-emoji', 'aria-hidden': 'true' }, level.treasure.emoji),
        h('p', {}, level.secret ? 'צל מצאה את הקמע האבוד שלה!' : `החזרת את ${level.treasure.name} ${level.treasure.to}!`),
      ),
      info.secretJustUnlocked
        ? h('p', { class: 'secret-unlocked' }, `✨ אספת ${SECRET_UNLOCK_STARS} כוכבים — נפתח קיר סודי בראש המגדל!`)
        : null,
      h(
        'div',
        { class: 'actions' },
        info.nextLabel ? button(info.nextLabel, () => done('next'), { variant: 'primary', icon: '➔' }) : null,
        button('לשחק שוב', () => done('replay'), { variant: 'brass', icon: '↻' }),
        button('למגדל', () => done('map'), { variant: info.nextLabel ? 'ghost' : 'primary', icon: '🏰' }),
      ),
    );
    const m = overlay('complete', card, 'הכספת נפתחה');
    const done = (r: 'next' | 'replay' | 'map') => void m.close().then(() => resolve(r));

    // הכוכבים נוחתים אחד-אחד, כל אחד עם צליל וניצוץ
    void (async () => {
      await wait(450);
      const slots = starsEl.querySelectorAll<HTMLElement>('.star');
      for (let i = 0; i < stars; i++) {
        const s = slots[i];
        s.classList.replace('off', 'on');
        s.classList.add('pop');
        Sound.play('star_pop', { rate: 1 + i * 0.12 });
        const c = centerOf(s);
        FX.burst('star', c.x, c.y, 10);
        await wait(380);
      }
      starsEl.setAttribute('aria-label', `${stars} כוכבים מתוך 3`);
    })();
  });
}

// ------------------------------------------------------------------ finale

export function showFinale(save: SaveData, secret: boolean): Promise<void> {
  return new Promise((resolve) => {
    const total = MAIN_LEVELS.reduce((s, l) => s + (save.stars[l.id] ?? 0), 0);
    const shelf = h('div', { class: 'finale-shelf' });
    for (const l of MAIN_LEVELS) {
      shelf.append(h('span', { class: 'shelf-item', title: l.treasure.name }, l.treasure.emoji));
    }
    const teaser = secret
      ? null
      : total >= SECRET_UNLOCK_STARS
        ? h('p', { class: 'secret-unlocked' }, '✨ ובראש המגדל נפתח קיר סודי... מה מסתתר שם?')
        : h('p', { class: 'finale-teaser' }, `שמועה במגדל: מי שתאסוף ${SECRET_UNLOCK_STARS} כוכבים תגלה כספת סודית. יש לך ${total}.`);

    const card = h(
      'div',
      { class: 'card finale-card' },
      h('img', { class: 'finale-cat', src: IMG.catCelebrate, alt: 'צל חוגגת' }),
      h('h2', {}, secret ? 'הקמע של צל נמצא!' : 'כל האוצרות חזרו הביתה!'),
      h(
        'p',
        {},
        secret
          ? 'גם הכספת הסודית נפרצה. צל, חתולת הצללים, היא עכשיו הפורצת הגדולה של המגדל.'
          : 'עשר כספות, עשרה אוצרות, ושומר אחד שלא הבין מה קרה. צל החזירה הכול לבעליו.',
      ),
      shelf,
      h('p', { class: 'finale-stars' }, `⭐ ${total} כוכבים מתוך 30`),
      teaser,
      h('div', { class: 'actions' }, button('למגדל', () => void m.close().then(resolve), { variant: 'primary', icon: '🏰' })),
    );
    const m = overlay('finale', card, 'סיום המסע');
    Sound.play('level_win', { delay: 0.2 });
    FX.rain(reducedMotion() ? 30 : 140);
    void animate(card, [{ transform: 'scale(.9)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
      duration: 420,
      easing: 'cubic-bezier(.2,.9,.3,1.2)',
    });
  });
}
