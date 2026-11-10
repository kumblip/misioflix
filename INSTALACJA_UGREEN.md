# Instalacja po pomyślnej kompilacji — UGREEN DXP4800 Plus, Jellyfin 12.4

**Nie instaluj ZIP-a ze źródłami z tej wiadomości bez zbudowanej DLL.**

1. Zrób kopię konfiguracji Jellyfin i zanotuj istniejący sposób uruchomienia.
2. W Docker → Container → Jellyfin → Basic Information → Volume Mapping znajdź
   **hostowy katalog** połączony z **`/config` wewnątrz Jellyfin**.
   To ważne: lokalizacja na NAS-ie nie musi być `/volume1/docker/jellyfin/config`.
3. W hostowym katalogu konfiguracji utwórz:
   `plugins/MisioFlix_0.4.0/`.
4. Umieść tam z *paczki skompilowanej* pliki:
   `Jellyfin.Plugin.MisioFlix.dll` i `meta.json`.
   Pozostaw wszystkie inne wtyczki i ustawienia bez zmian.
5. W Docker uruchom ponownie **wyłącznie kontener Jellyfin**.
6. Wejdź w Jellyfin Dashboard → Plugins i sprawdź status MisioFlix.
7. Sprawdź `http://kumadlaneko:8096/MisioFlix/api/health`.
8. Otwórz `http://kumadlaneko:8096/web/index.html`, odśwież bez cache (Ctrl+F5),
   zaloguj się i sprawdź przycisk misioflix (prawy dolny róg).
9. Otwórz obie wyszukiwarki. Katalog może być pusty, dopóki nie dodasz bibliotek
   do Jellyfin. Gatunki anime pochodzą z plików NFO, a pozostałe z Jellyfin.
10. Przetestuj oryginalny odtwarzacz i powrót do katalogu na jednym tytule,
    zanim udostępnisz to pozostałym użytkownikom.

**Uwaga o NFO:** Jellyfin musi wewnątrz swego kontenera widzieć
`/media/raid/animelektor` jako istniejącą ścieżkę do odczytu.
Według wcześniejszej konfiguracji Twój Jellyfin już ma odczyt `/volume1/media`
zamontowany jako `/media/raid`. Wtyczka sama nie zakłada nowego woluminu.

## Nie ruszamy projektów

- Jellyfin: `:8096` — pozostaje jedynym docelowym adresem użytkownika.
- misioflix 0.2 `:8097`: stare testowe rozwiązanie, może zostać do porównania.
- misioflix Bridge 0.3 `:8098`: wersja eksperymentalna, nie jest potrzebna wtyczce.

## Cofnięcie zmian

Jeżeli Jellyfin nie startuje po instalacji:

1. W Docker zatrzymaj **tylko Jellyfin**.
2. Z folderu `/config/plugins` (ścieżka hosta ustalona w kroku 2) **przenieś**
   `MisioFlix_0.4.0` poza katalog `plugins` lub zmień nazwę tak, aby nie była
   rozpoznawana jako wtyczka.
3. Uruchom ponownie Jellyfin. Jego oryginalny `index.html` nigdy nie był modyfikowany.
4. Nie usuwaj innych katalogów `plugins`, NFO ani zawartości bibliotek.

## Ograniczenia etapu 0.4

Ten etap to kontrolowany test mechanizmu osadzania i własnego katalogu.
Automatyczne zastąpienie wszystkich standardowych kart i zgodność aplikacji
Jellyfin Mobile/Media Player to kolejne etapy — nie deklarujemy ich jako gotowych.
