# MisioFlix Native 0.4.35.0 — stabilizacja AnimePL

- Dla natywnego widoku `#/mixed` zredukowano modyfikacje kart Jellyfin do atrybutów (`data-mf-card`, NFO MAL ID, status MAL).
- Nie wstawiamy do wirtualizowanej listy własnych HTML badge, opisów, plakatów ani elementów przewijania.
- Kolory ramki MAL pozostają możliwe dzięki atrybutom `data-mf-watch` po uzupełnieniu informacji przez istniejący serwer.
- Oryginalne `#/list` (filmy i seriale), karuzele strony głównej, katalogi i odtwarzacz są nietknięte.
- Bez zmian w konfiguracji konta MAL i w zasadzie: brak licznika to „Brak danych”, nie 0.

## Nierozwiązane

Problem `num_episodes_watched` / `num_times_rewatched` należy usunąć w `Services/MisioFlixMalService.cs` (niedostępny w przekazanych archiwach). Sam klient nie może odczytać pól, których nie zwraca backend.

Wyjątek `e.addScrollEventListener is not a function` powstaje w module Jellyfin. Nowy sposób współpracy z jego DOM ogranicza ryzyko konfliktu, ale bez testu na NAS-ie nie można potwierdzić pełnego rozwiązania.
