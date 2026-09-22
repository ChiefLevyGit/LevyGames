import { Volume2, VolumeX } from 'lucide-react';
import { isMuted, setMuted, uiTap } from '../audio';
import { useState } from 'react';

/**
 * מתג הקול. אייקון **ועוד תווית** — אייקון בודד בפינה הוא בדיוק מה שאלעד
 * לא מצא. מופיע בכל שלושת המסכים, כולל מסך הפתיחה שמכסה את הכותרת.
 *
 * ההעדפה נשמרת גלובלית (`sound.muted`) ולא לפי פרופיל: השתקה היא העדפת
 * מכשיר, ומעבר בין הבנות לא אמור להפעיל צליל בספרייה.
 */
export function SoundToggle({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [muted, setLocal] = useState(isMuted);

  const toggle = () => {
    const v = !muted;
    setMuted(v);
    setLocal(v);
    if (!v) uiTap(); // משמיעים רק כשמדליקים — אחרת זה קליק לתוך השתקה
  };

  const dark = tone === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!muted}
      aria-label={muted ? 'הפעלת צלילים' : 'השתקת צלילים'}
      className={[
        'flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold shadow-sm active:scale-95',
        muted
          ? 'bg-slate-300/90 text-slate-600'
          : dark
            ? 'bg-white/90 text-violet-700'
            : 'bg-white/80 text-slate-600',
      ].join(' ')}
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      {muted ? 'מושתק' : 'קול'}
    </button>
  );
}
