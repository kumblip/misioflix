# MisioFlix Native v0.4.64.0 — ocena przed datą/rokiem

## Zmiana wyłącznie wizualna
- MAL: osobista ocena / „Bez oceny” pokazuje się na początku wiersza metadanych, przed datą/rokiem, zamiast na prawym końcu nagłówka.
- Simkl: osobista ocena / „Bez oceny” z różową łapką zajmuje identyczne położenie, przed rokiem, a nie obok przycisku Odtwórz.
- Pozostawiono oddzielny HTML/CSS/JS obu systemów; żadnych zmian API, baz, NFO, odtwarzania, archiwów, ramek i stanów oglądania.
- Nieobecny w trakcie montowania wiersz metadanych: awaryjne miejsce po tytule, potem przeniesienie przed datę.
- Wersja stabilna do przywracania pozostaje v0.4.59.0.

## Wdrożenie
Wgrać zawartość ZIP „TYLKO ZMIANY” do repozytorium, zbudować DLL w GitHub Actions i po instalacji wyczyścić cache/odświeżyć Jellyfin.
