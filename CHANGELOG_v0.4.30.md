# MisioFlix Native 0.4.30.0 — MyAnimeList użytkownika

- Nowy przycisk **Połącz MAL / MAL: nazwa** po prawej stronie banera, obok bibliotek i wyszukiwarek.
- Każdy użytkownik Jellyfin łączy własne konto MyAnimeList. Client ID i sekret nie są kopiowane do przeglądarki; serwer korzysta z już skonfigurowanych wartości.
- OAuth PKCE wykorzystuje istniejący backend: `/api/mal/connect`, `/api/mal/complete`, `/api/mal/disconnect` i callback.
- Przy obecnym `http://localhost:8765/callback` przeglądarka może pokazać błąd połączenia po autoryzacji; można skopiować adres z jednorazowym `code`/`state` i wkleić do dialogu. Jest też przycisk ponownego sprawdzenia połączenia.
- Szczegóły **anime** i **sezonu**: status MAL, ocena 0–10, liczba obejrzanych odcinków, liczba powtórek MAL, przyciski „Zapisz w MAL” i „Odśwież z MAL”. Nie dotyczy zwykłych filmów i seriali.
- MAL ID pobierane wyłącznie z NFO i rozstrzygane na serwerze przez `AuthorizedMalIdAsync`; sezon jest przypisany do swojego MAL ID, bez automatycznego używania identyfikatora całej serii.
- Przy otwarciu głównej nie pobieramy listy MAL. Dane anime są ładowane dopiero po otwarciu szczegółów, z pamięcią lokalną per użytkownik i MAL ID na godzinę; ręczne odświeżenie może pobrać bieżące dane z MAL.
- Zapis MAL dotyczy wyłącznie konta powiązanego z aktualnym użytkownikiem Jellyfin. Nie zmienia plików multimediów, NFO ani istniejącego oznaczania odcinków w Jellyfin.
- Dodano nowy lekki endpoint `/api/mal/connection` i autoryzowany `/api/mal/item` dla pojedynczego wpisu.
- Zachowano istniejący układ biblioteki, kolekcje, odtwarzanie i workflow GitHub.

## Ograniczenia testów

Lokalny test Chromium zweryfikował zachowanie interfejsu z zasymulowanymi odpowiedziami API. NIE wykonano rzeczywistego logowania do MAL ani kompilacji DLL z pełną bazą źródeł (część klas istniejącej usługi MAL nie była dostępna w historycznych paczkach różnicowych). Wdrożenie wymaga działającego backendu MAL obecnego w repozytorium użytkownika.
