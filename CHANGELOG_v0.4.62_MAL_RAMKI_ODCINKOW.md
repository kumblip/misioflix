# MisioFlix Native v0.4.62.0 — ramki pojedynczych odcinków anime

Baza: v0.4.61.0 (archiwum MAL v0.4.60 i nienaruszona integracja Simkl).

## Jedyna nowa funkcja

W szczegółach sezonu anime każdy natywny wiersz odcinka Jellyfina otrzymuje osobne, wyłącznie wizualne obramowanie:

- różowe: odcinek nieoznaczony w Jellyfinie jako obejrzany i bez aktywnego wznowienia;
- złote: aktywna pozycja wznowienia tego odcinka bez potwierdzenia ukończenia;
- zielone: dany odcinek jest oznaczony jako obejrzany w Jellyfinie, bez wznowienia;
- złoto-zielone: dany odcinek ma aktywne wznowienie i jest już oznaczony jako obejrzany w Jellyfinie **lub** bieżący sezon anime ma status „Obejrzane” w MAL.

Status „Obejrzane” całego anime w MAL sam w sobie nie zmienia na zielone odcinków nieoznaczonych w Jellyfinie. Zapobiega to zastąpieniu statusów poszczególnych odcinków statusem całej serii.

Do sprawdzenia wykorzystywane są wyłącznie istniejące odczyty: uwierzytelniony `Shows/{id}/Episodes` (UserData.Played) i `/MisioFlix/api/resume` (tylko rzeczywista pozycja, bez NextUp). Brak identyfikacji konkretnego odcinka oznacza brak dekoracji, a nie zgadywanie.

## Izolacja i brak zmian zachowania

- Nowe klasy i atrybuty: `.mf-mal-episode-row`, `.mf-mal-episode-frame`, `data-mf-mal-episode-watch`.
- CSS dodano tylko do `Web/mal-frames.css`, JS wyłącznie do `Web/mal.js`.
- **Brak zapisu do MyAnimeList**, zmian licznika, statusów, ocen i automatycznej synchronizacji obejrzeń.
- **Brak zmian Simkl, playbacku, serwisu .NET, NFO i workflow CI.**
- Ramki usuwane przy zmianie użytkownika oraz przejściu na inne szczegóły.
- Odczyt aktualizuje się po obsłudze kliknięcia w przycisk wiersza odcinka.

## Testy

Zestaw `tools/run_tests.py` zawiera testy stare i nowe (w tym `test_mal_episode_frames_062.py` i `mal_episode_frames_062.cjs`).

Nie kompilowano DLL (.NET 10 niedostępny lokalnie); kompilacja należy do GitHub Actions.
