# Wdrożenie MisioFlix v0.4.81.0

1. **Pełna paczka GitHub:** rozpakuj ZIP do katalogu głównego repozytorium `kumblip/misioflix`, zachowując `.github/workflows` i dotychczasowe pliki. Alternatywnie na v0.4.80 zastosuj ZIP zawierający wyłącznie zmiany.
2. Wypchnij zmiany do repozytorium. Dotychczasowy workflow GitHub Actions sam ustali numer z `meta.json`, zbuduje plugin i opublikuje wydanie/repozytorium.
3. W panelu administracyjnym MisioFlix kliknij „Wymuś pobranie aktualnego katalogu”, zainstaluj wydanie i w razie potrzeby zrestartuj Jellyfin.
4. W Edge odśwież `Ctrl+F5`. Otwórz wyszukiwarkę anime, odznacz osobne sezony, wpisz nazwę występującą *tylko* w `season.nfo`: nadrzędne anime nie powinno się pojawić. Wpisz nazwę główną lub alternatywną z `tvshow.nfo`: nadrzędne anime powinno się pojawić.
5. Przewiń wyszukiwarkę do dołu (więcej niż 30 wyników) — karty doładują się automatycznie. Sprawdź też wyszukiwarkę pozostałych produkcji i pełną stronę Kolekcje (partie po 24).

**Granice zmian:** osobnych stron bibliotek natywnych Jellyfina nie zastępujemy własnym systemem pagination. Ich istniejąca obsługa przewijania pozostała nietknięta. Wersja źródłowa nie jest DLL — nie udajemy testu kompilacji ani wdrożenia na NAS.
