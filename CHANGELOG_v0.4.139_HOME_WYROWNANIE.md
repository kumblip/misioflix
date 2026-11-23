# MisioFlix 0.4.139.0 — wyrównanie przełączników strony głównej

## Zmiana

- Cały pasek przycisków `Propozycje`, `Uwzględnij anime`, `Audio PL` oraz `Napisy Wszystkie` jest wyrównany **do lewej** pod `Oglądaj dalej`, na komputerze i na telefonie.
- Same gałki przełączników w **zielonych stanach domyślnych** pozostają po **prawej** stronie toru.
- Zachowano paletę z 0.4.138: zielony = domyślny, niebieski = alternatywny, pomarańczowy = trzeci stan.
- Zachowano przewijanie paska poziomo na węższych ekranach oraz układ przycisków, kliknięcia i etykiety.
- Bez zmian w Home JS, bibliotekach PL/ENG, MAL, SIMKL, NFO, filtrowaniu i odtwarzaczu.

## Wersja

`meta.json` i projekt C# zawierają `0.4.139.0`. Skrypt wydania uwzględnia ręcznie określony **wolny, wyższy numer**, zamiast automatycznie zmieniać go na 0.4.140.0. Jeśli 0.4.139.0 istnieje już w tagach lub manifeście, automatycznie wybierze kolejny dostępny numer.

## Testy

- `node tests/current/home_switch_palette_138.cjs`
- `python3 tools/run_tests.py`
- kompilacja .NET 10 i publikacja przez GitHub Actions
