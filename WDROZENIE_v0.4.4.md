# MisioFlix Native v0.4.4.0 — jeden MAL Client ID, osobne konta użytkowników

Repozytorium: https://github.com/kumblip/misioflix
Jellyfin: 12.4 · .NET: 10 · UGREEN NASync DXP4800 Plus

**Paczka jest aktualizacją PLIKÓW ŹRÓDŁOWYCH, nie gotową wtyczką `.dll`.**
Nie zmienia NFO, bibliotek, oryginalnego `index.html` ani konfiguracji Dockera.

## Co zmieniono

1. **Jedna aplikacja MAL v2 dla całego serwera.** Administrator podaje raz Client ID (i opcjonalny Secret) w istniejącej stronie konfiguracji wtyczki.
2. **Indywidualne konta MAL.** Użytkownik Jellyfin łączy własne konto przy użyciu OAuth 2.0 i PKCE `plain` (wymóg MAL), z jednorazowym `state` i kodem wygasającym po 10 minutach.
3. **Jednoczesne korzystanie.** Operacje odświeżania tokenu, odczytu listy i zapisu zmian są blokowane wyłącznie W OBRĘBIE jednego konta Jellyfin. Osoby A, B i C mogą synchronizować równolegle. Wspólna blokada jest używana tylko przy nowym łączeniu, aby dwa konta Jellyfin nie zajęły naraz jednego konta MAL.
4. **Moje MAL w nagłówku MisioFlix.** Użytkownik widzi powiązany nick i identyfikator konta MAL oraz przyciski `Połącz`, `Odśwież MAL`, `Odłącz`. Widok konta jest również dostępny z ekranu szczegółów anime.
5. **Niemieszanie użytkowników.** Żądania identyfikują konto przez uwierzytelniony profil Jellyfin. Po przełączeniu użytkownika w przeglądarce interfejs czyści poprzedni katalog, listę wznowienia, dane MAL i ekran szczegółów. Opóźnione odpowiedzi z poprzedniej sesji nie zastępują danych nowej.
6. **Bezpieczeństwo i migracja.** Tokeny zostają na serwerze, w plikach na GUID Jellyfin z ograniczonymi uprawnieniami Unix; frontend ich nie dostaje. Istniejące tokeny z v0.4.3 są czytane bez kasowania i stopniowo uzupełniane o nick i identyfikator MAL. Odświeżenie tokenu nie usuwa przypisania do profilu.
7. **Jedno konto MAL → maksymalnie jeden użytkownik Jellyfin.** Jeśli MAL został już połączony z innym użytkownikiem, nowa próba zostanie odrzucona. Najpierw odłącz poprzednie powiązanie.

## Instalacja przez GitHub

1. Rozpakuj `MisioFlix_Native_v0.4.4_Poprawka_GitHub.zip` i prześlij **zawartość** do głównego folderu repozytorium `kumblip/misioflix`, nadpisując odpowiadające pliki. Nie usuwaj innych plików repozytorium (workflows, `Web/assets`, skrypty publikacji).
2. Commit do `main`. W GitHub Actions sprawdź zielony build i testy `dotnet publish` dla .NET 10 / Jellyfin 12.4.
3. Po udanym buildzie uruchom istniejący workflow Release. Docelowa wersja i tag: `0.4.4.0` / `v0.4.4.0`. Workflow powinien dodać paczkę DLL do GitHub Releases i zaktualizować `manifest.json`.
4. W Jellyfin przejdź do **Wtyczki → Katalog → MisioFlix**, zainstaluj `0.4.4.0`. Dopiero po potwierdzeniu instalacji zrestartuj **wyłącznie kontener Jellyfin** i użyj `Ctrl+Shift+R`.
5. W panelu wtyczki ma być widoczne `Active` / `0.4.4.0`. W MisioFlix w nagłówku pojawi się **Moje MAL**.

## Konfiguracja MAL

- Administrator tworzy JEDNĄ aplikację MAL pod https://myanimelist.net/apiconfig (OAuth2), zapisuje Client ID/Secret i dokładny `redirect_uri`, np. `https://twoja-domena/MisioFlix/api/mal/callback`.
- Publiczny callback powinien korzystać z HTTPS; lokalny adres HTTP jest dopuszczany przez wtyczkę dla LAN, **ale trzeba sprawdzić, czy formularz MAL akceptuje taki redirect URI**.
- Każdy użytkownik osobno loguje się do Jellyfin, otwiera **MisioFlix → Moje MAL → Połącz własne konto MAL**, autoryzuje na stronie MAL, wraca i klika **Odśwież MAL**.
- W panelu widzi wyłącznie **swój nick MAL oraz ID**, nie tokeny innych użytkowników.
- Dla przykładu jednocześnie możesz połączyć trzy odrębne konta MAL na trzech kontach Jellyfin. Możliwa jest większa liczba; obowiązują limity API, sieci i zasobów serwera.
- Każdy użytkownik aktualizuje status, ocenę, liczbę obejrzanych odcinków i powtórek ze szczegółów anime/sezonu. MAL ID jest odczytywane z odpowiedniego NFO.

## Granice tej wersji

- Synchronizacja **nie zmienia automatycznie** danych oglądania Jellyfin ani nie wysyła postępu do MAL po każdym odtworzeniu. Zapis MAL następuje po akcji użytkownika; lista jest pobierana przy wejściu lub odświeżeniu.
- Nie przeprowadzono rzeczywistego logowania do MAL ani prób równoległej synchronizacji z trzema prawdziwymi kontami, ponieważ dostęp do kont i Client ID jest po stronie administratora.
- W środowisku przygotowania nie ma .NET SDK, więc **C# nie był kompilowany**. Przed instalacją na NAS **obowiązkowo** wykonaj build na GitHub Actions i przetestuj pierwszy zapis na koncie testowym.
- Po starszych instalacjach mogły istnieć historyczne powiązania kilku profili Jellyfin do jednego MAL; nowe połączenia są blokowane, ale takie stare dane trzeba sprawdzić ręcznie.
- Zgodność z aplikacjami i WebView innych urządzeń pozostaje do weryfikacji w Jellyfin Web.

## Testy lokalne

Na pełnym źródłowym drzewie repozytorium (z zachowanymi plikami grafik):

- `node --check src/Jellyfin.Plugin.MisioFlix/Web/client.js` — OK
- `python -m unittest discover -s tests -v` — **18/18** testów OK (statyczne kontrakty źródeł + zachowanie JavaScript w izolowanym środowisku Node)
- `node tests/ui_behavior_v044.cjs` — OK

To NIE jest dowód poprawnego zbudowania DLL ani potwierdzenie działania prawdziwego OAuth MAL.
