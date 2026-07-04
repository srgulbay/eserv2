#!/usr/bin/env python3
"""Suno playlist sync: fetches the public playlist, updates songs.json,
downloads any new audio/art into docs/assets, then rebuilds the site.
Existing slugs/titles are preserved by clip id, so share URLs stay stable."""
import re, json, codecs, os, sys, unicodedata, urllib.request, subprocess

PLAYLIST_URL = "https://suno.com/playlist/2fd84fc4-d876-4885-928e-a998a9223f67"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONGS_JSON = os.path.join(ROOT, "scripts", "songs.json")
AUDIO_DIR = os.path.join(ROOT, "docs", "assets", "audio")
ART_DIR = os.path.join(ROOT, "docs", "assets", "art")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def parse_playlist(raw_html):
    raw = raw_html.decode("utf-8", "ignore")
    chunks = re.findall(r'self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)', raw)
    blob = "".join(codecs.decode(c, "unicode_escape").encode("latin-1", "ignore").decode("utf-8", "ignore") for c in chunks)

    refs = {}
    for m in re.finditer(r"([0-9a-f]+):T([0-9a-f]+),", blob):
        key, ln = m.group(1), int(m.group(2), 16)
        b = blob[m.end():m.end() + ln * 2].encode("utf-8")[:ln]
        refs[key] = b.decode("utf-8", "ignore")

    start = blob.find('{"entity_type":"playlist_schema"')
    if start < 0:
        raise RuntimeError("playlist JSON not found — Suno page structure may have changed")
    depth = 0; i = start; instr = False; esc = False
    while i < len(blob):
        ch = blob[i]
        if instr:
            if esc: esc = False
            elif ch == "\\": esc = True
            elif ch == '"': instr = False
        else:
            if ch == '"': instr = True
            elif ch == "{": depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0: break
        i += 1
    pl = json.loads(blob[start:i + 1])

    def deref(v):
        m = re.fullmatch(r"\$([0-9a-f]+)", v or "")
        return refs.get(m.group(1), "") if m else (v or "")
    return pl, deref

TR = str.maketrans("çğıöşüÇĞİÖŞÜâîû", "cgiosuCGIOSUaiu")
def slugify(t):
    t = t.translate(TR)
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", t).strip("-").lower() or "track"

def first_line(ly):
    for line in ly.splitlines():
        line = line.strip()
        if line and line[0] not in "[(":
            return line[:60].rstrip(" ,.;")
    return ""

def main():
    old = {}
    if os.path.exists(SONGS_JSON):
        for s in json.load(open(SONGS_JSON, encoding="utf-8"))["songs"]:
            old[s["id"]] = s

    pl, deref = parse_playlist(fetch(PLAYLIST_URL))

    songs = []
    seen = {s["slug"] for s in old.values()}
    for n, pc in enumerate(pl.get("playlist_clips", []), 1):
        c = pc["clip"]; md = c.get("metadata") or {}
        if c.get("status") not in (None, "complete"):
            continue
        prev = old.get(c["id"])
        if prev:
            s = dict(prev); s["track_no"] = n
            songs.append(s); continue
        lyrics = deref(md.get("prompt", "")).strip()
        if len(lyrics) > 6000: lyrics = ""
        title = deref(c.get("title", "")).strip()
        if not title or title.lower() == "untitled" or re.match(r"^\d{4}-\d{2}-\d{2}", title) or len(title) > 80:
            title = first_line(lyrics) or f"Eser {n:02d}"
        base = slugify(title); slug = base; k = 2
        while slug in seen: slug = f"{base}-{k}"; k += 1
        seen.add(slug)
        songs.append({"id": c["id"], "track_no": n, "title": title, "slug": slug,
                      "audio_url": c["audio_url"],
                      "image_url": c.get("image_large_url") or c.get("image_url"),
                      "duration": md.get("duration"), "tags": md.get("tags", ""),
                      "lyrics": lyrics, "created": c.get("created_at")})

    if not songs:
        print("no complete clips found; aborting without changes", file=sys.stderr)
        sys.exit(1)

    new_ids = [s["id"] for s in songs if s["id"] not in old]
    data = {"playlist": {"id": pl["id"], "name": pl.get("name", "EserV2"),
                         "user": pl.get("user_display_name") or "dr_kaligram"},
            "songs": songs}
    json.dump(data, open(SONGS_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    for s in songs:
        for url, dest in ((s["audio_url"], os.path.join(AUDIO_DIR, s["id"] + ".mp3")),
                          (s["image_url"], os.path.join(ART_DIR, s["id"] + ".jpeg"))):
            if os.path.exists(dest) and os.path.getsize(dest) > 1000:
                continue
            print("downloading", os.path.basename(dest))
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "wb") as f:
                f.write(fetch(url))

    subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "build.py")], check=True)
    print(f"synced {len(songs)} songs ({len(new_ids)} new)")

if __name__ == "__main__":
    main()
