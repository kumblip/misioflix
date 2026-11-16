# Instalacja MisioFlix Native v0.4.73.0

## Opcja 1 — pełna paczka do GitHub

1. Pobierz archiwum `MisioFlix_Native_v0.4.73_GitHub_PELNE.zip`.
2. Rozpakuj je i wgraj jego zawartość do katalogu głównego repozytorium `kumblip/misioflix`, z zachowaniem struktury katalogów.
3. Zatwierdź commit. W GitHub Actions uruchomi się budowanie zgodnie z obecnym workflow. Numer wersji `0.4.73.0` jest w `meta.json` i przenosi się do projektu skryptem `tools/sync_version.py`.
4. Pobierz artefakt skompilowanej wtyczki / publikację Release zgodnie z dotychczasowym procesem, zainstaluj w Jellyfin 12.4 i zrestartuj kontener.
5. W wyszukiwarce anime zaznacz `Pokaż osobne części anime`, wpisz `arifur`. W podpowiedziach powinno się pojawić m.in. `2020 · ONA · 1 odcinek`, `2022 · Special · 1 odcinek` i `2024 · Seria TV · 16 odcinków`.

## Opcja 2 — tylko zmiany względem v0.4.72

Na repozytorium z dokładnie wersją v0.4.72 nałóż pliki z `MisioFlix_Native_v0.4.73_TYLKO_ZMIANY.zip`, również zachowując ścieżki. Nie używaj tego archiwum jako samodzielnego repozytorium.

Nie wysyłaj `season.nfo` użytkownika do repozytorium; pliki NFO pozostają na NAS-ie.

Ta paczka zawiera **kod źródłowy**, nie gotową, skompilowaną DLL. Uruchomiono testy źródłowe, a nie testy na NAS.
