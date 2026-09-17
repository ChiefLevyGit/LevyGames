import { motion } from 'framer-motion';

/**
 * אפקטי הנחיתה — הפרס על פתרון המילה.
 * הכל ממוקם יחסית לנקודת הנחיתה ולא למרכז המסך, כי שם העין של הילדה.
 */

const SPARK = ['#facc15', '#fb923c', '#f472b6', '#34d399', '#60a5fa', '#c084fc'];

/** טבעת אבק שמתרחבת ומתפוגגת ברגע הפגיעה בקרקע. */
export function DustRing({ delay }: { delay: number }) {
  return (
    <motion.span
      className="pointer-events-none absolute left-1/2 bottom-0 h-3 w-24 -translate-x-1/2 rounded-[100%] border-2 border-white/80 bg-white/35"
      initial={{ scale: 0.2, opacity: 0 }}
      animate={{ scale: [0.2, 1.9, 2.6], opacity: [0, 0.85, 0] }}
      transition={{ delay, duration: 0.75, ease: 'easeOut' }}
    />
  );
}

/** ניצוצות שמתפזרים מנקודת הנחיתה. */
export function Sparks({ delay, count = 14 }: { delay: number; count?: number }) {
  return (
    <span className="pointer-events-none absolute left-1/2 bottom-2">
      {Array.from({ length: count }, (_, i) => {
        // חצי מעגל כלפי מעלה — ניצוצות שיורדים למטה נראים כמו נזק, לא חגיגה
        const angle = Math.PI + (i / (count - 1)) * Math.PI;
        const dist = 48 + (i % 4) * 22;
        return (
          <motion.span
            key={i}
            className="absolute h-2 w-2 rounded-full"
            style={{ background: SPARK[i % SPARK.length] }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist * 0.8,
              scale: [0, 1.2, 0],
              opacity: [0, 1, 0],
            }}
            transition={{ delay, duration: 0.85, ease: 'easeOut' }}
          />
        );
      })}
    </span>
  );
}

/** קונפטי סביב הפריט שנחת — לא ממרכז המסך. */
export function BurstConfetti({ delay, count = 22 }: { delay: number; count?: number }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 70 + (i % 5) * 34;
        return (
          <motion.span
            key={i}
            className="absolute h-2.5 w-2 rounded-[2px]"
            style={{ background: SPARK[i % SPARK.length] }}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist + 90,
              opacity: [0, 1, 1, 0],
              rotate: 420,
            }}
            transition={{ delay, duration: 1.35, ease: 'easeOut' }}
          />
        );
      })}
    </span>
  );
}
