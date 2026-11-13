# MisioFlix Native v0.4.49.0 — Simkl (BETA)

Baza: v0.4.48.0 z poprawką kompilacji C# CS0136. Stabilny punkt przywracania: v0.4.45.0.

- Oddzielny widok pojedynczego odcinka: oznacz obejrzany / nieobejrzany. Serwer sprawdza uprawnienia użytkownika Jellyfin, zgodność serial–sezon–odcinek i numer odcinka; zapis do Simkl wyłącznie przez `/sync/history` lub `/sync/history/remove` z konkretnym numerem.
- Film lub serial niezapisany w Simkl: przycisk **Dodaj do Simkl**, wybór statusu i opcjonalnej oceny. Serwer tworzy wpis przez `/sync/add-to-list`, podając TMDB/IMDb/TVDB, oryginalny tytuł i rok z autoryzowanych metadanych Jellyfina; dopiero po potwierdzeniu wysyła opcjonalną ocenę.
- Dotychczasowe rekordy: niezależna edycja bez zmiany istniejącego zachowania. Oglądanie Jellyfin nie powoduje synchronizacji.
- Nie dotykano MAL, ramek, odtwarzacza i workflow GitHub Actions.

**Uwagi:** testy syntetyczne nie są równoznaczne z rzeczywistym zapisem na koncie Simkl. Dla filmów i seriali konieczny identyfikator z metadanych Jellyfina i dopasowanie w bazie Simkl; operacje odrzucane jako `not_found` nie będą fikcyjnie oznaczane jako sukces.
