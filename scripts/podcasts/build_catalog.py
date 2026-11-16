"""Build a catalog of the kids podcasts on podcastim.org.il.

For each podcast: name, podcastim page, Apple match -> RSS feed,
episode count, seasons, description, artwork. Falls back to the
podcastPlayerData JSON embedded in the podcastim page.
"""
import html, json, re, sys, time, unicodedata, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

BASE = Path(__file__).parent
CACHE = BASE / "cache"
CACHE.mkdir(exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (podcast-catalog script)"}
ITUNES = "{http://www.itunes.com/dtds/podcast-1.0.dtd}"


def fetch(url, key, timeout=30):
    p = CACHE / key
    fail = CACHE / (key + ".fail")
    if p.exists():
        return p.read_bytes()
    if fail.exists():
        return None
    req = urllib.request.Request(url, headers=UA)
    try:
        data = urllib.request.urlopen(req, timeout=timeout).read()
    except Exception as e:
        print(f"  ! fetch failed {url[:80]}: {e}", file=sys.stderr)
        fail.write_text(str(e), encoding="utf-8")
        return None
    p.write_bytes(data)
    time.sleep(0.4)
    return data


def norm(s):
    s = unicodedata.normalize("NFKC", s or "").lower()
    s = re.sub(r"[\"'׳״“”’`]", "", s)
    s = re.sub(r"[^\w֐-׿]+", " ", s)
    return s.strip()


def clean(text, limit=None):
    text = html.unescape(re.sub(r"<[^>]+>", " ", text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    if limit and len(text) > limit:
        cut = text[:limit]
        text = cut[: cut.rfind(" ")] + "…"
    return text


SEASON_RE = re.compile(r"עונה\s*(\d+)|season\s*(\d+)|\bS(\d+)\s*E\d+", re.I)


def seasons_from(titles, tags):
    s = {int(t) for t in tags if t and str(t).isdigit() and int(t) > 0}
    if s:
        return len(s)
    found = set()
    for t in titles:
        m = SEASON_RE.search(t or "")
        if m:
            found.add(int(next(g for g in m.groups() if g)))
    return len(found) if found else None


def parse_list():
    h = (BASE / "list.html").read_text(encoding="utf-8")
    out, seen = [], set()
    for url, name in re.findall(
        r'<h4 class="pt-cv-title"><a href="([^"]+)"[^>]*>(.*?)</a></h4>', h
    ):
        if url in seen:
            continue
        seen.add(url)
        out.append({"name": html.unescape(name).strip(), "page": url})
    return out


def apple_match(name, idx):
    q = urllib.parse.quote(name)
    raw = fetch(
        f"https://itunes.apple.com/search?media=podcast&country=il&limit=10&term={q}",
        f"itunes_{idx}.json",
    )
    if not raw:
        return None, "no-response"
    results = [r for r in json.loads(raw).get("results", []) if r.get("feedUrl")]
    if not results:
        return None, "not-found"
    n = norm(name)
    for r in results:
        if norm(r.get("collectionName")) == n:
            return r, "exact"
    for r in results:
        cn = norm(r.get("collectionName"))
        if n and (n in cn or cn in n):
            return r, "partial"
    return results[0], "weak"


def parse_rss(raw):
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return None
    ch = root.find("channel")
    if ch is None:
        return None
    items = ch.findall("item")
    titles = [i.findtext("title") for i in items]
    tags = [i.findtext(f"{ITUNES}season") for i in items]
    desc = ch.findtext(f"{ITUNES}summary") or ch.findtext("description")
    dates = [i.findtext("pubDate") for i in items if i.findtext("pubDate")]
    return {
        "episodes": len(items),
        "seasons": seasons_from(titles, tags),
        "description": desc,
        "latest": dates[0] if dates else None,
        "author": ch.findtext(f"{ITUNES}author"),
        "titles": {norm(clean(t)) for t in titles if t},
    }


def parse_page(raw):
    h = raw.decode("utf-8", "replace")
    i = h.find("var podcastPlayerData = ")
    eps = {}
    if i >= 0:
        try:
            data, _ = json.JSONDecoder().raw_decode(h, i + len("var podcastPlayerData = "))
            for k, v in data.items():
                if k.startswith("pp-podcast-") and isinstance(v, dict):
                    eps.update({kk: vv for kk, vv in v.items() if kk.startswith("ppe-")})
        except json.JSONDecodeError:
            pass
    titles = [e.get("title") for e in eps.values()]
    tags = [e.get("season") for e in eps.values()]
    about = ""
    m = re.search(
        r'<h2 class="wp-block-heading">על הפודקאסט.*?</h2>(.*?)(?=<h2|<div id="pp-podcast)', h, re.S
    )
    if m:
        about = " ".join(re.findall(r"<p[^>]*>(.*?)</p>", m.group(1), re.S))
    return {
        "episodes": len(eps) or None,
        "seasons": seasons_from(titles, tags),
        "titles": {norm(clean(t)) for t in titles if t},
        "about": about,
    }


def main():
    pods = parse_list()
    print(f"{len(pods)} podcasts in list", file=sys.stderr)
    for i, p in enumerate(pods):
        print(f"[{i+1}/{len(pods)}] {p['name']}", file=sys.stderr)
        page_raw = fetch(p["page"], f"page_{i}.html")
        page = parse_page(page_raw) if page_raw else {}
        r, quality = apple_match(p["name"], i)
        p["match"] = quality
        rss = None
        if r:
            p["apple_name"] = r.get("collectionName")
            p["feed"] = r.get("feedUrl")
            p["art"] = r.get("artworkUrl600") or r.get("artworkUrl100")
            p["apple_url"] = r.get("collectionViewUrl")
            raw = fetch(r["feedUrl"], f"rss_{i}.xml")
            rss = parse_rss(raw) if raw else None
        # Validate the Apple match: do the feed's episode titles overlap the
        # episodes podcastim shows for this podcast?
        if rss and page.get("titles"):
            overlap = len(page["titles"] & rss["titles"])
            p["overlap"] = overlap
            quality = "verified" if overlap else "mismatch"
            p["match"] = quality
        if rss and quality not in ("weak", "mismatch"):
            p["episodes"] = rss["episodes"]
            p["seasons"] = rss["seasons"]
            p["summary"] = clean(page.get("about"), 220) or clean(rss["description"], 220)
            p["author"] = rss["author"]
            p["latest"] = rss["latest"]
            p["source"] = "rss"
        else:
            for k in ("feed", "art", "apple_url"):
                p.pop(k, None)
            p["episodes"] = page.get("episodes")
            p["seasons"] = page.get("seasons")
            p["summary"] = clean(page.get("about"), 220)
            p["source"] = "podcastim" if page.get("episodes") else "none"
        p["page_episodes"] = page.get("episodes")
    (BASE / "catalog.json").write_text(
        json.dumps(pods, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    from collections import Counter
    print(Counter(p["match"] for p in pods), Counter(p["source"] for p in pods), file=sys.stderr)


if __name__ == "__main__":
    main()
