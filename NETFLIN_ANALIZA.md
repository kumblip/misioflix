# Analiza Netflin na potrzeby MisioFlix

Przeanalizowane źródło: `Netflin-main.zip` (od użytkownika) — `Theme/Netflin.css` (ok. 192 kB, ok. 6427 linii), README i screenshoty desktop/mobile. Repozytorium: https://github.com/ahza-code/Netflin, licencja GPL-2.0.

Przydatne koncepcje zastosowane we **własnym** kodzie:
- Paleta zmiennych `--jf-palette-*` Jellyfin 12 Modern zamiast przypadkowych `!important` na każdym elemencie.
- Osobne selektory dla `.card`, `.cardScalable`, `.cardImageContainer`, `.cardText-*` oraz ekranów szczegółów.
- Stylowanie oryginalnych przycisków, menu i kontrolek odtwarzacza, bez zmian ich zachowania.
- Wspólne odstępy, typografia i media queries dla telefonu oraz pulpitu.
- Delikatne pulsowanie placeholderów obrazów, bez opóźniania autentycznego ładowania.

Czego NIE kopiowano:
- Nie importujemy Netflin.css ani jego zasobów i grafik.
- Nie używamy zewnętrznego Media Bar, KefinTweaks, Google Fonts, JavaScript Injectora.
- Nie przejmujemy czerwonej palety, elementów logo ani tła Netflin.
- Nie przepisujemy długich wyrażeń CSS Netflin ani reguł jego dodatków.

Od strony funkcji MisioFlix różni się od motywu Netflin: lekki endpoint podaje osobiste oceny, liczniki i gatunki z NFO anime dla widocznych oryginalnych kart. Nie ma nowej strony, pobierania całego katalogu ani przeglądarek niezależnych od Jellyfin.
