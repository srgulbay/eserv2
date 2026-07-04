# EserV2 — Görsel Üretim Promptları

Site şu an her şarkının Suno kapak görselini kullanıyor. Daha güçlü, tutarlı bir
görsel kimlik istersen aşağıdaki promptları Midjourney / DALL-E / Firefly'da çalıştır,
çıkan görselleri `docs/assets/art/<klip-id>.jpeg` üzerine yaz (1024×1024, JPEG) —
site başka hiçbir değişiklik istemez.

Ortak stil çekirdeği (tüm promptlara eklenir):

> cinematic album cover art, Anatolian melancholy, warm amber candlelight against
> deep charcoal night, oil painting texture with fine film grain, chiaroscuro
> lighting, no text, no letters, square 1:1 — palette: #0d0a08 background,
> #d4a24e golden accents, muted earth tones

## Albüm kapağı (hero)

> A lone bağlama (Turkish long-necked lute) resting against a window at night,
> moonlight and a single candle, dust motes in the light beam, distant city
> lights blurred through rain-streaked glass + stil çekirdeği

## Şarkı başına

1. **Bana Sen Gereksin Sen (Akustik)** — weathered hands tuning a nylon-string
   guitar by candlelight, sheet music pages scattered, intimate room
2. **Aşk Pazarı (Enstrümantal)** — an empty old bazaar at dawn, hanging lanterns
   still lit, mist between the stalls, one rose left on a wooden counter
3. **Bana Sen Gereksin Sen** — two silhouettes separated by a rain-covered
   window, warm interior light vs cold blue exterior
4. **Aşk Afeti Cihandır** — a burning rose suspended over dark water, embers
   rising like fireflies, reflection rippling
5. **Gece İçinde Adın** — a name written in glowing ember calligraphy dissolving
   into the night sky above a sleeping Anatolian town
6. **Artık Görünmüyor Mevsimde Hüzün** — autumn leaves frozen mid-air over an
   empty village road, cranes flying toward a bruised horizon
7. **Kalır** — an empty wooden chair by a window, a folded letter on it,
   curtain moving in the wind, long shadows
8. **Hayat Su Misali Süzülüp Gider** — a river carrying fallen blossoms past an
   old stone bridge at dusk, water like liquid amber
9. **O Esrarlı Yangına Bu Can Nasıl Dayandı** — a heart-shaped ember glowing
   inside cupped hands in total darkness, smoke curling upward
10. **Vasiyet** — an oil lamp burning low beside an ink pen and unfinished
    letter, wax seal, deep shadows swallowing the edges of the desk

İpucu: Midjourney'de sona `--ar 1:1 --style raw --v 6` ekle; tutarlılık için
albüm kapağını referans görsel (`--sref`) olarak kullan.
