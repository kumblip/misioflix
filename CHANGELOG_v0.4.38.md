# MisioFlix Native 0.4.38.0 — diagnostyka MAL i oznaczenia AnimePL

## Diagnostyka liczby ponownych obejrzeń

- W szczegółach anime i sezonu dodano domyślnie zamkniętą sekcję **Diagnostyka MAL**.
- Przycisk **Uruchom diagnostykę** wykonuje dwa bezpieczne żądania GET do oficjalnego MAL API tylko dla MAL ID odczytanego z NFO bieżącej, autoryzowanej pozycji:
  1. `fields=my_list_status`,
  2. jawne pola w `my_list_status{status,score,num_episodes_watched,num_times_rewatched,is_rewatching}`.
- Wyświetla status HTTP i czas odpowiedzi, obecność pól (w tym `num_times_rewatched`), zwróconą liczbę odcinków i powtórek oraz stan cache serwera i przeglądarki.
- Rozróżnia prawdziwe `0` i pole **NIE ZWRÓCONO**; nie zgaduje ilości powtórek.
- Diagnostyka działa tylko po kliknięciu. Wynik na serwerze ważny przez 45 sekund dla wskazanego użytkownika Jellyfin i MAL ID, aby uniknąć spamowania API.
- Endpoint `/MisioFlix/api/mal/diagnostics` wymaga zalogowania i potwierdzenia dostępu do anime/sezonu na podstawie NFO. Raport nie przekazuje tokenów, kodów OAuth, nagłówków, pełnego JSON ani danych innych kont.
- Diagnostyka **nie zapisuje niczego w MAL**, nie modyfikuje tokenów, NFO, historii Jellyfin ani głównego cache odczytów.

## Biblioteka AnimePL

- Przybliżono oznaczenia natywnych kart `#/mixed` do karuzeli MisioFlix: oddzielnie `ANIME` i rok, cyfry sezonów/odcinków z łapkami 🐾 zamiast napisów `Sez.` i `Odc.`, osobista ocena MAL `/10`, gatunki, opis i statusowe ramki.
- Zachowano sposób z v0.4.37: wyłącznie atrybuty kart i pseudo-elementy CSS; bez wstawiania HTML do elementów WebComponents i bez zmian struktury przewijania.

## Zakres i weryfikacja

- 157/157 testów Python i 2/2 testy Node lokalnie.
- Przeglądarkowy test symulowany: brak automatycznej diagnostyki; dwa warianty odpowiedzi (pole nieobecne versus `5`) i raport bez danych logowania.
- Rzeczywista odpowiedź MAL dla konta użytkownika oraz kompilacja DLL w GitHub Actions nie zostały zweryfikowane lokalnie.
- Bez zmian w workflow GitHub, OAuth, odtwarzaczu, bibliotekach filmów i seriali.
