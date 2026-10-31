import { defineConfig, type Plugin } from 'vite'

/**
 * `manifest.webmanifest` ו-`apple-touch-icon.png` שייכים לפורטל, לא למשחק.
 * אם הם יושבים ב-index.html, Vite פותר את `../../` לקבצים אמיתיים ומעתיק אותם
 * ל-assets/ של המשחק - וה-manifest המועתק מקבל scope של התיקייה ההיא ושובר את
 * ה-PWA. לכן מזריקים אותם כאן ב-`order: 'post'`, אחרי שלב פתרון הנכסים.
 * (אותו פתרון בדיוק כמו ב-alfa-town ו-code-a-bot; ראו CLAUDE.md של הריפו.)
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

// base './' - אותו build רץ כתת-תיקייה בפורטל וגם בשורש דומיין.
export default defineConfig({
  base: './',
  plugins: [portalSharedLinks()],
  build: {
    // וידאו ואודיו לא מוטמעים כ-base64 גם כשהם קטנים
    assetsInlineLimit: (file) => (/\.(mp4|mp3)$/.test(file) ? false : undefined),
  },
})
