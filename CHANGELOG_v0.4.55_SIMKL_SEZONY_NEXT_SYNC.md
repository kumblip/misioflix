# MisioFlix Native v0.4.55.0 — Simkl

Bazą zmian jest **v0.4.54.0**. Wersja stabilna **v0.4.45.0** pozostaje niezmieniona.

1. **Kafelki sezonów**: po autoryzowanym, zbiorczym odczycie lokalnej historii odcinków Simkl status każdego sezonu bazuje na jego obejrzanych odcinkach oraz aktywnym wznowieniu z Jellyfin. Gdy znana jest pełna historia i liczba odcinków: 0 obejrzanych → różowy; część → złoty; wszystkie → zielony; wszystkie + aktywne wznowienie → pół złota/pół zielony. Zawsze złoty, jeśli jest wznowienie bez zakończenia. Jeśli brak wiarygodnej liczby odcinków albo lokalnej historii, zachowany jest dawny fallback Jellyfin.
2. **Następny odcinek**: osobna reguła 75% bez zmian. Przejście do kolejnego numeru odcinka tego samego serialu (także do Sxx+1E01) po faktycznym rozpoczęciu poprzedniego (pozycja >0) oznacza poprzedni jako obejrzany bez progu 5% / 1 minuty. Skok do odległego odcinka nie jest automatycznym ukończeniem. Urządzenie jest rozróżniane per sesja.
3. **Kontrola 72 h**: nawigacja do bibliotek, kolekcji, filmu, serialu, sezonu lub odcinka sprawdza termin aktualizacji per użytkownik. Serwer używa lokalnego znacznika CheckedAt; przy wygaśnięciu odświeża w tle z punktu widzenia interfejsu, bez blokowania ekranu. Zmiany odświeżają oceny, ramki i widok szczegółów. Niesprawny Simkl nie usuwa kopii NAS; wielokrotne wejścia na ten sam ekran są ograniczone i synchronizacja jest serializowana per użytkownik.

Nie zmieniono integracji MAL, bazowych szczegółów, logiki odtwarzacza, release workflows ani danych Jellyfina. **Wymagana kompilacja .NET 10 przez GitHub Actions i test na NAS; lokalnie uruchamiane testy źródeł nie zastępują kompilacji.**
