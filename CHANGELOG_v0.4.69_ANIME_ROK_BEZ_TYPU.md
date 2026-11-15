# MisioFlix Native v0.4.69.0 RC — tylko rok na kartach biblioteki AnimePL

## Zmiana

- Wyłącznie biblioteka AnimePL (`#/mixed`): plakietka daty pokazuje np. `2019` zamiast `2019 · Seria TV`.
- Szczegóły anime i sezonów, wyszukiwarki, strona główna, filmy i seriale poza AnimePL zachowują swoje dotychczasowe etykiety i układ.
- Podczas nawigacji pomiędzy `#/mixed` i innymi widokami odświeżana jest sygnatura wizualnej plakietki, aby zaktualizować napis bez pozostawiania starej treści.
- Bez zmiany danych NFO, MAL, Simkl, ramek statusów, mechanizmu edytora i natywnych węzłów DOM.

## Testy

- Automatyczny test rzeczywistej funkcji `attachOverlay` sprawdza etykietę anime na `#/mixed`, etykietę na innych trasach, serial/film oraz przejście między widokami.
- Uruchomić `python tools/run_tests.py`; kompilację DLL sprawdzić w GitHub Actions i działanie na NAS.

Baza: v0.4.68.0. v0.4.64.0 pozostaje zatwierdzonym stabilnym checkpointem.
