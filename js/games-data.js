// רשימת המשחקים שמופיעים בדף הבית.
// כל פעם שבונים משחק חדש - פשוט מוסיפים כאן אובייקט נוסף, וזהו.
export const GAMES = [
  {
    id: 'chess',
    emoji: '♞',
    name: 'ממלכת הקסמים - שחמט',
    description: 'לוח שחמט קסום בשלושה מצבים: עם כל חוקי השחמט, נגד המחשב, או חופשי לגמרי בלי חוקים. תפסי את המלך של היריבה!',
    playUrl: 'games/chess/index.html',
    instructionsUrl: 'games/chess/instructions.html',
  },
  {
    id: 'tasks',
    emoji: '🃏',
    name: 'משחק המשימות',
    description: '54 משימות מצחיקות: להגריל אחת במסך, או לשלוף קלף מחפיסה אמיתית ולמצוא אותו כאן. קפיצות, פנטומימה וחיבוקים.',
    playUrl: 'games/tasks/index.html',
    instructionsUrl: 'games/tasks/instructions.html',
  },
  {
    id: 'spaceinvaders',
    emoji: '👾',
    name: 'פולשי החלל',
    description: 'קרב חלל קלאסי: עצרי את פלישת החייזרים לפני שהם מגיעים לספינה שלך. מגנים, ניקוד ושיא אישי.',
    playUrl: 'games/spaceinvaders/index.html',
    instructionsUrl: 'games/spaceinvaders/instructions.html',
  },
];
