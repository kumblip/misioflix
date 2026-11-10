# MisioFlix Native v0.4.3.0 — poprawka GitHub (Jellyfin 12.4)

Repozytorium użytkownika: https://github.com/kumblip/misioflix

**To jest ZIP ze zmienionymi plikami źródłowymi, NIE gotowa DLL.** Zachowaj obecną instalację 0.4.2.0, dopóki kompilacja i testy nowej wersji nie będą zielone.

## Publikacja

1. Rozpakuj źródłowy ZIP, wgraj **jego zawartość** do głównego katalogu repozytorium `kumblip/misioflix`. Zachowaj dokładne ścieżki `src/Jellyfin.Plugin.MisioFlix/...`, `tests/...`, `meta.json`; nadpisz starsze wersje tych plików.
2. Nie usuwaj innych plików repozytorium (grafik `Web/assets`, workflow, skryptów publikacji). **Nie wgrywaj niczego z katalogu `_patch_`** — takich plików nie ma w ZIP.
3. Zapisz commit, otwórz Actions. Najpierw weryfikuj build `.NET 10` dla Jellyfin 12.4; źródłowa paczka nie jest DLL.
4. Jeśli build przejdzie, uruchom dotychczasowy workflow wydania (z wymaganą przez niego wartością `PUBLIKUJ`). Wydanie powinno mieć `v0.4.3.0`, a workflow powinien zaktualizować manifest wtyczki.
5. Przez Jellyfin **Wtyczki → Katalog → MisioFlix** wybierz `0.4.3.0`, zainstaluj; po potwierdzeniu uruchom ponownie tylko kontener Jellyfin. W przeglądarce `Ctrl+Shift+R`.
6. Jeżeli build się nie powiedzie, nie instaluj nowego wydania — prześlij błąd kompilatora.

## UI i karuzele

- Przy plakacie `ANIME` ma rok i format (TV/OVA/ONA), a `FILM` i `SERIAL` mają tylko rok — bez powtarzania słowa Film/Serial.
- Mniejszy odstęp plakatu od tytułu i tytułu od opisu. Maksymalnie dwie linie tytułu, cztery opisu, dotychczasowe gatunki i ramki stanu.
- „Ostatnio dodane”, „Anime”, „Filmy”, „Seriale” są klikalne i otwierają pełną listę. Sekcje pokazują **domyślnie najnowsze** według pola `DateCreated` Jellyfin.
- Przy każdej karuzeli: `Losuj ↻`, po wylosowaniu `Najnowsze` pozwala wrócić do domyślnego porządku.

## Oceny użytkownika

- NIE używamy `CommunityRating` ani oceny opisowej NFO w łapce. Tylko indywidualna ocena użytkownika.
- Dla filmów i seriali odczytujemy `UserData.Rating` Jellyfin. Z ekranu szczegółów w MisioFlix można zapisać ocenę `1–10` co `0,5`; nie zmieniamy oceny społecznościowej.
- Dla pierwszego sezonu serialu ocena na głównym ekranie produkcji. Dla kolejnych sezonów osobne pola w widoku sezonów.
- **Anime po połączeniu MAL:** używamy oceny/statusu zalogowanego użytkownika MAL, nie średniej serwisu.

## MyAnimeList — konfiguracja, połączenie i testy

API używane przez wtyczkę: oficjalne MyAnimeList API v2. Wtyczka nie potrzebuje Jikan, AniList ani żadnego zewnętrznego pluginu Jellyfin.

1. W swoim koncie MAL utwórz aplikację w **https://myanimelist.net/apiconfig** i otrzymaj `Client ID` (oraz `Client Secret`, jeśli Twoja aplikacja go używa).
2. Zarejestruj adres powrotu zgodny z Twoją instalacją. Przykład dla lokalnego adresu: `http://kumadlaneko:8096/MisioFlix/api/mal/callback` — **tylko jeżeli MAL zaakceptuje taką lokalną domenę i HTTP**. W przeciwnym razie potrzebujesz adresu HTTPS widocznego dla przeglądarki, przekierowującego na istniejący Jellyfin (bez zmiany portu 8096).
3. W Jellyfin **Wtyczki → MisioFlix → Ustawienia** wpisz `Client ID`, opcjonalny `Client Secret` oraz dokładnie ten sam callback URL. Zapisz ustawienia. **Nigdy nie dodawaj danych uwierzytelniających do publicznego GitHuba**.
4. Otwórz anime w MisioFlix, użyj `Połącz konto MAL`, zaloguj się na MAL. Wróć do MisioFlix, kliknij `Odśwież MAL`.
5. Na ekranie anime pojawią się osobne sekcje pierwszego sezonu i kolejnych sezonów, o ile Jellyfin rozpoznaje je jako `Season`. Zapisz status, ocenę 0–10, obejrzane odcinki i powtórki. Przycisk **Zapisz w MAL** wywołuje `PATCH .../my_list_status` pod dokładnym ID z lokalnego NFO.
6. **ID z NFO:** np. w załączonym przykładzie `Absolute Duo` wpis `<uniqueid type="mal">25397</uniqueid>`. Sezony bez NFO/ID MAL są oznaczane i nie wysyłamy ich na przypadkowe ID.
7. Każde konto Jellyfin łączy swój MAL oddzielnie. Tokeny zapisują się pod prywatnym folderem danych Jellyfin (`/config/data/misioflix/mal` w typowym kontenerze), a nie w publicznym repozytorium. Odłączenie usuwa lokalne tokeny i nie kasuje listy MAL.

**Ograniczenia i ryzyko przed pierwszym użyciem:**

- Trzeba potwierdzić, jak Twoja biblioteka reprezentuje „podsezony”: jako prawdziwe sezony jednego serialu Jellyfin, czy osobne seriale. Na razie wykrywamy NFO głównego serialu i NFO w folderach sezonów (`tvshow.nfo`, `season.nfo`). Jeśli Jellyfin nie udostępnia podsezonu jako `Season` lub nie ma w nim NFO, nie zgadujemy MAL ID.
- Trzeba sprawdzić, czy MAL pozwoli zarejestrować adres powrotu `http://kumadlaneko:8096`. Bez poprawnej rejestracji OAuth nie połączy konta. Niczego nie publikujemy ani nie synchronizujemy w tle bez podłączonego konta.
- **Nie uruchamiano kompilacji C#/.NET 10 ani rzeczywistej autoryzacji MAL**, ponieważ w środowisku testowym brak SDK .NET 10 oraz Twojego konta/aplikacji MAL. Testy Node.js/Python sprawdzają logikę źródeł, nie działanie na NAS.
- Zmiana oceny Jellyfin używa `GET/POST UserItems/{id}/UserData` i zachowuje odczytane pola postępu. Potwierdź na jednym testowym filmie, że historia odtwarzania pozostała bez zmian.
- MAL nie zmienia automatycznie lokalnego stanu obejrzenia Jellyfin; status MAL i stan Jellyfin pozostają niezależne. Automatyczna synchronizacja Jellyfin → MAL podczas oglądania **nie jest** częścią tej wersji.
- Konfiguracja wtyczki zapisuje Client Secret w konfiguracji serwera. Dostęp do konfiguracji Jellyfin musi być ograniczony do zaufanych administratorów.

## Testy lokalne wykonane na kompletnym drzewie źródeł

`python -m unittest discover -s tests -v`: 13/13 testów przeszło. `node --check Web/client.js`: składnia poprawna. **To nie zastępuje testów kompilacji .NET i integracji API.**
