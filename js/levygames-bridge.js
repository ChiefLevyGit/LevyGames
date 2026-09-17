// גשר לקוד שאינו ES module.
//
// למה הוא קיים: שני משחקים (הבלשית הקטנה, פולשי החלל) כתובים בתוך <script>
// קלאסי ולא יכולים import, ו-code-a-bot הוא bundle של Vite שהמקור שלו יושב
// מחוץ לריפו ולכן לא יכול לייבא מודול מכאן בזמן build. שלושתם צריכים את אותה
// שכבת אחסון, ולכן הגשר חושף אותה על window.
//
// שימוש:
//   <script src="../../js/levygames-bridge.js"></script>
//   ...
//   const LG = await window.LevyGames.ready;   // null אם הטעינה נכשלה
//   const saved = await LG.storage.read('spaceinvaders.v1', null);
//
// אין כאן לוגיקה - רק העברה. המימוש היחיד נשאר ב-js/storage.js.

(function () {
  const selfUrl = document.currentScript?.src
    || new URL('js/levygames-bridge.js', location.href).href;
  const moduleUrl = (name) => new URL(name, selfUrl).href;

  const bridge = {};
  window.LevyGames = bridge;

  bridge.ready = Promise.all([
    import(moduleUrl('./storage.js?v=1')),
    import(moduleUrl('./profiles.js?v=1')),
    import(moduleUrl('./sfx.js?v=1')),
  ]).then(([storage, profiles, sfx]) => {
    Object.assign(bridge, { storage, profiles, sfx }); // גם גישה ישירה, אחרי ש-ready נפתר
    return { storage, profiles, sfx };
  }).catch((err) => {
    // לא מפילים את המשחק בגלל אחסון - הוא ימשיך לעבוד, פשוט בלי שמירה
    console.warn('טעינת שכבת האחסון נכשלה - המשחק ימשיך בלי שמירה', err);
    return null;
  });
}());
