# Wdrożenie 0.4.144.0

1. Rozpakuj ZIP ze zmienionymi plikami w katalogu repozytorium 0.4.143.0 (nadpisz pliki, zachowaj ścieżki). Manifest pozostaw obsłudze dotychczasowego workflow.
2. Commit / push, standardowy `build`, następnie `release` z `PUBLIKUJ` po sukcesie kompilacji.
3. Zainstaluj wydanie, zrestartuj Jellyfin i odśwież stronę Ctrl+F5.
4. Sprawdź zwykłe działanie wyszukiwarki i propozycji: gatunki anime, audio, napisy, losowanie i przewijanie. Nie trzeba włączać diagnostyki ani eksportować raportów. Pierwsze pobranie odświeży katalog automatycznie.
5. W przypadku regresji wróć do ostatniego działającego wydania. Nie oznaczaj 144 jako STABLE bez sprawdzenia na NAS-ie.
