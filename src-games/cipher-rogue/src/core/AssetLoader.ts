import { IMG } from '../media.ts';

/**
 * טעינה מוקדמת של התמונות, עם התקדמות למסך הטעינה. תמונה שנכשלה לא עוצרת
 * כלום: לכל אבן ולכל משטח יש ב-CSS צבע ומסגרת משלהם, כך שהמשחק שחיק גם
 * בלי אף נכס גרפי (שכבת ה-fallback מ-creation flow.md).
 */
export async function preload(onProgress: (done: number, total: number) => void): Promise<string[]> {
  const urls = Object.values(IMG);
  const failed: string[] = [];
  let done = 0;
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          const finish = (ok: boolean) => {
            if (!ok) failed.push(src);
            onProgress(++done, urls.length);
            resolve();
          };
          img.onload = () => finish(true);
          img.onerror = () => finish(false);
          img.src = src;
        }),
    ),
  );
  if (failed.length) document.documentElement.classList.add('assets-partial');
  return failed;
}
