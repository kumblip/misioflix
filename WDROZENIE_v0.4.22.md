# Wdrożenie MisioFlix Native v0.4.22.0

Repozytorium: `kumblip/misioflix`. Jellyfin 12.4.0, .NET 10. Aktualizacja źródeł — **to nie jest instalacyjny ZIP z DLL**.

1. Rozpakuj `MisioFlix_Native_v0.4.22_Odtwarzanie_Wstecz_Gatunki_GitHub.zip` na komputerze.
2. Przenieś zawartość wypakowanych katalogów do katalogu głównego repozytorium GitHub, zachowując dokładne ścieżki.
3. Wgraj `meta.json`, zmienione pliki `src/Jellyfin.Plugin.MisioFlix/...`, zmienione testy w `tests/current/` oraz dołączone dokumenty.
4. **Nie zmieniaj `.github/workflows/build.yml` i `release.yml`.** Wersja pochodzi z `meta.json`; włączona synchronizacja `tools/sync_version.py`.
5. Uruchom GitHub Actions → Build, sprawdź testy i kompilację. Pakiet instalacyjny po poprawnym buildzie powinien nazywać się `MisioFlix_0.4.22.0_JF12.4.zip`.
6. Opublikuj nową wersję normalnym dotychczasowym sposobem i zaktualizuj ją w Jellyfin. Zrestartuj kontener. W przeglądarce naciśnij `Ctrl+F5`.

## Testy na NAS (istotne)

- Strona główna: kliknij pozycję „Oglądaj dalej” z rozpoczętym filmem i odcinkiem. Oczekiwane: odtwarzacz otwiera konkretny materiał, korzystając z natywnego „Wznów”. Przez moment może pojawić się strona odcinka — nie powinno się na niej zatrzymać.
- Przejdź do strony filmu, serii, sezonu i odcinka. Oczekiwane: przycisk `← Wstecz`, brak `Wylosuj`, wszystkie inne kontrolki działają.
- Otwórz szczegóły anime, kliknij np. „Akcja”. Oczekiwane: modalna **Wyszukiwarka anime** z zielonym filtrem „Akcja”, bez filmów i seriali z pozostałych bibliotek.
- Otwórz szczegóły filmu nie-anime i kliknij np. „Akcja”. Oczekiwane: modalna **Wyszukiwarka filmów i seriali** z takim samym zielonym filtrem, bez anime.
- Sprawdź nadal działające odtwarzanie, karuzele, ramki statusów i nawigację sezonów.

Jeśli konkretna akcja się nie uda, zachowaj zrzut ekranu i ewentualny błąd z F12 → Console; nie przywracaj starszych plików CSS ani nie mieszaj różnych wersji.
