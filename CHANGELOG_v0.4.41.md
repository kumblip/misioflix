# MisioFlix Native v0.4.41 — AnimePL i ramki MAL

- Przywrócono strukturę znacznika roku na kartach natywnej biblioteki z działającej v0.4.39; bez modyfikowania Jellyfin React scroller/router.
- Wzmocniono obramowanie stanu MAL (różowy: nieobejrzane, złoty: w trakcie, zielony: obejrzane) na wszystkich kartach anime — biblioteka, sezony i „Więcej podobnych”. Obramowanie jest nakładką CSS z `pointer-events:none`, dzięki czemu nie przechwytuje kliknięć.
- Kiedy pełna lista MAL użytkownika jest pobrana, tytuł z MAL ID nieobecny na liście otrzymuje status nieobejrzany. Niepełne dane nadal mają status nieznany.
- Zmniejszono na telefonie łapki i liczby do 10 px oraz tytuł/opis w bibliotece AnimePL. Pole roku jest wizualnie obcinane do czterech cyfr bez ingerencji w stabilną strukturę v0.4.39.
- Dopasowano mobilną wyszukiwarkę anime do kart biblioteki: rok, liczby z łapkami, gatunki, tytuł, opis, brak redundantnej etykiety ANIME.
- Nie zmieniano zapisu ani pobierania MyAnimeList, oryginalnego odtwarzacza, NFO, innych bibliotek ani workflow GitHub Actions.

## Ograniczenia
Testy Chromium wykonano na uproszczonej strukturze HTML, nie na rzeczywistym komponencie Jellyfin 12.4. Błąd `e.addScrollEventListener is not a function` wymaga ponownej weryfikacji na NAS-ie.
