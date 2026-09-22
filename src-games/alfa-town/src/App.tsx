import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Map, ArrowRight } from 'lucide-react';
import type { Hood } from './types';
import { useWordGame } from './hooks/useWordGame';
import { TIER_LABEL } from './data/levels';
import { CityMap } from './components/CityMap';
import { CityPanel } from './components/CityPanel';
import { HoodPanel } from './components/HoodPanel';
import { ClueBar } from './components/ClueBar';
import { WordSlots, FinalLetterToast } from './components/WordSlots';
import { HebrewKeyboard } from './components/HebrewKeyboard';
import { WinBar } from './components/WinOverlay';
import { Splash } from './components/Splash';
import { PrizeMeter } from './components/PrizeMeter';
import { SoundToggle } from './components/SoundToggle';
import { keyTap, uiBack, uiSelect, stopSpeaking } from './audio';

export default function App() {
  const g = useWordGame();
  // מסך הכניסה מוצג בכל טעינה ונסגר בלחיצה — הוא חלק מהטקס של להיכנס
  // למשחק, ולכן לא נשמר כהעדפה.
  const [splash, setSplash] = useState(true);
  /** השכונה שהפאנל שלה פתוח במפה. */
  const [openHood, setOpenHood] = useState<Hood | null>(null);

  /** אין מילה נוכחית = נמצאים במפה. */
  const onMap = g.level === null;

  // מקלדת פיזית — למי שמשחקת על מחשב
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (splash || onMap || g.status !== 'playing') return;
      if (e.key.length === 1 && /[א-ת]/.test(e.key)) {
        keyTap();
        g.press(e.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g, onMap, splash]);

  useEffect(() => () => stopSpeaking(), []);

  const dimmed = g.status === 'playing' ? 1 : 0.25;

  return (
    <div className="relative grid h-[100dvh] grid-rows-[auto_minmax(0,1fr)] gap-1 overflow-hidden bg-gradient-to-b from-pink-50 via-violet-50 to-sky-50 px-2 pb-2 pt-1.5">
      {/* ── כותרת ─────────────────────────────────────────────── */}
      {/* לא מרונדרת מתחת למסך הכניסה: שני מתגי קול זהים ב-DOM מבלבלים
          קורא מסך, וגם אין טעם בכותרת שמוסתרת ממילא. */}
      {!splash && <header className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <a
            href="../../index.html"
            aria-label="לכל המשחקים"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/80 text-slate-600 shadow-sm active:scale-95"
          >
            <ArrowRight className="h-5 w-5" />
          </a>
          {onMap ? (
            <>
              <h1 className="text-[2.6dvh] font-black leading-none text-violet-800">אלפא־טאון</h1>
              <span className="rounded-full bg-violet-200 px-2 py-0.5 text-xs font-bold text-violet-800">
                {g.earnedObjects}/{g.totalObjects} פריטים
              </span>
            </>
          ) : (
            <PrizeMeter next={g.nextObject} filled={g.meterFilled} total={g.wordsPerPrize} />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {!onMap && (
            <button
              type="button"
              onClick={() => { uiBack(); g.leaveHood(); }}
              className="flex h-9 items-center gap-1 rounded-full bg-white/80 px-3 text-xs font-bold text-slate-600 shadow-sm active:scale-95"
            >
              <Map className="h-4 w-4" />
              {TIER_LABEL[g.tier]}
            </button>
          )}
          <SoundToggle />
        </div>
      </header>}

      {/* ── מפה או משחק ───────────────────────────────────────── */}
      {onMap ? (
        <CityMap
          tier={g.tier}
          onTier={(t) => { uiSelect(); g.setTier(t); }}
          statusOf={g.hoodStatus}
          onOpen={(h) => { uiSelect(); setOpenHood(h); }}
        />
      ) : (
        <div
          className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto_auto] gap-1"
          onPointerDown={g.status === 'landing' ? g.skipLanding : undefined}
        >
          {/* z-0 יוצר הקשר ערימה משלו: הפריטים בעיר ממוינים לפי עומק עם
              ערכי z גבוהים, ובלי זה הם מטפסים מעל השכבות וחוסמים לחיצות. */}
          <section dir="ltr" className="relative z-0 min-h-0 overflow-hidden rounded-2xl">
            <CityPanel
              hood={g.hood}
              objects={g.unlockedObjects}
              landingId={g.landing?.id ?? null}
            />
          </section>

          {/* בזמן הנחיתה הרמז והמקלדת דוהים — המסך שייך לפרס */}
          <motion.section
            className="flex shrink-0 flex-col items-center gap-2 pb-1"
            animate={{ opacity: dimmed }}
            transition={{ duration: 0.3 }}
          >
            {g.level && (
              <>
                <ClueBar level={g.level} onHint={g.hint} hintDisabled={g.status !== 'playing'} />
                <WordSlots slots={g.slots} />
              </>
            )}
          </motion.section>

          <motion.section
            className="shrink-0"
            animate={{ opacity: dimmed }}
            transition={{ duration: 0.3 }}
          >
            {g.level && (
              <HebrewKeyboard
                rows={g.keyboard}
                states={g.keyStates}
                onPress={(l) => { keyTap(); g.press(l); }}
                disabled={g.status !== 'playing'}
              />
            )}
          </motion.section>
        </div>
      )}

      <FinalLetterToast letter={g.finalLesson} />

      <AnimatePresence>
        {openHood && (
          <HoodPanel
            key="hoodpanel"
            hood={openHood}
            status={g.hoodStatus(openHood)}
            onPlay={() => { uiSelect(); g.enterHood(openHood); setOpenHood(null); }}
            onClose={() => { uiBack(); setOpenHood(null); }}
          />
        )}

        {g.status === 'won' && g.level && (
          <WinBar
            key="win"
            level={g.level}
            stars={g.stars}
            prize={g.landing}
            nextPrize={g.nextObject}
            wordsLeft={g.wordsPerPrize - g.meterFilled}
            onNext={g.next}
            onReplay={g.replay}
            onMap={g.leaveHood}
            isLastInHood={g.solvedInHood >= g.hoodTotal}
          />
        )}

        {splash && (
          <Splash key="splash" onEnter={() => setSplash(false)} totalSolved={g.totalSolved} />
        )}
      </AnimatePresence>
    </div>
  );
}
