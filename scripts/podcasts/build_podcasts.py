"""Build podcasts/data/podcasts.json from the RSS feeds of the selected kids podcasts.

Run from the repo root:  python scripts/podcasts/build_podcasts.py
The selection + categories live in PODCASTS below. Feed URLs come from
scripts/podcasts/catalog.json (built by build_catalog.py).
A local cover in podcasts/img/<id>.webp overrides the feed artwork.
"""
import html, json, re, sys, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = Path(__file__).parent / "catalog.json"
OUT = ROOT / "podcasts" / "data" / "podcasts.json"
IMG = ROOT / "podcasts" / "img"
IT = "{http://www.itunes.com/dtds/podcast-1.0.dtd}"
UA = {"User-Agent": "Mozilla/5.0 (LevyGames podcast build)"}

CATEGORIES = [
    {"id": "history", "name": "היסטוריה", "emoji": "🏰"},
    {"id": "science", "name": "מדע וסקרנות", "emoji": "🔬"},
    {"id": "nature", "name": "טבע וטיולים", "emoji": "🌿"},
    {"id": "stories", "name": "סיפורים", "emoji": "📖"},
    {"id": "society", "name": "חברה וחוק", "emoji": "⚖️"},
    {"id": "parents", "name": "להורים", "emoji": "💛"},
]

# (id, name in catalog.json, category, card colors)
PODCASTS = [
    ("history-kids", "היסטוריה לילדים", "history", ["#F59E0B", "#EF4444"]),
    ("real-legends", "אגדות אמיתיות", "history", ["#F472B6", "#A855F7"]),
    ("obvious", "המובן מאליו", "science", ["#FACC15", "#FB923C"]),
    ("frontiers", "פרונטירז – מדע לצעירים", "science", ["#22D3EE", "#6366F1"]),
    ("nature-kids", "ילדי טבע", "nature", ["#4ADE80", "#14B8A6"]),
    ("on-the-road", "על הדרך", "nature", ["#38BDF8", "#22C55E"]),
    ("fairy-tales", "סיפורי מעשיות", "stories", ["#C084FC", "#EC4899"]),
    ("yaldin", "ילדין", "society", ["#60A5FA", "#A78BFA"]),
    ("therapy-space", "המרחב הטיפולי", "parents", ["#FDA4AF", "#FB7185"]),
]


def clean(text, limit=None):
    text = html.unescape(re.sub(r"<[^>]+>", " ", text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    if limit and len(text) > limit:
        cut = text[:limit]
        text = cut[: cut.rfind(" ")] + "…"
    return text


def seconds(d):
    if not d:
        return None
    d = d.strip()
    if d.isdigit():
        return int(d)
    try:
        parts = [int(float(x)) for x in d.split(":")]
    except ValueError:
        return None
    s = 0
    for p in parts:
        s = s * 60 + p
    return s


def https(url):
    if not url:
        return None
    url = url.strip()
    if url.startswith("http://"):
        url = "https://" + url[7:]
    return url


HEB = re.compile(r"[֐-׿]")


def producer(raw):
    """'כאן | Kan' -> 'כאן', 'יובל מלחי Yuval Malchi' -> 'יובל מלחי', 'Kan' -> 'כאן'."""
    s = clean(raw).split("|")[0].strip(" '\"-")
    if s.lower() == "kan":
        return "כאן"
    if HEB.search(s):
        s = " ".join(w for w in s.split() if not re.fullmatch(r"[A-Za-z.]+", w))
    return s.strip(" -") or None


def main():
    catalog = {p["name"]: p for p in json.loads(CATALOG.read_text(encoding="utf-8"))}
    out = {"categories": CATEGORIES, "podcasts": []}
    for pid, name, cat, colors in PODCASTS:
        c = catalog[name]
        req = urllib.request.Request(c["feed"], headers=UA)
        root = ET.fromstring(urllib.request.urlopen(req, timeout=60).read())
        ch = root.find("channel")
        img_el = ch.find(f"{IT}image")
        art = https((img_el.get("href") if img_el is not None else None) or c.get("art"))
        local = IMG / f"{pid}.webp"
        eps = []
        for n, it in enumerate(ch.findall("item")):
            enc = it.find("enclosure")
            if enc is None or not enc.get("url"):
                continue
            ep_img = it.find(f"{IT}image")
            eps.append({
                "id": f"{pid}:{n}",
                "t": clean(it.findtext("title")),
                "u": https(enc.get("url")),
                "d": seconds(it.findtext(f"{IT}duration")),
                "s": it.findtext(f"{IT}season"),
                "desc": clean(it.findtext(f"{IT}summary") or it.findtext("description"), 200),
                "img": https(ep_img.get("href")) if ep_img is not None else None,
            })
        # ids are stable from oldest -> newest, so new episodes don't shift them.
        # Episodes are stored oldest first: kids listen to a series from the start.
        total = len(eps)
        for k, e in enumerate(eps):
            e["n"] = total - k
            e["id"] = f"{pid}:{e['n']}"
        eps.reverse()
        out["podcasts"].append({
            "id": pid, "name": name, "cat": cat, "colors": colors,
            "from": producer(ch.findtext(f"{IT}author") or c.get("author")),
            "summary": c.get("summary") or clean(ch.findtext("description"), 220),
            "art": f"img/{pid}.webp" if local.exists() else art,
            "anim": next((f"anim/{pid}{ext}" for ext in (".mp4", ".webm")
                          if (ROOT / "podcasts" / "anim" / f"{pid}{ext}").exists()), None),
            "episodes": eps,
        })
        bad = [e for e in eps if not e["u"].startswith("https://")]
        print(f"{pid}: {total} episodes, non-https: {len(bad)}", file=sys.stderr)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)", file=sys.stderr)


if __name__ == "__main__":
    main()
