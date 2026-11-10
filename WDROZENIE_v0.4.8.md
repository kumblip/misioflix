# MisioFlix v0.4.8 — instalacja i weryfikacja

**Uwaga: to zmiana źródeł, nie skompilowana DLL.** Publikacja i testy na Jellyfin 12.4 są konieczne.

## Zawartość ZIP
Wgrać pliki z zachowaniem ścieżek w repozytorium `kumblip/misioflix` i nadpisać podane pliki. Paczka jest łatką, NIE pełnym repozytorium — istniejące `Plugin.cs`, `Controllers`, `Services` związane z MAL i NFO oraz `tools/update_manifest.py` pozostają bez zmian.

## Procedura
1. Zachowaj kopię działającego wydania v0.4.7. Nie usuwaj danych ani ustawień użytkowników.
2. Wgraj źródła ZIP do `main` w GitHub.
3. Actions → Build. Wymagany sukces `node --check`, testów JS/Python i `dotnet publish`.
4. Actions → Publish/Release (`PUBLIKUJ`) dopiero po poprawnym buildzie. Sprawdź wersję `0.4.8.0` w `manifest.json`.
5. Wtyczki → Katalog → MisioFlix 0.4.8.0 → Zainstaluj → restart tylko kontenera Jellyfin.
6. Odśwież przeglądarkę `Ctrl+Shift+R`. Sprawdź także na telefonie.
7. Jeżeli używasz osobnego Custom CSS albo JavaScript Injector z dawnym MisioFlix, usuń **tylko dawny skrypt i CSS MisioFlix**; innych wtyczek nie ruszaj.

## Lista testowa
- Po zalogowaniu pojawia się **jeden** oryginalny nagłówek.
- Moje multimedia ma ciemne kafelki z cienkim obrysem i nie jest już jaskraworóżowe.
- Kontynuuj odtwarzanie to zwarta plansza z oryginalnymi kartami.
- Karuzele ostatnio dodane mają czytelniejsze nagłówki i stylowane karty.
- Kliknięcie plakatu otwiera natywne szczegóły, kliknięcie odcinka uruchamia oryginalny odtwarzacz.
- Nie pojawia się osobne „Ładowanie katalogu Jellyfin i NFO...”, podwójna nawigacja ani błąd 404 spowodowany dodatkowym routingiem.
- Nie wyświetlają się żadne *zmyślone* oceny lub statusy użytkownika.

## Diagnostyka widoku
W Jellyfin 12 Modern część komponentów ma zmienne klasy HTML. Jeśli kafelki lub sekcje nie zostaną oznaczone, prześlij zrzut z `F12 → Elements` dla **jednego** kafelka Moje multimedia oraz nagłówka Kontynuuj odtwarzanie. Nie trzeba udostępniać loginów, tokenów ani danych MAL.

## Powrót
W razie problemów z wizualizacją wróć do wersji 0.4.7 lub wyłącz wtyczkę i uruchom ponownie Jellyfin. Nie zmieniamy bibliotek, NFO, Tailscale, ani ścieżek Dockera.
