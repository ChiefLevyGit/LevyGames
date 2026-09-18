// רשימת המשחקים שמופיעים בדף הבית.
// כל פעם שבונים משחק חדש - פשוט מוסיפים כאן אובייקט נוסף, וזהו.
//
// progressUnit (אופציונלי): מה סופרים בפס ההתקדמות של המשחק, למשל 'תיקים'.
// ברירת המחדל 'שלבים'. ה-id חייב להיות זהה ל-gameId שהמשחק שולח
// ל-reportProgress() - זה מה שמחבר את ההתקדמות לכרטיס.
//
// video + poster (אופציונלי, תמיד יחד): קליפ 2:1 שמחליף את האמוג'י בראש
// הכרטיס. הפאנל גדל לגובה באנר רק בכרטיסים כאלה. הוידאו נטען ומתנגן רק
// כשהכרטיס נכנס למסך, והפוסטר הוא מה שרואים לפני ובמצב "צמצום תנועה".
// איך מייצרים - ראו CLAUDE.md, פרק "וידאו על כרטיס".
export const GAMES = [
  {
    id: 'chess',
    emoji: '♞',
    name: 'ממלכת הקסמים - שחמט',
    description: 'לוח שחמט קסום בשלושה מצבים: עם כל חוקי השחמט, נגד המחשב, או חופשי לגמרי בלי חוקים. תפסי את המלך של היריבה!',
    playUrl: 'games/chess/index.html',
    instructionsUrl: 'games/chess/instructions.html',
    playLabel: 'כנסי לממלכה!',
    tags: ['משחק לשניים', 'נגד המחשב', 'חוקי קסם'],
    gradient: ['#C4B5FD', '#F0ABFC'],
  },
  {
    id: 'tasks',
    emoji: '🃏',
    name: 'משחק המשימות',
    description: '54 משימות מצחיקות: להגריל אחת במסך, או לשלוף קלף מחפיסה אמיתית ולמצוא אותו כאן. קפיצות, פנטומימה וחיבוקים.',
    playUrl: 'games/tasks/index.html',
    instructionsUrl: 'games/tasks/instructions.html',
    playLabel: 'שחקי עכשיו!',
    tags: ['לכל המשפחה', 'פעילות תנועה', '54 משימות'],
    gradient: ['#FDE68A', '#FCA5A5'],
  },
  {
    id: 'spaceinvaders',
    emoji: '👾',
    name: 'פולשי החלל',
    description: 'קרב חלל קלאסי: עצרי את פלישת החייזרים לפני שהם מגיעים לספינה שלך. מגנים, ניקוד ושיא אישי.',
    playUrl: 'games/spaceinvaders/index.html',
    instructionsUrl: 'games/spaceinvaders/instructions.html',
    playLabel: 'קדימה לחלל!',
    tags: ['חד-שחקן', 'ניקוד ושיא', 'קרב חלל'],
    gradient: ['#93C5FD', '#6EE7B7'],
  },
  {
    id: 'little-detective',
    emoji: '🕵️‍♀️',
    name: 'הבלשית הקטנה',
    description: '10 תיקי חקירה של היגיון: ארוניות שהתבלבלו, סוכן סודי מתחזה ומפתח אוצר. קראי רמזים, פסלי חשודים ופתרי בעצמך!',
    playUrl: 'games/Little-detective-new/index.html',
    instructionsUrl: 'games/Little-detective-new/instructions.html',
    playLabel: 'לחקירה!',
    progressUnit: 'תיקים',
    tags: ['חידות היגיון', '10 תיקים', 'גילאי 6-10'],
    gradient: ['#F2C14E', '#E8A0A0'],
  },
  {
    id: 'code-a-bot',
    emoji: '🤖',
    name: 'מבוך הפקודות',
    description: 'תכנתו את רובי הרובוט! בונים תוכנית מפקודות — קדימה, שמאלה, ימינה — ומובילים אותו אל הסוללה. 15 שלבים עם בורות, חיות מפחידות וכוכבים.',
    playUrl: 'games/code-a-bot/index.html',
    instructionsUrl: 'games/code-a-bot/instructions.html',
    playLabel: 'לתכנת את רובי!',
    tags: ['חשיבה תכנותית', '15 שלבים', 'גילאי 5-9'],
    gradient: ['#7DD3FC', '#C4B5FD'],
  },
  {
    id: 'alfa-town',
    emoji: '🏙️',
    name: 'אלפא־טאון',
    description: 'עיר שנבנית ממילים: כל מילה שפותרים מנחיתה בעיר גשר, אריה או חללית. ארבע שכונות, שלוש רמות גיל, 45 מילים — ובלי שום דרך להפסיד.',
    playUrl: 'games/alfa-town/index.html',
    instructionsUrl: 'games/alfa-town/instructions.html',
    playLabel: 'לבנות עיר!',
    tags: ['אוצר מילים', '45 מילים', 'גילאי 5-10'],
    progressUnit: 'מילים',
    gradient: ['#F9A8D4', '#C4B5FD'],
    badge: 'חדש!',
    video: 'assets/cards/alfa-town.mp4',
    poster: 'assets/cards/alfa-town.webp',
  },
];
