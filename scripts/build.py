#!/usr/bin/env python3
"""EserV2 site generator: reads scripts/songs.json, writes static pages into docs/."""
import json, html, os, shutil, sys, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
BASE = os.environ.get("SITE_BASE", "https://srgulbay.github.io/eserv2/")

data = json.load(open(os.path.join(ROOT, "scripts", "songs.json"), encoding="utf-8"))
PL, SONGS = data["playlist"], data["songs"]
ARTIST = "dr_kaligram"
TITLE = PL.get("name", "EserV2")

E = html.escape

def fingerprint(rel):
    path = os.path.join(DOCS, rel)
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]

CSS_V = fingerprint("css/style.css")
JS_V = fingerprint("js/player.js")

def fmt_dur(sec):
    sec = int(sec or 0)
    return f"{sec // 60}:{sec % 60:02d}"

def first_line(ly):
    for line in (ly or "").splitlines():
        line = line.strip()
        if line and line[0] not in "[(":
            return line
    return ""

def desc_of(s):
    lines = [l.strip() for l in (s["lyrics"] or "").splitlines()
             if l.strip() and l.strip()[0] not in "[("]
    return " / ".join(lines[:2]) if lines else f"{TITLE} albümünden bir şarkı."

ICONS = {
    "play":  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"/></svg>',
    "pause": '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4.2" height="16" rx="1.4"/><rect x="13.8" y="4" width="4.2" height="16" rx="1.4"/></svg>',
    "prev":  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5a1 1 0 0 1 2 0v6.3l9.4-6.2A1 1 0 0 1 19 6v12a1 1 0 0 1-1.6.9L8 12.7V19a1 1 0 0 1-2 0V5z"/></svg>',
    "next":  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 5a1 1 0 0 0-2 0v6.3L6.6 5.1A1 1 0 0 0 5 6v12a1 1 0 0 0 1.6.9l9.4-6.2V19a1 1 0 0 0 2 0V5z"/></svg>',
    "share": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7.5 7.5 4.5-4.5 4.5 4.5"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    "lyr":   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h10M4 18h13"/></svg>',
    "close": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    "down":  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
}

QUOTE = "Şimdi gelsen de bir, gelmesen de bir…"

def album_js(prefix):
    payload = {
        "title": TITLE, "artist": ARTIST, "base": BASE,
        "audioDir": prefix + "assets/audio/", "artDir": prefix + "assets/art/",
        "songs": [{"id": s["id"], "slug": s["slug"], "title": s["title"],
                   "duration": s["duration"], "lyrics": s["lyrics"]} for s in SONGS],
    }
    return json.dumps(payload, ensure_ascii=False)

def track_rows(prefix):
    rows = []
    for i, s in enumerate(SONGS):
        sub = ""
        for line in (s["lyrics"] or "").splitlines():
            line = line.strip()
            if line and line[0] not in "[(" and line.lower().rstrip(" ,.;?!") != s["title"].lower().rstrip(" ,.;?!"):
                sub = line; break
        sub = sub or "Enstrümantal"
        rows.append(f"""
      <div class="track" data-index="{i}" data-id="{s['id']}">
        <div class="track-no"><span>{s['track_no']:02d}</span>
          <span class="eq"><i></i><i></i><i></i></span>
          <span class="playglyph">{ICONS['play'].replace('<svg', '<svg width="14" height="14"')}</span></div>
        <div class="track-art"><img loading="lazy" src="{prefix}assets/art/{s['id']}.jpeg" alt="{E(s['title'])} kapağı"></div>
        <div class="track-meta"><h3>{E(s['title'])}</h3><p>{E(sub)}</p></div>
        <div class="track-side">
          <span class="track-dur">{fmt_dur(s['duration'])}</span>
          <button class="icon-btn lyr" title="Sözler" aria-label="Sözleri göster">{ICONS['lyr']}</button>
          <button class="icon-btn share" title="Paylaş" aria-label="Paylaş">{ICONS['share']}</button>
        </div>
        <div class="lyrics-drawer"><pre>{E(s['lyrics'])}</pre></div>
      </div>""")
    return "".join(rows)

def og_block(url, title, description, image, *, song=None):
    tags = [
        f'<link rel="canonical" href="{url}">',
        f'<meta property="og:site_name" content="{E(TITLE)}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:title" content="{E(title)}">',
        f'<meta property="og:description" content="{E(description)}">',
        f'<meta property="og:image" content="{image}">',
        '<meta property="og:image:width" content="1024">',
        '<meta property="og:image:height" content="1024">',
        f'<meta name="description" content="{E(description)}">',
        f'<meta name="twitter:title" content="{E(title)}">',
        f'<meta name="twitter:description" content="{E(description)}">',
        f'<meta name="twitter:image" content="{image}">',
    ]
    if song:
        audio = f"{BASE}assets/audio/{song['id']}.mp3"
        tags += [
            '<meta property="og:type" content="music.song">',
            f'<meta property="og:audio" content="{audio}">',
            f'<meta property="og:audio:secure_url" content="{audio}">',
            '<meta property="og:audio:type" content="audio/mpeg">',
            f'<meta property="music:duration" content="{int(song["duration"] or 0)}">',
            f'<meta property="music:musician" content="{BASE}">',
            '<meta name="twitter:card" content="player">',
            f'<meta name="twitter:player" content="{BASE}embed/{song["slug"]}/">',
            '<meta name="twitter:player:width" content="480">',
            '<meta name="twitter:player:height" content="180">',
        ]
    else:
        tags += [
            '<meta property="og:type" content="music.album">',
            '<meta name="twitter:card" content="summary_large_image">',
        ]
    return "\n  ".join(tags)

def cover_wall(prefix):
    cells = []
    for i, s in enumerate(SONGS):
        cells.append(f"""
      <div class="cover" data-index="{i}" data-id="{s['id']}">
        <img loading="lazy" src="{prefix}assets/art/{s['id']}.jpeg" alt="{E(s['title'])} kapağı">
        <div class="cover-veil"><h4>{E(s['title'])}</h4>
          <span class="chip">{ICONS['play']}</span></div>
      </div>""")
    return "".join(cells)

def page(prefix, og, *, start_slug=None):
    body_attr = f' data-start="{start_slug}"' if start_slug else ""
    return f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{E(TITLE)} — {E(ARTIST)}</title>
  <meta name="theme-color" content="#0c0906">
  {og}
  <link rel="icon" href="{prefix}favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{prefix}css/style.css?v={CSS_V}">
</head>
<body{body_attr}>

  <nav class="topbar">
    <a class="brand" href="{prefix}">Eser<em>V2</em></a>
    <div class="topbar-links">
      <a href="{prefix}#sarkilar">Şarkılar</a>
      <a href="{prefix}#kapaklar">Kapaklar</a>
      <a href="{prefix}#hakkinda">Hakkında</a>
    </div>
  </nav>

  <header class="hero">
    <div class="hero-art" style="background-image:url('{prefix}assets/art/{SONGS[0]['id']}.jpeg')"></div>
    <div class="hero-inner">
      <div class="hero-text">
        <p class="hero-eyebrow">Albüm · {len(SONGS)} Şarkı</p>
        <h1>Eser<em>V2</em></h1>
        <p class="hero-sub">söz &amp; müzik · <b>{E(ARTIST)}</b></p>
        <p class="hero-quote">“{E(QUOTE)}”</p>
        <div class="hero-actions">
          <button class="btn btn-gold">{ICONS['play']} Dinle</button>
          <button class="btn btn-ghost">{ICONS['share']} Paylaş</button>
        </div>
      </div>
      <div class="hero-stack" aria-hidden="true">
        <img class="s3" src="{prefix}assets/art/{SONGS[2]['id']}.jpeg" alt="">
        <img class="s2" src="{prefix}assets/art/{SONGS[1]['id']}.jpeg" alt="">
        <img class="s1" src="{prefix}assets/art/{SONGS[0]['id']}.jpeg" alt="">
      </div>
    </div>
    <span class="scroll-hint">{ICONS['down']}</span>
  </header>

  <main class="wrap">
    <div class="section-head reveal" id="sarkilar"><h2>Şarkılar</h2><i class="rule"></i><span>{E(TITLE)}</span></div>
    <section class="tracks">{track_rows(prefix)}
    </section>

    <div class="section-head reveal" id="kapaklar"><h2>Kapaklar</h2><i class="rule"></i><span>Görsel Defter</span></div>
    <section class="covers reveal">{cover_wall(prefix)}
    </section>

    <div class="section-head reveal" id="hakkinda"><h2>Hakkında</h2><i class="rule"></i></div>
    <section class="about reveal">
      <img src="{prefix}assets/art/{SONGS[-1]['id']}.jpeg" alt="{E(TITLE)} albüm kapağı">
      <div>
        <h2>{E(TITLE)}</h2>
        <p>Hüznün, hasretin ve gecenin içinden geçen {len(SONGS)} şarkı.
        Her parça kendi hikâyesini anlatır; sözler satır satır sayfada,
        sesler bir tık uzağınızda. Beğendiğiniz şarkıyı paylaşım tuşuyla
        sevdiklerinize gönderebilirsiniz.</p>
      </div>
    </section>
  </main>

  <footer><span class="fbrand">Eser<em>V2</em></span>© 2026 {E(ARTIST)}</footer>

  <!-- player -->
  <div class="player" role="region" aria-label="Müzik çalar">
    <div class="player-seek"><div class="rail"></div><div class="fill"></div><div class="knob"></div></div>
    <div class="now">
      <img src="{prefix}assets/art/{SONGS[0]['id']}.jpeg" alt="">
      <div class="now-meta"><h4></h4><p></p></div>
    </div>
    <div class="controls">
      <button class="ctrl ctrl-prev" aria-label="Önceki">{ICONS['prev']}</button>
      <button class="ctrl ctrl-play" aria-label="Çal / Duraklat">
        <span class="i-play">{ICONS['play']}</span>
        <span class="i-pause" style="display:none">{ICONS['pause']}</span>
      </button>
      <button class="ctrl ctrl-next" aria-label="Sonraki">{ICONS['next']}</button>
    </div>
    <div class="player-right">
      <span class="time"><b class="cur">0:00</b> / <span class="dur">0:00</span></span>
      <canvas class="viz" width="90" height="34" aria-hidden="true"></canvas>
      <div class="vol"><input type="range" min="0" max="100" value="100" aria-label="Ses"></div>
    </div>
  </div>

  <!-- now playing overlay -->
  <div class="overlay">
    <div class="overlay-bg"></div>
    <button class="icon-btn overlay-close" aria-label="Kapat">{ICONS['close']}</button>
    <img class="overlay-art" src="" alt="">
    <h3></h3>
    <p class="artist">{E(ARTIST)}</p>
    <button class="btn btn-ghost ov-share" style="margin-top:22px">{ICONS['share']} Bu şarkıyı paylaş</button>
    <div class="overlay-lyrics"></div>
  </div>

  <div class="toast" role="status"></div>

  <script>window.ALBUM = {album_js(prefix)};</script>
  <script src="{prefix}js/player.js?v={JS_V}"></script>
</body>
</html>"""

def embed_page(s):
    audio = f"{BASE}assets/audio/{s['id']}.mp3"
    art = f"{BASE}assets/art/{s['id']}.jpeg"
    return f"""<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(s['title'])} — {E(ARTIST)}</title>
<style>
  body{{margin:0;background:#0d0a08;color:#ece7e1;font-family:-apple-system,'Segoe UI',sans-serif;
  display:flex;align-items:center;gap:14px;padding:14px;height:100vh;box-sizing:border-box}}
  img{{width:120px;height:120px;border-radius:12px;object-fit:cover;flex:none}}
  h1{{font-size:15px;margin:0 0 2px}}
  p{{font-size:12px;color:#a89f94;margin:0 0 10px}}
  audio{{width:100%;max-width:300px;height:36px}}
  .m{{min-width:0;flex:1}}
</style>
</head>
<body>
<img src="{art}" alt="">
<div class="m">
  <h1>{E(s['title'])}</h1>
  <p>{E(ARTIST)} · {E(TITLE)}</p>
  <audio controls preload="metadata" src="{audio}"></audio>
</div>
</body>
</html>"""

FAVICON = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="#0d0a08"/>
<text x="32" y="46" font-family="Georgia, serif" font-size="40" font-style="italic"
 font-weight="600" fill="#d4a24e" text-anchor="middle">E</text>
</svg>"""

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

# clean generated dirs (keep assets/css/js)
for d in ("t", "embed"):
    shutil.rmtree(os.path.join(DOCS, d), ignore_errors=True)

write(os.path.join(DOCS, "favicon.svg"), FAVICON)
write(os.path.join(DOCS, ".nojekyll"), "")

# index
og = og_block(BASE, f"{TITLE} — {ARTIST}",
              f"{len(SONGS)} şarkılık albüm. Dinle, sözleri oku, paylaş.",
              f"{BASE}assets/art/{SONGS[0]['id']}.jpeg")
write(os.path.join(DOCS, "index.html"), page("", og))

# per-track + embed pages
for s in SONGS:
    url = f"{BASE}t/{s['slug']}/"
    og = og_block(url, f"{s['title']} — {ARTIST}", desc_of(s),
                  f"{BASE}assets/art/{s['id']}.jpeg", song=s)
    write(os.path.join(DOCS, "t", s["slug"], "index.html"),
          page("../../", og, start_slug=s["slug"]))
    write(os.path.join(DOCS, "embed", s["slug"], "index.html"), embed_page(s))

print(f"built: index + {len(SONGS)} track pages + {len(SONGS)} embeds -> {DOCS}")
