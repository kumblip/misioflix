# MisioFlix v0.4.98 — automatyczny kolaż okładek kolekcji bez plakatu

## Cel i zakres
Kolekcje `BoxSet` pozbawione własnego plakatu, np. Café Myszka, mają w MisioFlix wyglądać jak normalne kolekcje. Jeśli w Jellyfinie istnieje własny plakat BoxSetu, ma bezwzględne pierwszeństwo.

## Miejsca użycia
- Sekcja „Kolekcje” na stronie głównej (`home.js`, `makePoster` / `makeCard`).
- Pełna lista kolekcji `#/home?mfCollections=1` (ten sam wspólny komponent karty).
- Strona szczegółów kolekcji (`details.js`, `showCollectionDetailPreview`): nakładka dekoracyjna wewnątrz natywnego kontenera plakatu, bez przenoszenia elementów Jellyfina.

## Reguły wizualne
- 1 dostępna okładka: jedna na całej wysokości.
- 2 okładki: dwie kolumny, po połowie szerokości.
- 3 okładki: pierwsza w dużym lewym polu, dwie kolejne po prawej.
- 4 i więcej: siatka 2x2 z pierwszych czterech okładek.
- Brak dostępnych obrazów: dotychczasowy placeholder.
- Błąd pojedynczego obrazu dziecka: usunięcie uszkodzonego pola i automatyczna korekta układu.
- Błąd własnego plakatu na kartach katalogu: uruchomienie kolażu.

## Skąd są pobierane dane
Zalogowany użytkownik odczytuje `GET /Users/{userId}/Items?ParentId={boxSetId}&Recursive=false&Limit=32&EnableImages=true&ImageTypeLimit=1&EnableUserData=false`. Klient pobiera obrazy z istniejących endpointów `/Items/{childId}/Images/Primary`. Nie pobiera obrazów z Internetu ani z zewnętrznych usług. Wykorzystuje tylko dostępne dla użytkownika pozycje kolekcji.

## Wydajność i bezpieczeństwo
- Zapytania tylko dla kolekcji bez plakatu, leniwie (IntersectionObserver, margines 180px).
- Maksymalnie trzy równoczesne zapytania o zawartość kolekcji na stronie głównej / katalogu.
- 15 sekund limitu na żądanie; błędy nie blokują strony.
- Pamięć podręczna powiązana z ID użytkownika: trafienie 5 minut, brak okładek 1 minutę.
- Gdy ta sama kolekcja pojawia się na kilku kartach, aktualizowane są wszystkie widoczne instancje.
- Żadnego POST, PUT, PATCH ani DELETE. Nie ma zapisu grafik do NAS, NFO, katalogu kolekcji ani bazy Jellyfina.
- Synchronizator NFO i istniejąca obsługa BoxSetów v0.4.97 nie zostały zmienione.

## Zmienione moduły
- `src/Jellyfin.Plugin.MisioFlix/Web/home.js`: leniwe pobieranie i kolaże na kartach.
- `src/Jellyfin.Plugin.MisioFlix/Web/details.js`: fallback na natywnej stronie szczegółów kolekcji.
- `src/Jellyfin.Plugin.MisioFlix/Web/theme.css`: warianty 1–4.
- `tests/current/test_collection_fallback_preview_098.py`: kontrola źródłowa funkcji i izolacji.
- `tests/current/test_nfo_movies_diagnostics_097.py`: test wersji nie wymaga już stałego numeru.
- `meta.json`, `Jellyfin.Plugin.MisioFlix.csproj`, `configPage.html`, `MisioFlixNativeCatalogRefreshService.cs`: wersjonowanie.

## Ograniczenia
- Kolaż nie jest trwałym plakatem Jellyfina i nie będzie widoczny w innych klientach Jellyfin korzystających wyłącznie z jego obrazów.
- Zmiana plakatu w trakcie otwartej strony może wymagać ponownego wejścia/odświeżenia, aby nowe metadane BoxSetu zostały pobrane.
- Jeśli co najmniej 32 pierwsze pozycje kolekcji nie mają plakatów, fallback może pozostać pusty mimo grafiki przy późniejszych pozycjach. To świadomie ograniczony koszt zapytania.
- Na szczegółach fallback uruchamia się przy braku tagu obrazu Primary; błąd wczytania istniejącego natywnego Primary jest obsługiwany na kafelkach, ale nie wyzwala osobnej nakładki detali.
- Rzeczywiste zachowanie na NAS wymaga testu wdrożeniowego.
