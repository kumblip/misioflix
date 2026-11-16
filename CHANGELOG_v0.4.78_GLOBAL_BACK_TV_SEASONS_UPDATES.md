# MisioFlix Native v0.4.78.0 — strukturalny „Wstecz”, przyciski sezonów seriali, aktualizacje

## Nawigacja (nie tylko anime)
- Własny przycisk `← Wstecz` na ekranie szczegółów zawsze cofa o logiczny poziom: **odcinek → sezon → cała seria → strona główna MisioFlix**. Film/cała seria → strona główna. Bez `history.back()`; bez skakania po poprzednich wyszukiwaniach.
- Dotyczy zarówno anime, jak i **zwykłych seriali** oraz filmów.
- Małe przyciski `S01`, `S02`… nad odcinkami, w jednym przewijanym wierszu, ze stanem aktywnego sezonu, działają dla anime **i** seriali. Lista pochodzi z `Shows/{seriesId}/Seasons`, nie z heurystyki nazw.
- Klikałby nagłówek `ANIME › nazwa sezonu` **tylko** w anime; tytuły zwykłych seriali nie są zmieniane.

## Aktualizacje MisioFlix (panel administratora)
- Osobne dane: zainstalowana wersja DLL, opublikowany GitHub Release, świeży `manifest.json`, lista pakietów zwrócona przez katalog Jellyfina.
- Automatyczny **odczyt** wersji co 15 minut po stronie serwera (domyślnie włączony, możliwość wyłączenia), bez automatycznej instalacji i bez nadpisywania DLL.
- `Wymuś sprawdzenie aktualizacji` omija 15-minutową pamięć podręczną, pobiera GitHub i manifest na nowo, a następnie prosi Jellyfin o uruchomienie natywnego zadania `Update Plugins` poprzez `POST /ScheduledTasks/Running/{taskId}`.
- `Zainstaluj aktualizację` włącza się **tylko**, jeśli ta sama nowsza wersja jest dostępna w GitHub Release, manifeście oraz katalogu Jellyfina; repozytorium jest aktywne i manifest wskazuje `targetAbi=12.4.0.0`. Po potwierdzeniu administratora instalator używa natywnego `POST /Packages/Installed/MisioFlix`, nie modyfikuje plików wtyczek.
- Gdy GitHub ma nowszą wersję niż manifest lub katalog Jellyfina nadal nie widzi wersji, panel zgłasza tę konkretną rozbieżność zamiast udawać gotowość instalacji. Zadanie Jellyfina nie gwarantuje natychmiastowego odświeżenia katalogu, a instalacja może wymagać restartu serwera.
- Nie modyfikuje MAL, Simkl, NFO, Jellyfin Web ani systemowych plików DLL.

## Wymagane testy po wdrożeniu
1. Odcinek serialu → Wstecz → sezon → Wstecz → serial → Wstecz → MisioFlix home.
2. Wybór `S02` z sezonu `S01` w zwykłym serialu, aktywne wyróżnienie `S02`.
3. Identyczny test w anime wraz z klikalnym `ANIME` i bez zmiany zwykłego serialu.
4. W panelu MisioFlix admin: wymuszenie aktualizacji; porównanie GitHub/manifest/katalog, w tym sytuacja rozbieżności.
5. Instalacja przez Jellyfin tylko po opublikowaniu zgodnego release i manifestu; restart wg wymagań Jellyfina.

Źródła są przeznaczone do kompilacji .NET 10 / Jellyfin 12.4 przez istniejący workflow GitHub Actions. Kompilacja i testy na NAS wymagane osobno.
