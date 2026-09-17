import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

/**
 * שני קישורים ב-index.html מצביעים על קבצים *משותפים עם הפורטל*
 * (`../../manifest.webmanifest` ו-`../../assets/apple-touch-icon.png`), ולא על
 * נכסים של המשחק.
 *
 * מאז שהמקור יושב בתוך הריפו, Vite פותר את `../../` לקבצים אמיתיים ומעתיק
 * אותם ל-`assets/` של המשחק. זה גם משכפל נכסים, וגם **שובר את ה-PWA**:
 * ל-manifest של הפורטל יש `scope: "./"` יחסי, וכעותק בתוך
 * `games/code-a-bot/assets/` ה-scope שלו הופך לתיקייה ההיא במקום לשורש האתר.
 *
 * לכן התגים לא יושבים ב-index.html אלא מוזרקים כאן ב-`order: 'post'` —
 * אחרי שלב פתרון הנכסים — כך ש-Vite לא נוגע בהם והם נשארים יחסיים לפורטל.
 */
const portalSharedLinks = (): Plugin => ({
  name: 'levygames-portal-shared-links',
  transformIndexHtml: {
    order: 'post',
    handler: (html) => ({
      html,
      tags: [
        {
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: '../../assets/apple-touch-icon.png' },
          injectTo: 'head',
        },
        {
          tag: 'link',
          attrs: { rel: 'manifest', href: '../../manifest.webmanifest' },
          injectTo: 'head',
        },
      ],
    }),
  },
})

// base './' — כדי שה-build ירוץ גם כתת-תיקייה בפורטל Levy Games
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), portalSharedLinks()],
})
