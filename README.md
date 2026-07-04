# EserV2 — Albüm Sitesi

Suno'daki [EserV2 playlist'inin](https://suno.com/playlist/2fd84fc4-d876-4885-928e-a998a9223f67)
kendi kendini güncelleyen, tamamen statik albüm vitrini.

## Nasıl çalışır

- `scripts/sync.py` — public playlist sayfasını çeker, `scripts/songs.json`'u günceller,
  yeni MP3/kapakları `docs/assets/` altına indirir ve siteyi yeniden derler.
- `scripts/build.py` — `songs.json`'dan tüm sayfaları üretir:
  - `docs/index.html` — albüm sayfası + özgün player
  - `docs/t/<slug>/` — şarkı başına paylaşım sayfası (WhatsApp/Telegram/X önizleme
    meta'ları: Open Graph `music.song`, `og:audio`, Twitter player card)
  - `docs/embed/<slug>/` — X/Twitter player card'ın gömdüğü mini çalar
- `.github/workflows/sync.yml` — 6 saatte bir senkron; değişiklik varsa commit eder,
  GitHub Pages otomatik yayınlar.

Suno'ya şarkı ekleyip playlist'e koyduğunda site en geç 6 saat içinde kendini günceller.
Beklemek istemezsen GitHub → Actions → "Suno playlist sync" → **Run workflow**.

## Yerel kullanım

```bash
python3 scripts/sync.py          # senkronla + derle
cd docs && python3 -m http.server 8123   # http://localhost:8123
```

## Notlar

- Ses ve görseller depoya kopyalanır; Suno CDN'i değişse bile site çalışmaya devam eder.
- Şarkı sayfası URL'leri (slug'lar) klip ID'sine bağlanır ve senkronlarda değişmez.
- Başlıksız şarkılara sözlerin ilk dizesi başlık yapılır.
- Site adresi değişirse `scripts/build.py` içindeki `SITE_BASE`'i (veya ortam
  değişkenini) güncelle.
