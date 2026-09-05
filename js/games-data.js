// רשימת המשחקים שמופיעים בדף הבית.
// כל פעם שבונים משחק חדש - פשוט מוסיפים כאן אובייקט נוסף, וזהו.
export const GAMES = [
  {
    id: 'chess',
    emoji: '♞',
    name: 'ממלכת הקסמים - שחמט',
    description: 'לוח שחמט קסום: עם כל חוקי השחמט, או במצב חופשי לגמרי בלי חוקים. תפסו את המלך של היריבה!',
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
];
