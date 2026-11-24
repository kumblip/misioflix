# MisioFlix 0.4.142.0 — poprawka włączania diagnostyki

Baza: 0.4.141.0. Wydanie naprawcze; nie usuwa jeszcze limitu katalogu.

- Panel diagnostyczny korzysta z `ApiClient.getUrl()` oraz nagłówka Authorization w formacie MediaBrowser jak pozostałe panele administracyjne, także przy Base URL Jellyfina.
- Otwarcie panelu nie blokuje przycisku Włącz: kliknięcie anuluje pasywne pobieranie stanu i ignoruje jego spóźnioną odpowiedź.
- Natychmiastowy komunikat operacji, limit 12 s, czytelny błąd 401/403/404, brak pozorowania powodzenia przy braku potwierdzenia API lub sesji pomiarowej przeglądarki.
- Identyfikacja serwera w sesji pomiarowej obsługuje także ConnectionManager i adres serwera, gdy klient nie udostępnia serverId.
- Bez zmian w katalogu, odtwarzaniu, wyglądzie Home, konfiguracji MAL/SIMKL i workflow.

Testy lokalne: 593 Python, 71 skryptów Node (6 nowych testów panelu, 1 nowy test sesji). Kompilacja .NET 10 i test NAS nadal wymagane. Wersja nie jest STABLE.
