# Levy Games

פורטל המשחקים המשפחתי של משפחת לוי. אתר סטטי, בעברית (RTL), בלי תלויות ובלי שלב build.

**חי כאן:** https://chieflevygit.github.io/LevyGames/

---

## המשחקים

| משחק | תיאור | נתיב |
|------|-------|------|
| ♞ ממלכת הקסמים - שחמט | מנוע שחמט מלא (הצרחה, אכילת דרך, הכתרה, שח/מט/פט ותיקו), או מצב חופשי בלי חוקים. עם ביטול מהלך, שמירת משחק ומשחק במקלדת. | `games/chess/` |
| 🃏 משחק המשימות | 54 משימות מצחיקות לגילאי 5-6. מצב הגרלה (לא צריך כלום) ומצב חפיסה (עם קלפים אמיתיים). | `games/tasks/` |

---

## הוספת משחק חדש

1. צרו תיקייה תחת `games/<id>/` עם `index.html` ו-`instructions.html`.
2. הוסיפו אובייקט אחד ל-`js/games-data.js`:

```js
{
  id: 'my-game',
  emoji: '🎯',
  name: 'שם המשחק',
  description: 'משפט אחד שמסביר מה עושים.',
  playUrl: 'games/my-game/index.html',
  instructionsUrl: 'games/my-game/instructions.html',
}
```

3. זהו. ההב בונה את הכרטיס לבד.

בכל דף חדש כדאי להעתיק מדף קיים את בלוק ה-`<meta>` וה-Open Graph (זה מה שמופיע כשמשתפים קישור בוואטסאפ), את `<link rel="manifest">` ואת `apple-touch-icon`.

---

## מבנה

```
index.html                 ההב
404.html                   דף שגיאה (GitHub Pages מגיש אותו אוטומטית)
manifest.webmanifest       הוספה למסך הבית
style.css                  עיצוב ההב (cyberpunk)
assets/                    אייקונים + תמונת שיתוף (og.png)
js/games-data.js           רשימת המשחקים - המקום היחיד שצריך לערוך
js/hub.js                  בונה את כרטיסי המשחקים
games/chess/               מנוע + ממשק השחמט
games/tasks/               משחק המשימות
```

---

## Cache-busting

GitHub Pages מגיש עם `Cache-Control: max-age=600`, כך שמשתמשת שכבר ביקרה עלולה לקבל CSS/JS ישנים אחרי עדכון. לכן לכל קובץ CSS/JS מצורף `?v=N` - גם בתגיות `<link>`/`<script>` וגם בשורות ה-`import` בתוך המודולים.

**כשמשנים CSS או JS - מעלים את המספר בכל המקומות:**

```bash
grep -rn "?v=" --include=*.html --include=*.js .
```

---

## פיתוח מקומי

צריך שרת מקומי - מודולי ES לא נטענים מ-`file://`:

```bash
python -m http.server 8000
# ואז: http://localhost:8000/
```

---

## אייקונים ותמונת שיתוף

`assets/` נוצר מסקריפט Python (Pillow) שמצייר את הרקע הניאוני ואת הכיתוב.
כדי לייצר מחדש - ראו `Design.info/` (לא עולה לגיט).
