import { motion } from 'framer-motion';

/**
 * מסך הכניסה. התמונה היא שער אבן עם חור מנעול שמסגר את העיר — ולכן היא
 * עובדת כמסך כותרת ולא כמפה: המרכז שלה תפוס בקשת, והנוף כבר מלא.
 * הכפתור יושב על הדרך שמובילה אל השער.
 */
export function Splash({ onEnter, totalSolved }: { onEnter: () => void; totalSolved: number }) {
  return (
    <motion.div
      className="absolute inset-0 z-50 overflow-hidden rounded-2xl bg-cover bg-center"
      style={{ backgroundImage: 'url(bg/full-town.webp)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.45 }}
    >
      {/* הכהיה עדינה בקצה העליון והתחתון, כדי שהטקסט ייקרא מעל הציור */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/45 via-transparent to-slate-900/45" />

      <div className="relative flex h-full flex-col items-center justify-between py-[3dvh]">
        <motion.div
          className="text-center"
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 240, damping: 20 }}
        >
          <h1 className="text-[7dvh] font-black leading-none text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.75)]">
            אלפא־טאון
          </h1>
          <p className="mt-1 text-[2.4dvh] font-bold text-amber-100 drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]">
            העיר שנבנית ממילים
          </p>
        </motion.div>

        <motion.button
          type="button"
          onClick={onEnter}
          autoFocus
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 18 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-full border-b-[6px] border-emerald-700 bg-emerald-500 px-10 py-4 text-[3.2dvh] font-black text-white shadow-2xl"
        >
          {totalSolved > 0 ? 'ממשיכות לבנות! 🏙️' : 'נכנסות לעיר! 🏙️'}
        </motion.button>
      </div>
    </motion.div>
  );
}
