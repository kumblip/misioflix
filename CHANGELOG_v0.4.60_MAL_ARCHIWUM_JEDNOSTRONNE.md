# MisioFlix Native v0.4.60.0 — MAL: pełne archiwum tylko do odczytu

Podstawa: zatwierdzony stabilny checkpoint v0.4.59.0.

## Zmiany

- Nowy, całkowicie odrębny od Simkl moduł `MisioFlixMalArchiveService` oraz harmonogram `MisioFlixMalArchiveHostedService`.
- Pobieranie całej listy aktualnie połączonego konta MAL przez oficjalne `GET /users/@me/animelist`, z paginacją do końca, bez filtra statusów. Wpisy: oglądam, ukończone, planuję, wstrzymane, porzucone, w tym anime niewystępujące w Jellyfinie. Przechowywany jest cały obiekt wpisu zwrócony przez MAL, a nie tylko ocena.
- Bieżąca kopia `current.json` oraz historia 30 plików dziennych i 12 plików miesięcznych. Kopie są oddzielne dla konta Jellyfina i identyfikatora MAL. Kopia z dzisiejszego dnia/miesiąca odzwierciedla ostatnie udane pełne odświeżenie. Nie tworzy się sztucznych plików za dni, w których serwer nie był uruchomiony.
- Kontrola terminu 72 godzin na starcie serwera (następnie co 15 min) i podczas aktywności użytkownika. Po >72 godzinach pobieranie w tle; ekran Jellyfina nie czeka na zakończenie. Po awarii lub przerwaniu pobierania dotychczasowe kopie pozostają nietknięte; ponowna próba po 15 min.
- Po udanym, świadomym kliknięciu istniejącego `Zapisz w MAL`: odczyt szczegółów z MAL nadal działa tak jak wcześniej, a dodatkowo planowany jest nowy pełny backup. Żaden inny impuls (80%, kolejny odcinek, ✓ Jellyfina, lokalne pliki) nie zapisuje do MAL.
- Nowy blok „Lokalne kopie MyAnimeList” w istniejącym oknie połączenia MAL na stronie głównej: informacje o ostatnim pełnym odczycie, liczbie wpisów i kopii, wybór pliku JSON i **„Pobierz wybraną kopię”**. Nie istnieje przycisk importu i nie dodano endpointów importu/przywracania.
- Bezpieczne, autoryzowane endpointy tylko do odczytu: `GET /MisioFlix/api/mal/archive/status` i `GET /MisioFlix/api/mal/archive/download?kind=current&key=current` (również `daily`, `monthly`). Dane OAuth i sekret nie trafiają do eksportowanego JSON.
- Oddzielny arkusz `Web/mal-archive.css`; brak zmian w `simkl.js`, `simkl.css`, usługach Simkl, `theme.css`, funkcjach ramek i odtwarzaczu.

## Zasady niezmienne

1. Kopie MAL płyną wyłącznie **MAL → NAS → pobrany JSON**.
2. Jedyną ścieżką zapisu do konta MAL pozostaje ręczny przycisk `Zapisz w MAL` w istniejącym edytorze anime.
3. Pobieranie, otwieranie, przeglądanie i przechowywanie backupów nigdy nie modyfikuje konta MAL.
4. Integracja Simkl obsługuje tylko filmy i seriale; nie pobiera anime, nie korzysta z kopii MAL.

## Weryfikacja

- 308 testów Pythona i 16 skryptów Node.js zakończonych pomyślnie.
- W tej sesji nie było kompilatora .NET 10 ani dostępu do działającego Jellyfina/MAL; kompilacja DLL i rzeczywisty odczyt API muszą zostać zweryfikowane po wdrożeniu przez GitHub Actions.
