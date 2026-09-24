# kelimeavi

Offline Türkçe kelime tahmin oyunu (Wordle tarzı) — tek HTML dosyası,
sıfır bağımlılık. Klavye durumu, istatistik ve günlük mod (yerel saat).

```text
$ npm test          # 10 çekirdek test (Node)
$ npm run build     # -> dist/index.html (~15 KB, tarayıcıda aç, offline oyna)
```

## Özellikler

- **Değerlendirme** — Wordle kuralları, doğru çift-harf işleme: aynı
  harf birden fazla geçiyorsa "present" sayacı cevaptaki adedi aşamaz.
- **Günlük mod** — yerel tarih (ör. 2026-09-24) djb2 hash'iyle
  deterministik kelime seçer; aynı gün = aynı kelime.
- **Klavye durumu** — ekran klavyesi harf renklerini taşır; "correct >
  present > absent" hiyerarşisi, asla düşürmemez.
- **İstatistik** — oynanan, kazanma yüzdesi, güncel/en iyi seri
  localStorage'da saklanır.
- **Kelime listesi** — gömülü cevap listesi + ekstra kabul edilen
  tahminler (`src/core.ts` içinde, kolayca genişletilir).

## Build

`build.ts`, `src/core.ts` + `src/ui.ts`'yi Node'un native
`stripTypeScriptTypes` API'siyle JS'e çevirip tek
`dist/index.html`'e gömer. tsc yok, bundler yok, npm install yok.

## Geliştirme

```console
$ npm test
$ npm run build
```

## License

MIT — see [LICENSE](LICENSE).
