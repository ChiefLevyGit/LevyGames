/** רמת גיל. מנוע אחד — שלוש קונפיגורציות של רמז ומקלדת. */
export type Tier = 1 | 2 | 3;

/** שכונה בעיר. כל אחת היא מסך משחק עם רקע משלה. */
export type Hood = 'downtown' | 'park' | 'shore' | 'space';

/** אנימציית "התעוררות" שמופעלת על הפריט אחרי שנחת. */
export type Alive = 'drive' | 'splash' | 'orbit' | 'sway' | 'hop';

export interface Sprite {
  /** מפתח לוגי, למשל 'house' */
  id: string;
  /** שם הקובץ תחת public/sprites */
  file: string;
  /** תווית עברית — לקורא מסך ולפאנל האוסף */
  label: string;
}

/**
 * מילה. מנותקת מהאובייקט: המילים הן העבודה, האובייקטים הם הפרס, ופרס ניתן
 * כל WORDS_PER_PRIZE מילים. לכן מילה לא צריכה ספרייט — חוץ מרמה 1, שבה
 * התמונה היא הרמז.
 */
export interface WordLevel {
  id: string;
  tier: Tier;
  hood: Hood;
  /** המילה בעברית, באיות מלא כולל אות סופית */
  word: string;
  /** הרמז. ברמה 1 זהו תיאור קצר שנלווה לתמונה; ברמות 2-3 זו החידה עצמה. */
  clue: string;
  /** רמה 1 בלבד — אינדקסים של אותיות שמוצגות גלויות מלכתחילה */
  revealed?: number[];
  /** רמה 1 בלבד — ספרייט לתמונת הרמז */
  pic?: string;
}

/** אובייקט בעיר. נפתח בסדר הרשימה, אחד לכל WORDS_PER_PRIZE מילים בשכונה. */
export interface CityObject {
  id: string;
  hood: Hood;
  sprite: string;
  /** מיקום באחוזים בתוך פאנל השכונה. y קובע גם את הגודל (פרספקטיבה). */
  pos: { x: number; y: number };
  alive?: Alive;
}

export type Status = 'playing' | 'landing' | 'won' | 'done';

export interface SavedProgress {
  /** גרסת סכמה. v2 הסירה את שדה `decor` של הצמיחה-לפי-אות. */
  v: 2;
  tier: Tier;
  /** מזהי מילים שהושלמו */
  solved: string[];
  /** כוכבים לכל מילה שהושלמה */
  stars: Record<string, 1 | 2 | 3>;
}
