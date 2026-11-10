# MisioFlix Native v0.4.5.0 — MAL bez HTTPS + niezależne automatyczne odnawianie

## Co zawiera paczka

To aktualizacja **źródeł** działającej natywnej wtyczki Jellyfin 12.4, a nie skompilowana DLL.
Zachowuje dotychczasowy katalog, widok kart, odtwarzacz Jellyfin, karuzele, oceny i dane NFO.

- OAuth 2.0 / PKCE `plain` MAL: alternatywny, ręczny zwrot jednorazowego kodu przez `localhost`;
- autoryzowany endpoint `POST /MisioFlix/api/mal/complete`, w którym **pełny przekierowany URL** (z `code` i `state`) jest wysyłany w treści POST;
- sprawdzenie stanu, ważności, właściciela (konto Jellyfin) i dokładnego redirect URL, jednorazowe zużycie kodu;
- stare logowanie automatycznym callbackiem HTTPS nadal jest obsługiwane;
- zadanie w tle `MisioFlixMalRefreshHostedService` co 12 godzin, uruchamiane także przy starcie Jellyfin;
- odnawianie tokenów z wyprzedzeniem 7 dni przed końcem ważności access tokenu, niezależnie od przeglądarek i Tailscale;
- osobne tokeny, blokady oraz historię dla każdego użytkownika, z zachowaniem plików autoryzacyjnych v0.4.4;
- błędy odnowienia jednego konta nie zatrzymują pozostałych.

## Publikacja przez GitHub

1. Rozpakuj `MisioFlix_Native_v0.4.5_Poprawka_GitHub.zip`.
2. Przenieś **zawartość** archiwum (a nie sam plik ZIP) do głównego katalogu swojego repozytorium `kumblip/misioflix`, podmieniając wskazane pliki.
3. Zachowaj istniejące `.github/workflows/release.yml`, `manifest.json`, tokeny i konfigurację Jellyfin — ZIP ich nie modyfikuje.
4. Commit do `main`; sprawdź zielony wynik GitHub Actions: kompilacja C# `net10.0` i testy.
5. Dopiero po udanym buildzie uruchom istniejący workflow publikacji wydania **0.4.5.0**.
6. W Jellyfin zainstaluj `0.4.5.0` z katalogu, po potwierdzeniu instalacji uruchom ponownie kontener Jellyfin.
7. Sprawdź `Wtyczki → MisioFlix → Wersja: 0.4.5.0`.

**Nie przebudowuj kontenera Jellyfin, nie zmieniaj `index.html` i nie edytuj NFO.**

## Konfiguracja MyAnimeList bez domeny HTTPS

Przed logowaniem sprawdź, czy MAL akceptuje w formularzu Twojej aplikacji `App Redirect URL`:

`http://localhost:8765/callback`

1. Na `https://myanimelist.net/apiconfig` utwórz / edytuj jedną aplikację MisioFlix (`web`) i ustaw dokładnie ten Redirect URL.
2. W **Jellyfin → Wtyczki → MisioFlix → Ustawienia** podaj ten sam Redirect URL, wspólny `Client ID` oraz `Client Secret` (jeśli wydany).
3. Zalogowany użytkownik otwiera **MisioFlix → Moje MAL → Połącz własne konto MAL**.
4. Na stronie MAL udziela zgody. Przekierowanie do `localhost` może wyświetlić błąd — celowo nie uruchamiamy lokalnego serwera.
5. Użytkownik kopiuje **cały adres** z paska przeglądarki, np. `http://localhost:8765/callback?code=...&state=...` i wkleja go w „Moje MAL”.
6. Kliknięcie **Połącz moje konto MAL** wymienia kod na tokeny po stronie NAS-a, bez udostępniania hasła MAL.
7. Każdy następny użytkownik Jellyfin robi to samo z **własnym kontem MAL**. Kod jednej osoby nie może być użyty dla innego użytkownika Jellyfin.

**Uwaga:** przyjęcie adresu localhost w formularzu zależy od zasad MAL i wymaga sprawdzenia podczas faktycznej rejestracji. Jeśli MAL odrzuci callback, ta metoda nie zadziała do czasu zmiany metody logowania. Kod jest jednorazowy, krótkotrwały i powiązany z PKCE; nie publikuj przekierowanego adresu w sieci ani na zrzutach.

Nie wpisuj IP Tailscale ani `https://misioflix.tail22e5bb.ts.net` jako redirect w tym wariancie. Normalny dostęp do Jellyfin nadal działa przez Twoje IP `100.79.153.38:8096`.

## Utrzymanie autoryzacji przez tygodnie

- Wtyczka odnawia kwalifikujące się tokeny podczas startu Jellyfin i co 12 godzin.
- Dotyczy to także użytkowników wylogowanych z Jellyfin oraz osób, których telefony odłączono od Tailscale.
- Wymagane są działający Jellyfin i dostęp NAS-a do `myanimelist.net`; NAS wyłączony lub pozbawiony sieci nie odnowi tokenów.
- Dostawca może token unieważnić lub zmienić zasady, więc **nie można zagwarantować bezterminowego działania bez ponownego połączenia**.
- Logi udostępniają zbiorcze liczby odnowień i błędów, nie wypisują tokenów.
- Automatyczne **odnawianie tokenów** nie oznacza jeszcze automatycznego wysyłania postępu po każdym odtworzeniu. Odczyt i edycja MAL zachowują dotychczasową logikę v0.4.4.

## Weryfikacja

Testy lokalne:

```sh
node --check src/Jellyfin.Plugin.MisioFlix/Web/client.js
python3 -m unittest discover -s tests -v
```

Wszystkie muszą przejść. Testy statyczne i symulacje JS nie zastępują kompilacji C# ani rzeczywistego logowania do MAL (które wymaga Client ID i autoryzacji konta).

## Wycofanie zmian

Jeśli build albo logowanie się nie powiedzie, pozostań na wersji 0.4.4 i nie usuwaj folderu `/config` ani plików autoryzacyjnych. Przejście z v0.4.4 do 0.4.5 nie zmienia formatu zapisanych tokenów.
