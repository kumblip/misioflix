# MisioFlix Native v0.4.86.0 — poprawka kompilacji .NET

Naprawiono problem z v0.4.85 zgłoszony przez GitHub Actions:

- `CS0246`: typ `User` w `MisioFlixNextEpisodeWatchService.cs` pochodzi z `Jellyfin.Database.Implementations.Entities.User`, a nie `MediaBrowser.Controller.Entities`.
- Odkryto i poprawiono również wywołanie `MarkPlayed`: Jellyfin 12.4 wymaga argumentów `User`, `DateTime?` i `resetPosition`.
- Zachowano wykrywanie kliknięcia „Następny odcinek”, a dodatkowo potwierdzone bezpośrednie uruchomienie bezpośrednio kolejnego odcinka na tym samym urządzeniu i dla tego samego użytkownika; nie zmieniono progu 90%.
- Bez zmian w wyszukiwarkach, bibliotekach, infinite scroll, NFO, MAL i Simkl.
- Dodano test zapobiegający ponownemu wprowadzeniu obu błędów sygnatur.

**Weryfikacja:** testy Python/Node oraz testy statyczne. Pełne `dotnet publish` musi wykonać GitHub Actions (lokalnie nie ma SDK .NET 10). Wydanie powinno być opublikowane dopiero po udanym buildzie.

- Przy potwierdzonym rozpoczęciu bezpośrednio następnego odcinka na tym samym urządzeniu (w ciągu 45 sekund od ostatniego zdarzenia poprzedniego) poprzedni otrzymuje Played i PlaybackPositionTicks=0; obejmuje także przełączenie z odtwarzacza przez „Następny”.
- Jeśli poprzedni jest już Played, ale ma niezerowy punkt wznowienia, czyścimy go bez podnoszenia PlayCount i bez zmiany LastPlayedDate.

- Zweryfikowano 393 testy Python i 36 skryptów JavaScript. Nie potwierdzono jeszcze kompilacji DLL, którą wykonuje GitHub Actions.
