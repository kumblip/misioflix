# MisioFlix Native v0.4.101.0 — wdrożenie (Jellyfin 12.4)

Następne wydanie po **v0.4.100.0** — oryginalny proces publikacji, bez zmian w GitHub Actions.

1. Jeśli gałąź `main` ma dokładnie v0.4.100.0, wgraj zawartość paczki `MisioFlix_Native_v0.4.101_TYLKO_ZMIANY_OD_100.zip`, zachowując foldery. W innym przypadku użyj zawartości **pełnej** paczki `MisioFlix_Native_v0.4.101_GitHub_PELNE.zip` (sprawdź wcześniej niezapisane zmiany w swoim repozytorium).
2. Potwierdź `"version": "0.4.101.0"` w `meta.json`, `<Version>0.4.101</Version>` i `<AssemblyVersion>0.4.101.0</AssemblyVersion>` w `.csproj`.
3. Uruchom dotychczasowy workflow `build`, a po jego pomyślnym zakończeniu `release` z potwierdzeniem `PUBLIKUJ`.
4. Oczekiwane wydanie: `v0.4.101.0`; ZIP instalacyjny: `MisioFlix_0.4.101.0_JF12.4.zip`.
5. Po instalacji uruchom ponownie Jellyfin. Sprawdź obejrzane/nieobejrzane/rozpoczęte i mieszane statusy w „Sugerowanych”, w szczególności przy najechaniu na kafelek.

Nie uruchamiaj żadnych skryptów nakładających łatki: ta paczka zawiera gotowe pliki. Zachowano funkcjonalność v0.4.100; zmieniono tylko CSS sekcji „Sugerowane” oraz numer wydania i dokumentację.
