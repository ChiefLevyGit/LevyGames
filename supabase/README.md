# הפעלת חשבונות וסנכרון (Supabase)

בלי השלבים האלה האתר עובד מקומית בדיוק כמו קודם. כפתור ההתחברות פשוט לא
מוצג. אחרי שמסיימים אותם, מופיע ב-nav כפתור 👤.

## 1. פרויקט
1. ב-supabase.com: **New project**. שם `levy-games`, אזור `eu-central-1` (פרנקפורט).
2. **SQL Editor > New query**: מדביקים את `schema.sql` ולוחצים **Run**.
3. **Project Settings > API**: מעתיקים את `Project URL` ואת ה-`anon public` key
   אל `js/supabase-config.js`. **לא** את ה-`service_role`.

## 2. כתובות חזרה
**Authentication > URL Configuration**:
- **Site URL:** `https://chieflevygit.github.io/LevyGames/`
- **Redirect URLs** (שתיהן):
  - `https://chieflevygit.github.io/LevyGames/**`
  - `http://localhost:8000/**`

ביום המעבר ל-Vercel/Netlify מוסיפים גם את הדומיין החדש.

## 3. אימייל + סיסמה
**Authentication > Providers > Email**: מופעל כברירת מחדל.
- **Confirm email** פועל כברירת מחדל: אחרי "הרשמה" נשלח מייל אישור. אפשר לכבות
  את זה אם רוצים כניסה מיידית.
- שם משתמש בלי אימייל לא נתמך ב-Supabase. החשבון הוא של ההורה, אז אימייל זה בסדר.

## 4. Google
1. ב-Google Cloud Console: פרויקט חדש, ואז **APIs & Services > OAuth consent screen**:
   - External
   - שם האפליקציה: Levy Games
   - אימייל תמיכה
   - Publish app (אחרת רק משתמשי test יכולים להיכנס)
2. **Credentials > Create credentials > OAuth client ID** מסוג Web application:
   - **Authorized JavaScript origins:** `https://chieflevygit.github.io`
   - **Authorized redirect URIs:** את הכתובת שמוצגת ב-Supabase תחת
     Authentication > Providers > Google. בדרך כלל `https://<ref>.supabase.co/auth/v1/callback`.
3. ב-Supabase, **Providers > Google**: מפעילים ומדביקים Client ID ו-Client Secret.

## 5. בדיקה
- `python -m http.server 8000`, ואז "המשך עם Google". אחרי החזרה צריכה להופיע נקודה ירוקה על 👤.
- בחלון incognito עם אותו חשבון: הבנות וההתקדמות אמורות להופיע.
- **Table Editor > kv**: שורה לכל מפתח, וכל השורות עם `account_id` של החשבון.

## איך זה עובד (בקצרה)
- **local-first:** המשחקים כותבים רק מקומית. `js/cloud-sync.js` משקף לענן כל
  שינוי ב-`levygames.*`, עם דחייה של 2 שניות, ומושך שינויים בכל טעינת דף.
- **offline:** שינויים שלא נשלחו נשמרים בתור (`lgsync.meta`), ונשלחים בפעם הבאה שיש רשת.
- **לא מסתנכרן:**
  - השתקת סאונד (העדפת מכשיר)
  - "מי משחקת עכשיו" (`activeId`)
  - דלי האורח
- **פרופיל עם אותו שם בשני מכשירים = אותה ילדה.** הנתונים שלה ממוזגים.
- **קונפליקט:** סטטיסטיקות והתקדמות ממוזגות (max/union). בשאר המפתחות מנצחת
  הכתיבה האחרונה.
