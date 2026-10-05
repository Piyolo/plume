# PLUME — asset manifest

Every image the site loads, where it came from, and what it depicts.

**Selection method.** Unsplash and Pexels both reject programmatic search requests
(401/403), so candidates were gathered through the real browser across six queries —
`vape`, `vape device dark`, `e-liquid`, `smoke black background`, `brushed metal texture`,
`vapor abstract` — producing 118 candidate IDs (75 downloaded successfully; the rest
returned an error or an undersized body and were dropped). Each candidate was rendered
into a labelled contact sheet and reviewed by eye before picking. Nothing here was chosen
on metadata alone.

**Licence.** All images are from Unsplash and are used under the
[Unsplash License](https://unsplash.com/license) — free for commercial and non-commercial
use, no attribution required.

**Source URLs.** Unsplash serves images from `images.unsplash.com/photo-<id>` while photo
pages use an unrelated short-ID slug, so a photo-page URL cannot be derived from the image
ID. Each row therefore records the exact CDN URL that was downloaded (permanent, directly
reproducible) plus the search page the candidate came from.

**All images are self-hosted.** The site references only `assets/img/<file>` paths; no
image is hot-linked at runtime.

| Slot | Contact # | Depicts | Source query | Section | Bytes |
|------|-----------|---------|--------------|---------|-------|
| `hero-device.jpg` | 22 | Dark device with rim-lit neon, deep negative space | `vape` | Hero, full-bleed | 210,714 |
| `manifesto-plate.jpg` | 64 | Single elegant vapour wisp on pure black | `smoke black background` | Manifesto, parallax plate | 166,773 |
| `one-hero.jpg` | 38 | Pod device isolated on black, soft top light | `vape device dark` | Chapter 01 + Range card | 275,603 |
| `one-detail.jpg` | 2 | Dark device on textured ground, red accent | `vape` | Chapter 01 detail | 323,288 |
| `arc-hero.jpg` | 31 | Slim device on dark grain, single shaft of light | `vape device dark` | Chapter 02 + Range card | 387,237 |
| `arc-detail.jpg` | 28 | Hand-held device in heavy vapour, high contrast | `vape device dark` | Chapter 02 detail | 459,706 |
| `reserve-hero.jpg` | 50 | Bottle resting on weathered dark wood | `e-liquid` | Chapter 03 + Range card | 385,489 |
| `reserve-detail.jpg` | 51 | Bottles in warm shallow-focus light | `e-liquid` | Chapter 03 detail | 230,198 |
| `craft-01.jpg` | 87 | Radial brushed metal, machined finish | `brushed metal texture` | Craft, parallax stack | 481,583 |
| `craft-02.jpg` | 94 | Linear brushed metal grain | `brushed metal texture` | Craft, parallax stack | 863,074 |
| `texture-plate.jpg` | 78 | Near-black abstract vapour gradient | `smoke black background` | Global image-failure fallback (`.is-plate`) | 43,917 |

## Exact URLs

| Slot | Downloaded from |
|------|-----------------|
| `hero-device.jpg` | `https://images.unsplash.com/photo-1702568523463-961c6652848a?w=2000&q=80&fm=jpg&fit=max` |
| `manifesto-plate.jpg` | `https://images.unsplash.com/photo-1547070451-ce386c65160a?w=1800&q=80&fm=jpg&fit=max` |
| `one-hero.jpg` | `https://images.unsplash.com/photo-1575448315031-cc42f3569548?w=1600&q=80&fm=jpg&fit=max` |
| `one-detail.jpg` | `https://images.unsplash.com/photo-1594177914682-d408d96e458b?w=1600&q=80&fm=jpg&fit=max` |
| `arc-hero.jpg` | `https://images.unsplash.com/photo-1580744864475-31d69be9e980?w=1600&q=80&fm=jpg&fit=max` |
| `arc-detail.jpg` | `https://images.unsplash.com/photo-1655942144741-f5cff077553a?w=1600&q=80&fm=jpg&fit=max` |
| `reserve-hero.jpg` | `https://images.unsplash.com/photo-1662735229836-e998b8676807?w=1600&q=80&fm=jpg&fit=max` |
| `reserve-detail.jpg` | `https://images.unsplash.com/photo-1715613814722-cf382ef7d07c?w=1600&q=80&fm=jpg&fit=max` |
| `craft-01.jpg` | `https://images.unsplash.com/photo-1515799251528-8e14681f214e?w=1600&q=80&fm=jpg&fit=max` |
| `craft-02.jpg` | `https://images.unsplash.com/photo-1645859420769-6bab07d29745?w=1600&q=80&fm=jpg&fit=max` |
| `texture-plate.jpg` | `https://images.unsplash.com/photo-1638376776402-9a4b75fe21bb?w=1800&q=80&fm=jpg&fit=max` |

Search pages used for discovery: `https://unsplash.com/s/photos/<query>` for each query
listed above.

## Verification

Every file was checked after download: JPEG magic bytes (`FF D8 FF`) present and size
> 20 KB. All 11 passed. No grey-box or placeholder imagery ships — the spec's fallback
rule is served by `texture-plate.jpg`, which doubles as the `.is-plate` background when
any other image fails to load.

## Fonts

`assets/fonts/` holds 7 latin-subset `.woff2` files pulled from Google Fonts and
self-hosted (Instrument Serif regular + italic, Space Grotesk 400/500/700, JetBrains Mono
400/500). They are free to use commercially under the
[SIL Open Font License](https://fonts.google.com/attribution).
