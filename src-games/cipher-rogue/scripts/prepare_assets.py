#!/usr/bin/env python3
"""
מכין את נכסי המדיה של Cipher Rogue מתוך art-src/ אל public/media/.

  npm run assets      (= python scripts/prepare_assets.py)

למה צריך את זה: כמעט כל התמונות שאלעד ייצר יושבות על רקע לבן, והמשחק כהה.
הרקע מוסר ב-flood fill מהשוליים ולא בסף גלובלי, כי לחתולה יש כפות וחזה לבנים -
סף גלובלי היה מוחק אותם. ה-flood fill נעצר בקו המתאר הכהה של האיור.

תלויות: Pillow + numpy, ו-ffmpeg ב-PATH (לחילוץ פריימים ולקידוד וידאו).
"""
from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src"
OUT = ROOT / "src" / "media"
REPO = ROOT.parent.parent  # LevyGames/
CARDS = REPO / "assets" / "cards"


# ---------------------------------------------------------------- keying

def background_mask(rgb: np.ndarray, lum_min: float, sat_max: int) -> np.ndarray:
    """פיקסלי רקע = בהירים ולא רוויים, ומחוברים לשולי התמונה."""
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    candidate = (lum >= lum_min) & (sat <= sat_max)
    h, w = candidate.shape
    bg = np.zeros_like(candidate)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if candidate[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if candidate[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    return bg


def dilate(mask: np.ndarray, r: int) -> np.ndarray:
    out = mask.copy()
    for _ in range(r):
        m = out.copy()
        m[1:, :] |= out[:-1, :]
        m[:-1, :] |= out[1:, :]
        m[:, 1:] |= out[:, :-1]
        m[:, :-1] |= out[:, 1:]
        out = m
    return out


def key_out(img: Image.Image, lum_min=228.0, sat_max=18, bg_level=255.0, feather=2) -> Image.Image:
    """מחזיר RGBA: רקע שקוף, ושוליים רכים שמנוקים מהלבן (un-matte)."""
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    bg = background_mask(rgb, lum_min, sat_max)
    alpha = np.where(bg, 0.0, 1.0)

    # רצועת שוליים: פיקסלים לא-רקע שנוגעים ברקע. שם האלפא נגזר מכמה הם
    # "לבנים", כדי שהאנטי-אליאסינג של האיור לא ישאיר הילה לבנה.
    edge = dilate(bg, feather) & ~bg
    lum = rgb.mean(axis=2)
    soft = np.clip((bg_level - lum) / (bg_level - 120.0), 0.0, 1.0)
    alpha = np.where(edge, np.minimum(alpha, soft), alpha)

    a = alpha[..., None]
    safe = np.maximum(a, 1e-3)
    color = (rgb - (1.0 - a) * bg_level) / safe
    color = np.clip(color, 0, 255)
    rgba = np.concatenate([color, alpha[..., None] * 255.0], axis=2).astype(np.uint8)
    return Image.fromarray(rgba)


def key_diff(img: Image.Image, opaque_box: tuple[int, int, int, int], t0=12.0, t1=90.0) -> Image.Image:
    """מפתוח לפי מרחק מצבע הרקע - לפריימי וידאו על רקע אפור בהיר.

    עשן, ניצוצות וצל הם תערובת של אפקט ורקע. סף בינארי משאיר אותם כ"כתם
    לבן", ואילו כאן האלפא יחסי להפרש מהרקע והצבע מנוקה ממנו, כך שהם
    הופכים להילה חצי-שקופה. בתוך opaque_box (פנים האריח) הכול אטום, כדי
    שעשן לבן על האבן לא ינקב בה חורים.
    """
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    diff = np.abs(rgb - bg).max(axis=2)
    alpha = np.clip((diff - t0) / (t1 - t0), 0.0, 1.0)
    x0, y0, x1, y1 = opaque_box
    alpha[y0:y1, x0:x1] = 1.0
    a = alpha[..., None]
    color = np.clip((rgb - (1.0 - a) * bg) / np.maximum(a, 1e-3), 0, 255)
    rgba = np.concatenate([color, a * 255.0], axis=2).astype(np.uint8)
    return Image.fromarray(rgba)


def crop_to_alpha(img: Image.Image, pad: int = 4) -> Image.Image:
    a = np.asarray(img)[..., 3]
    ys, xs = np.where(a > 8)
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, img.width)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, img.height)
    return img.crop((x0, y0, x1, y1))


def fit(img: Image.Image, max_w: int | None = None, max_h: int | None = None) -> Image.Image:
    w, h = img.size
    s = 1.0
    if max_w:
        s = min(s, max_w / w)
    if max_h:
        s = min(s, max_h / h)
    if s < 1.0:
        img = img.resize((round(w * s), round(h * s)), Image.LANCZOS)
    return img


def save_webp(img: Image.Image, name: str, quality: int = 86) -> None:
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"  {name:34s} {img.width}x{img.height}  {path.stat().st_size // 1024}KB")


# ---------------------------------------------------------------- sprites

SPRITES = [
    # (קובץ מקור, שם יעד, max_w, max_h)
    ("chibi cat.jpg", "sprites/cat-idle.webp", None, 460),
    ("cat rogue creeping.jpg", "sprites/cat-creep.webp", None, 460),
    ("chibi cat rogue leaping.jpg", "sprites/cat-leap.webp", None, 460),
    ("chibi cat startled.jpg", "sprites/cat-startled.webp", None, 460),
    ("chibi cat puzzled.jpg", "sprites/cat-puzzled.webp", None, 460),
    ("chibi cat celebrating.jpg", "sprites/cat-celebrate.webp", None, 460),
    ("medieval vault door.jpg", "sprites/door-closed.webp", 900, None),
    ("medieval vault door-open.jpg", "sprites/door-open.webp", 900, None),
    ("red alarm bell.jpg", "sprites/bell.webp", 220, None),
    ("blue crystal eye.jpg", "sprites/eye.webp", 320, None),
    ("icon button.jpg", "sprites/magnifier.webp", 220, None),
    ("ribbon banner.jpg", "sprites/banner.webp", 900, None),
    ("tile.jpg", "tiles/tile.webp", 256, None),
    ("tile-good.jpg", "tiles/tile-good.webp", 256, None),
    ("tile-wrong.jpg", "tiles/tile-wrong.webp", 256, None),
    ("tile-glow.jpg", "tiles/tile-glow.webp", 256, None),
]


def build_sprites() -> None:
    print("sprites:")
    for src, dst, mw, mh in SPRITES:
        img = Image.open(SRC / src).convert("RGB")
        # ה-flood fill כתוב בפייתון; הקטנה מוקדמת חוסכת פי 4 בזמן בלי לפגוע
        # בתוצאה, כי היעד ממילא קטן בהרבה.
        img.thumbnail((1400, 1400), Image.LANCZOS)
        keyed = crop_to_alpha(key_out(img))
        if dst.startswith("tiles/"):
            # כל האריחים באותו ריבוע בדיוק, כדי שהחלפת מצב לא "תקפוץ"
            keyed = keyed.resize((256, 256), Image.LANCZOS)
        save_webp(fit(keyed, mw, mh), dst)

    floor = Image.open(SRC / "chamber floor.jpg").convert("RGB")
    save_webp(fit(floor, 1600, None), "bg/chamber-floor.webp", quality=78)


# ---------------------------------------------------------------- tile animations

# חלונות הזמן מתוך "stone tablet.mp4" (נמדדו לפי ממוצע צבע לפריים).
# כל אנימציה נעצרת בשיא שלה, כך שהיא נגמרת כמעט זהה לתמונה הסטטית שמחליפה אותה.
TILE_ANIMS = [
    ("tiles/anim-wrong.webp", 1.00, 3.00),  # "!" כתום -> אש -> גחלים
    ("tiles/anim-good.webp", 4.25, 5.25),   # סדקי ברק ירוקים, עד השיא
    ("tiles/anim-glow.webp", 7.25, 8.25),   # מדליון המצפן + קרני ציאן, עד השיא
]
ANIM_FPS = 12
ANIM_SIZE = 200
# האריח בסרטון: x 315..935, y 48..676 (620x628). הריבוע כולל מרווח לאפקטים
# שבורחים מהאריח, ובקוד מציגים אותו מוגדל פי ANIM_SCALE סביב האריח.
CROP = (265, 0, 985, 720)  # 720x720
ANIM_SCALE = 720 / 624


def build_tile_anims(tmp: Path) -> None:
    print("tile animations:")
    video = SRC / "stone tablet.mp4"
    for dst, t0, t1 in TILE_ANIMS:
        fdir = tmp / Path(dst).stem
        fdir.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-ss", str(t0), "-to", str(t1),
             "-i", str(video), "-vf", f"fps={ANIM_FPS}", str(fdir / "f_%03d.png")],
            check=True,
        )
        frames = sorted(fdir.glob("f_*.png"))
        strip = Image.new("RGBA", (ANIM_SIZE * len(frames), ANIM_SIZE), (0, 0, 0, 0))
        for i, f in enumerate(frames):
            fr = Image.open(f).convert("RGB").crop(CROP).resize((ANIM_SIZE * 2, ANIM_SIZE * 2), Image.LANCZOS)
            # האריח בתוך הריבוע של 400: x 28..372, y 27..376; פנים מוקטן ב-16px
            keyed = key_diff(fr, opaque_box=(44, 43, 356, 360))
            strip.paste(keyed.resize((ANIM_SIZE, ANIM_SIZE), Image.LANCZOS), (i * ANIM_SIZE, 0))
        save_webp(strip, dst, quality=80)
        print(f"    frames={len(frames)}")


# ---------------------------------------------------------------- videos

def ffmpeg(*args: str) -> None:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def build_videos() -> None:
    print("videos:")
    (OUT / "video").mkdir(parents=True, exist_ok=True)
    # הרצפה שמתעוררת - שכבת אווירה בזמן פתיחת הכספת. כהה מקצה לקצה, בלי מפתח.
    ffmpeg("-i", str(SRC / "chamber floor.mp4"), "-an", "-vf", "scale=1024:-2",
           "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "30",
           "-preset", "slow", "-movflags", "+faststart", str(OUT / "video/floor-awaken.mp4"))
    # החתולה קופצת עם המפתח - מסך הפתיחה, בתוך "מראה מכושפת" עם פנים בהיר.
    ffmpeg("-i", str(SRC / "Cat pouncing forward.mp4"), "-an", "-vf", "scale=720:-2",
           "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "29",
           "-preset", "slow", "-movflags", "+faststart", str(OUT / "video/cat-pounce.mp4"))
    ffmpeg("-ss", "4.2", "-i", str(SRC / "Cat pouncing forward.mp4"), "-vframes", "1",
           "-vf", "scale=720:-2", "-q:v", "80", str(OUT / "video/cat-pounce.webp"))
    for p in sorted((OUT / "video").iterdir()):
        print(f"  video/{p.name:28s} {p.stat().st_size // 1024}KB")

    # כרטיס בפורטל (CLAUDE.md, "וידאו על כרטיס"): 2:1, 640x320, בלי אודיו.
    # הקפיצה אופקית, ולכן קרופ 2:1 מהמרכז שומר את כל המסלול שלה.
    CARDS.mkdir(parents=True, exist_ok=True)
    ffmpeg("-i", str(SRC / "Cat pouncing forward.mp4"), "-an",
           "-vf", "crop=1280:640:0:40,scale=640:320",
           "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "30",
           "-preset", "slow", "-movflags", "+faststart", str(CARDS / "cipher-rogue.mp4"))
    ffmpeg("-ss", "4.2", "-i", str(SRC / "Cat pouncing forward.mp4"), "-vframes", "1",
           "-vf", "crop=1280:640:0:40,scale=640:320", "-q:v", "78", str(CARDS / "cipher-rogue.webp"))
    for n in ("cipher-rogue.mp4", "cipher-rogue.webp"):
        print(f"  assets/cards/{n:22s} {(CARDS / n).stat().st_size // 1024}KB")


# ---------------------------------------------------------------- audio

def copy_audio() -> None:
    print("audio:")
    dst = OUT / "audio"
    dst.mkdir(parents=True, exist_ok=True)
    for f in sorted((SRC / "audio").glob("*.mp3")):
        shutil.copy2(f, dst / f.name)
        print(f"  audio/{f.name:28s} {f.stat().st_size // 1024}KB")


def main() -> None:
    only = set(sys.argv[1:])
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as t:
        if not only or "sprites" in only:
            build_sprites()
        if not only or "anims" in only:
            build_tile_anims(Path(t))
        if not only or "videos" in only:
            build_videos()
        if not only or "audio" in only:
            copy_audio()


if __name__ == "__main__":
    main()
