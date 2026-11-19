# MisioFlix Native v0.4.102.0 — poprawa stanów ramek w „Sugerowanych”

Podstawa: **v0.4.101.0**.

## Co poprawiono

W sekcji **„Więcej podobnych” / „Sugerowane”** na stronie szczegółów karta miała nadal ogólną ramkę sekcji, przez co stan oglądania nie był zgodny z resztą MisioFlixa.

Od teraz zewnętrzna ramka karty w `#itemDetailPage #similarCollapsible .similarContent` używa tych samych stanów co w pozostałych miejscach:

- **różowa** — nieobejrzane,
- **złota** — w trakcie,
- **zielona** — obejrzane,
- **złoto-zielona** — obejrzane + wznowienie / stan mieszany.

## Zakres zmian

Zmodyfikowano wyłącznie warstwę CSS sekcji „Sugerowane” oraz numer wydania i dokumentację testową. Nie zmieniano:

- logiki MAL,
- logiki Simkl,
- DOM kart,
- wyszukiwarek,
- odtwarzacza,
- NFO,
- workflow GitHub Actions ani mechanizmu wydawania.

## Weryfikacja

Do zestawu testów dodano regresję sprawdzającą komplet stanów ramek dla kart podobnych oraz zachowanie wersjonowania `0.4.102.0`.

Jak zawsze: testy automatyczne nie zastępują uruchomienia na prawdziwym Jellyfinie 12.4. Po wdrożeniu trzeba sprawdzić „Sugerowane” dla anime oraz tytułów z integracją Simkl.
