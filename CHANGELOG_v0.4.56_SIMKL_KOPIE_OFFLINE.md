# MisioFlix Native v0.4.56.0 — Simkl: lokalna baza i kopie historyczne (BETA)

Wersja oparta na v0.4.55.0. **Simkl obsługuje wyłącznie filmy i seriale**, również tytuły nieobecne w bibliotekach Jellyfina. **Nie pobiera ani nie archiwizuje anime z Simkl.** AnimePL i MAL pozostają nietknięte.

## Zmiany

- Każdy użytkownik Jellyfina ma osobną lokalną bazę Simkl. Aktualna kopia ma dodatkowo historię do 30 dziennych i 12 miesięcznych plików. Poprzedni stan jest zapisywany przed podmianą; kopie tworzą się przy operacjach zapisujących archiwum. Pierwszy zapis również tworzy kopię.
- Dodano import przywracający plik JSON w oknie Simkl; przed zastąpieniem lokalnej bazy powstaje osobna kopia `restore` (ostatnich 10 takich kopii). Import nie modyfikuje tokenów OAuth, danych MAL ani konta Simkl. Nie przyjmuje rekordów `anime`.
- Ręczne zmiany ocen, statusów oraz obejrzeń sezonów i odcinków są najpierw utrwalane lokalnie. Jeśli Simkl jest niedostępny, zostają w kolejce do późniejszego wysłania.
- Kolejka zapamiętuje unikalne ID, próby oraz błędy. Zmiana ręczna wygrywa z wcześniej zakolejkowaną automatyczną aktualizacją tego samego odcinka. Dla niedostarczonych potwierdzeń ocen/statusów przed ponownym zapisem sprawdzany jest obecny stan Simkl. Limit HTTP 429 stosuje `Retry-After`; pozostałe błędy mają ograniczone wykładnicze opóźnienie. Zmiany nie są usuwane bez potwierdzenia.
- Edycja **całego sezonu** zachowuje semantykę sezonu w Simkl, również jeśli biblioteka Jellyfina zawiera tylko część odcinków. Pojedyncze odcinki pozostają osobne.
- Oddzielny panel Simkl wyświetla ostatnią udaną synchronizację, datę lokalnego zapisu, liczbę oczekujących operacji, kopii dziennych i miesięcznych oraz liczby filmów i seriali w całym lokalnym archiwum. Dostępny jest import i dotychczasowy eksport JSON.

## Zachowanie synchronizacji i przywracania

- Automatyczny odczyt Simkl co 72 godziny pozostaje bez zmian; oczekujące zapisy są wysyłane przy dostępności połączenia.
- Po imporcie kopia zostaje od razu wyświetlona lokalnie. Po upływie kolejnego okresu 72 godzin Simkl ponownie pozostaje źródłem synchronizacji dla filmów i seriali. Przywrócenie lokalnej kopii **nie oznacza** wysłania całego archiwum do Simkl.
- Baza na NAS-ie nie obejmuje tokenów OAuth (są przechowywane oddzielnie), a logowanie każdego użytkownika pozostaje oddzielne.
- Liczniki ponownych obejrzeń pozostają **wyłącznie lokalne**; nie zostały dodane do Simkl. Nie zmieniono zachowania przejścia do następnego sezonu, progów oglądania, ramek ani innych zatwierdzonych funkcji.
- Wersjonowane kopie na NAS-ie nie zastępują zewnętrznej kopii w razie awarii całego urządzenia.

## Weryfikacja i ograniczenia

- Przeszło 295 testów Python oraz 15 skryptów Node.js, w tym nowe testy izolacji danych, zasad kolejkowania i archiwizacji.
- Przeprowadzono kontrolę równowagi nawiasów C# i kontrolę składni JavaScript.
- **Nie wykonano kompilacji .NET 10**, rzeczywistego logowania OAuth ani integracyjnego testu zapisu na Simkl. Ta wersja jest BETA do sprawdzenia w GitHub Actions i na urządzeniu.
- Zaakceptowana stabilna wersja przywracania pozostaje v0.4.45.0.
