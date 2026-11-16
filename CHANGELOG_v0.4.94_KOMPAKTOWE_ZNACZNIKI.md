# MisioFlix v0.4.94 — kompaktowa ramka statystyk z samym pudełkiem

**Podstawa:** v0.4.93.0 z naprawionym CI (pełna paczka `MisioFlix_Native_v0.4.93_CI_NAPRAWA_PELNE.zip`).

## Problem
W kafelkach filmów, np. Bad Boys, bez innych statystyk poza `N 📦` czarna ramka zachowywała szerokość typową dla łapek. Wynikało to z `min-width:38px` wiersza oraz dodatkowych odstępów otaczającego bloku.

## Zmiana
Wyłącznie CSS: `.mf-native-stats` i `.mf-home-stats` mają mniejszą szerokość/padding **tylko jeśli** ich jedynym dzieckiem jest licznik przynależności do kolekcji. Selektor `:has(> ...:only-child)` nie wpływa na karty z łapkami. Dla jedynego licznika nie obowiązuje minimalna szerokość rezerwowana dla wielowierszowego zestawu. Zachowano wspólną ramkę, numery, kolejność i wyrównanie ikon.

## Co pozostaje bez zmian
Backend C#, NFO, MAL, Simkl, API kolekcji, odtwarzanie, wyszukiwarki, infinite scroll, struktura DOM kart i zwykły licznik `N 🎬` kolekcji BoxSet. W czterech plikach metadanych zaktualizowano wyłącznie numer wersji.

## Weryfikacja
- Jedyny licznik: szerokość ramki dopasowana do `N 📦`, bez rezerwy dla łapek.
- Statystyki z łapkami i pudełkiem: bez zmian, jedna wspólna ramka.
- Mobilny układ: jeszcze ciaśniejsze odstępy.
- Sprawdź `tests/current/test_compact_member_badge_094.py` i wyniki `tools/run_tests.py`.
