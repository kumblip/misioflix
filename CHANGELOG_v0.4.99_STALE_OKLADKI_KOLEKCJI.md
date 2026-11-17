# MisioFlix v0.4.99.0 — stałe plakaty kolekcji Jellyfina

## Po co
Kolaże z v0.4.98 są tylko elementami JavaScript, więc przy zmianach widoku w Jellyfin SPA mogły zniknąć do odświeżenia przeglądarki. v0.4.99 daje administratorowi możliwość **jednorazowego utworzenia prawdziwej grafiki Primary dla BoxSetu**. Zwykły Jellyfin i wszystkie strony MisioFlixa pobierają odtąd tę samą okładkę z serwera.

## Gdzie
Dashboard Jellyfina -> Wtyczki -> MisioFlix -> Konfiguracja -> "Stałe okładki kolekcji Jellyfina" -> "Wygeneruj i zapisz brakujące okładki kolekcji".

## Technika
- Front-end w `src/Jellyfin.Plugin.MisioFlix/Web/configPage.html`, funkcja `permanentCollectionPosters`.
- Administrator ręcznie uruchamia operację oraz potwierdza liczbę pustych okładek.
- `GET /Users/{userId}/Items?IncludeItemTypes=BoxSet&Recursive=true&...` — lista BoxSetów.
- `GET /Items/{collectionId}/Images` — rzeczywista kontrola, czy okładka Primary już istnieje; ponowna kontrola przed POST.
- `GET /Users/{userId}/Items/{collectionId}` — weryfikacja, że to faktycznie BoxSet.
- `GET /Users/{userId}/Items?ParentId={collectionId}...` — wyłącznie widoczne dla admina pozycje i ich rzeczywiste identyfikatory.
- `GET /Items/{childId}/Images/Primary` — plakaty; ignorowane są pozycje bez plakatu, błędy pojedynczych obrazów nie zatrzymują pozostałych.
- Canvas 840×1260; 1 plakat pełny, 2 pionowe połowy, 3 lewa połowa + 2 prawe, >=4 siatka 2×2; `object-fit:cover` realizowane przez obliczenie skali przy `drawImage`.
- `canvas.toDataURL('image/jpeg',0.89)` -> czysty ciąg base64; Jellyfin 12.4 wymaga base64 w body `POST /Items/{collectionId}/Images/Primary` z nagłówkiem `Content-Type: image/jpeg` i autoryzacją administratora. NIE przesyłać multipart ani binarnego blobu!
- Po zapisie ponownie `GET /Items/{collectionId}/Images` potwierdza obraz.

## Bezpieczeństwo
- Nie uruchamia się podczas startu Jellyfina, nawigacji SPA ani synchronizacji NFO. Tylko kliknięcie administratora i potwierdzenie.
- Nigdy nie nadpisuje istniejącego obrazu Primary, w tym ręcznie ustawionego przez użytkownika.
- Nie usuwa obrazów, kolekcji, filmów, seriali ani NFO.
- Trwale **zapisuje wygenerowany obraz w danych metadanych Jellyfina**, czyli jest to świadoma modyfikacja natywnego zasobu Jellyfina (inna niż wyłącznie wizualna v0.4.98).
- Nie zmienia usługi NFO v0.4.97 ani logicznej zawartości kolekcji.
- Obrazy nie są automatycznie regenerowane przy zmianie zawartości kolekcji. Aby odtworzyć plakat, usuń konkretny wygenerowany obraz Primary w normalnym edytorze obrazów Jellyfina i użyj przycisku ponownie.
- Gdy kolekcja nie ma żadnego dostępnego plakatu członka, nic nie zapisuje. Dotychczasowy kolaż przeglądarkowy nadal pozostaje jako fallback.

## Testy
- Test `tests/current/collection_primary_poster_099.cjs` symuluje natywne API: admin click -> Base64 POST -> potwierdzony Primary; brak zapisu po anulowaniu; plakat istniejący nie jest nadpisany.
- Test `tests/current/test_collection_primary_poster_099.py` pilnuje reguł administracyjnych, wersjonowania, braku automatycznych zapisów oraz izolacji synchronizacji NFO.
- Pełny pakiet `python3 tools/run_tests.py`: 447 Python, 43 Node (pass w lokalnym środowisku).
- Test w działającym Jellyfinie 12.4 na NAS-ie oraz `dotnet publish` — do wykonania po wgraniu do CI; w środowisku przygotowującym paczkę nie ma SDK .NET.
