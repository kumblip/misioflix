# Wdrożenie MisioFlix v0.4.105.0

## Aktualizacja z v0.4.104.0
1. Wgraj pliki z `MisioFlix_Native_v0.4.105_TYLKO_ZMIANY_OD_104.zip` do katalogu głównego repozytorium, zachowując dokładnie istniejącą strukturę folderów. Jeżeli repozytorium odbiega od v0.4.104, użyj pełnych źródeł po porównaniu zmian.
2. Uruchom **dotychczasowe** GitHub Actions `build` i po pomyślnym przebiegu `release` z potwierdzeniem `PUBLIKUJ`.
3. Po instalacji w Jellyfin zrestartuj serwer i odśwież przeglądarkę (Ctrl+F5). Oczekiwany numer DLL i wydania: `0.4.105.0`.

## AnimePL i przyszła biblioteka AnimeEN
- **Nie zmieniaj obecnego** katalogu `/media/raid/animelektor`. Na NAS-ie odpowiada on folderowi `animelektor`.
- Nowy katalog na NAS-ie będzie nazywać się dokładnie **`anime`**, np. `/volume1/media/anime`. Jellyfin w kontenerze musi widzieć go jako `/media/raid/anime` — jeśli istnieje mapowanie całego `/volume1/media` do `/media/raid`, dodatkowe mapowanie nie jest potrzebne.
- Dodaj do Jellyfina nową bibliotekę (np. wyświetlaną jako **AnimeEN**) wskazującą `/media/raid/anime`; nazwa biblioteki musi zawierać słowo `anime`, aby była widoczna w dotychczasowym wyborze bibliotek anime.
- Zadbaj o tvshow.nfo/season.nfo/movie.nfo, MAL ID i tag Anime tak jak w obecnej bibliotece. Źródłem informacji o wersji językowej jest lokalizacja plików, nie automatyczne rozpoznawanie audio.
- Domyślnie w wyszukiwarce zaznaczony jest „Lektor (AnimePL)”. Odznaczenie pokazuje tylko wpisy z katalogu `anime`.
- Jeśli nowa biblioteka nie istnieje, odznaczenie „Lektor” po prostu pokaże brak wyników.
- Ani konfiguracja dysków, ani biblioteki Jellyfina, ani NFO nie są automatycznie modyfikowane przez tę aktualizację.

## Regresje do sprawdzenia
- Wyszukiwarka: wpisz frazę, zaznacz wymagany i wykluczony gatunek, typ i bibliotekę, przewiń, kliknij „Odśwież dane”; ustawienia powinny zostać.
- Po aktualizacji pierwszy odczyt katalogu z Jellyfina może potrwać jak wcześniej (zmiana schematu cache); kolejne otwarcia korzystają z nowego cache v2.
- Sprawdź MAL, wykluczenie Simkl, zielone i dwukolorowe ramki w „Więcej podobnych”.
- Sprawdź `/MisioFlix/api/health` i porównaj numer ze stanem wtyczki w Jellyfinie.
