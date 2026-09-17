import { motion, useReducedMotion, type TargetAndTransition } from 'framer-motion';
import type { Alive, Hood, WordLevel } from '../types';
import { HOOD_BY_ID } from '../data/levels';
import { spriteUrl } from '../data/sprites';
import { BurstConfetti, DustRing, Sparks } from './LandingFX';

/**
 * פאנל שכונה אחת — מסך המשחק.
 *
 * הרקעים הם משטחי עומק עם נקודת מגוז מרכזית, ולכן הגודל נגזר מ-y:
 * גבוה במסך = רחוק = קטן. אובייקט אחד לכל מילה, ולכן הם גדולים —
 * ~11 פריטים במסך ולא 23 כמו בסבב הקודם.
 */

/** 0.55 באופק ועד 1.25 בחזית. */
const depthScale = (y: number) => 0.55 + (Math.min(Math.max(y, 30), 95) - 30) / 65 * 0.7;

/** רוחב בסיס של אובייקט, באחוזים מרוחב הפאנל. */
const BASE_W = 18;

const IDLE: Record<Alive, TargetAndTransition> = {
  drive: { x: [0, 10, 0], transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } },
  splash: { scaleY: [1, 1.05, 1], transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } },
  orbit: { rotate: [0, 8, 0, -8, 0], transition: { duration: 9, repeat: Infinity, ease: 'easeInOut' } },
  sway: { rotate: [0, 2.5, 0, -2.5, 0], transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' } },
  hop: { y: [0, -7, 0], transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } },
};

/** רגע הפגיעה בקרקע, כשבר מתוך משך אנימציית הנפילה. */
const IMPACT_AT = 0.42;
const FALL_SEC = 1.6;

function CityItem({
  level, landing, reduced,
}: {
  level: WordLevel;
  landing: boolean;
  reduced: boolean;
}) {
  const { x, y } = level.pos;
  const scale = depthScale(y);
  const box = {
    left: `${x}%`,
    top: `${y}%`,
    width: `${BASE_W * scale}%`,
    translate: '-50% -85%',
    // הפריט שנוחת עולה מעל כל השאר — הוא הפרס, שום גג לא יסתיר אותו
    zIndex: landing ? 9000 : Math.round(y * 10),
  } as const;

  if (!landing) {
    return (
      <motion.div
        className="absolute"
        style={box}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        <motion.img
          src={spriteUrl(level.sprite)}
          alt={level.word}
          draggable={false}
          loading="lazy"
          className="w-full select-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.18)]"
          animate={level.alive ? IDLE[level.alive] : undefined}
        />
      </motion.div>
    );
  }

  // ── רצף הנחיתה ─────────────────────────────────────────────────────────
  if (reduced) {
    return (
      <motion.div
        className="absolute"
        style={box}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <img src={spriteUrl(level.sprite)} alt={level.word} className="w-full" />
      </motion.div>
    );
  }

  // מרחק הנפילה נגזר מהמקום שיש *מעל* הפריט. הפאנל הוא overflow-hidden,
  // ולכן ערך קבוע היה מתחיל מחוץ לו — ופריט שמונח גבוה (ירח, שמש) היה
  // נופל כמעט כולו מחוץ למסך, בדיוק ברגע שאמור להיות הפרס.
  const fall = Math.min(320, Math.max(90, y * 4.2));

  return (
    <div className="absolute" style={box}>
      <motion.div
        className="relative origin-bottom"
        initial={{ y: -fall, opacity: 0, rotate: -16 }}
        animate={{
          y: [-fall, 0, -30, 0],
          opacity: [0, 1, 1, 1],
          rotate: [-16, 0, 0, 0],
          scaleY: [1, 0.7, 1.08, 1],
          scaleX: [1, 1.32, 0.95, 1],
        }}
        transition={{
          duration: FALL_SEC,
          times: [0, IMPACT_AT, 0.62, 0.8],
          ease: ['easeIn', 'easeOut', 'easeInOut'],
        }}
      >
        <motion.img
          src={spriteUrl(level.sprite)}
          alt={level.word}
          draggable={false}
          className="w-full select-none drop-shadow-[0_10px_14px_rgba(0,0,0,0.3)]"
          animate={{ filter: ['brightness(1)', 'brightness(1.45)', 'brightness(1)'] }}
          transition={{ duration: 0.5, delay: FALL_SEC * IMPACT_AT, times: [0, 0.25, 1] }}
        />
        <DustRing delay={FALL_SEC * IMPACT_AT} />
        <Sparks delay={FALL_SEC * IMPACT_AT} />
        <BurstConfetti delay={FALL_SEC * IMPACT_AT + 0.05} />
      </motion.div>
    </div>
  );
}

export function CityPanel({
  hood, unlocked, landingId,
}: {
  hood: Hood;
  unlocked: WordLevel[];
  landingId?: string | null;
}) {
  const meta = HOOD_BY_ID.get(hood)!;
  const items = unlocked.filter((l) => l.hood === hood);
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden rounded-2xl bg-sky-100 bg-cover bg-center"
      style={{ backgroundImage: `url(${meta.bg})` }}
      // רעד עדין ברגע הפגיעה — מספיק כדי להרגיש, לא מספיק כדי להפריע
      animate={landingId && !reduced ? { x: [0, -5, 5, -3, 0] } : { x: 0 }}
      transition={{ duration: 0.34, delay: FALL_SEC * IMPACT_AT }}
      role="img"
      aria-label={`${meta.label} — ${items.length} פריטים`}
    >
      {items.map((l) => (
        <CityItem key={l.id} level={l} landing={l.id === landingId} reduced={reduced} />
      ))}

      <div className="absolute top-2 right-3 rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-slate-700 backdrop-blur-sm">
        {meta.label}
      </div>
    </motion.div>
  );
}
