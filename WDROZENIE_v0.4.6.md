# MisioFlix Native v0.4.6.0 — domyślny widok strony głównej Jellyfin 12.4

## Cel

Po zalogowaniu do **oryginalnego Jellyfin Web (:8096)** strona Home pokazuje MisioFlix bez dodatkowego przycisku otwierania, pełnoekranowego portalu ani osobnej usługi. Interfejs jest montowany wewnątrz natywnej strony głównej Jellyfin (`#indexPage .homeSectionsContainer`). **Nadal używa JavaScript** dostarczanego przez natywną wtyczkę C# — Jellyfin 12 nie zapewnia oficjalnego interfejsu całkowitej wymiany swojego frontendowego routera. Nie podmieniamy `index.html` na dysku.

## Nowe w v0.4.6

- Automatyczny MisioFlix na Home po zalogowaniu; nie podczas logowania.
- Usunięty pływający przycisk `mf-launch`, ukryty modal i akcja „Powrót do Jellyfin”.
- Oryginalne menu Jellyfin, Dashboard, logowanie i odtwarzacz nie są przechwytywane.
- Katalogi, wyszukiwarki, szczegóły, sezony i „Moje MAL” są widokami wewnątrz natywnego Home.
- Zakładki i szczegóły zapisują adres przeglądarki i działają z historią Wstecz/Dalej.
- Odcinki seriali i anime są rzeczywiście pobierane przez uprawniony `Shows/{seriesId}/Episodes` Jellyfin (wcześniej API zwracało pustą tablicę).
- Dla anime **nie używamy nazw odcinków z Jellyfin**; wyświetlamy numery sezon/odcinek, a opis i tytuł anime pochodzą nadal z NFO.
- Kliknięcie przycisku otwierania odcinka przekazuje sterowanie oryginalnemu Jellyfin Web. Wtyczka nie implementuje drugiego odtwarzacza.
- Utrzymane funkcje v0.4.5: NFO, karty, obramowania, karuzele, MAL na wielu kontach, OAuth localhost, background refresh.

## Instalacja na GitHub

1. Rozpakuj ZIP i wrzuć **zawartość** do katalogu głównego repozytorium `kumblip/misioflix`, zachowując strukturę ścieżek. Zastąp pliki o tej samej nazwie.
2. NIE usuwaj `manifest.json`, `.github/workflows/release.yml`, konfiguracji Jellyfin ani zapisanych tokenów MAL. W paczce ich nie ma.
3. Commit do `main`; otwórz GitHub Actions i upewnij się, że `build` przechodzi, w tym `dotnet publish` dla net10.0. Plik `tools/package.py` jest zgodny z numerem wersji z `meta.json` i tworzy `MisioFlix_0.4.6.0_JF12.4.zip`.
4. Dopiero po **zielonym buildzie** uruchom istniejący workflow publikacji GitHub (`PUBLIKUJ`).
5. W Jellyfin zainstaluj wersję 0.4.6.0 w katalogu, a następnie uruchom ponownie **tylko kontener Jellyfin**.
6. Odśwież przeglądarkę `Ctrl+Shift+R` i przejdź do Home.

## Testy akceptacyjne na NAS-ie — konieczne

1. Po logowaniu otwórz Home. Ma pojawić się MisioFlix bez klikania osobnego przycisku.
2. Kliknij Anime, Filmy, Seriale, „Szukaj anime”, „Szukaj filmów i seriali”, „Moje MAL” i sprawdź, czy treści się zmieniają.
3. Otwórz plakat serialu: lista sezonów i odcinków ma się pojawić (bez fałszywych opisów anime z Jellyfin).
4. Użyj przeglądarkowego Wstecz oraz przycisku „Wróć do katalogu”.
5. Otwórz odcinek — powinien przejąć go oryginalny widok szczegółów i odtwarzacz Jellyfin; powrót na Home przywraca MisioFlix.
6. Sprawdź ustawienia Jellyfin i panel administratora, aby potwierdzić brak przechwytywania tych ekranów.
7. Na drugim koncie Jellyfin sprawdź izolację postępu/ocen/MAL.
8. Sprawdź osobno układ Jellyfin 12 Modern i mobilny. Nie oznaczaj kompatybilności jako potwierdzonej, dopóki te testy nie przejdą.

## Znane ograniczenia

- Nie jest to kompilacja własnego klienta Jellyfin Web, tylko widok HTML/JS dostarczany przez natywną wtyczkę i osadzany w oryginalnym Home. Nie istnieje stabilny, oficjalny plugin API do pełnego zastąpienia wszystkich ekranów Jellyfin Web 12.4.
- Osadzenie korzysta z wewnętrznego selektora `#indexPage .homeSectionsContainer`. Jeśli konkretna instalacja Jellyfin 12.4 używa innego układu DOM, MisioFlix może się nie zamontować — wtedy oryginalny Home pozostanie widoczny. Wyślij zrzut i log konsoli, dopasujemy selektor.
- W przypadku dużych serii API ogranicza listę odcinków do 4000 na jeden tytuł. Nie dotyczy katalogu głównego.
- Nie uruchamiano DLL na Twoim NAS-ie. W tej sesji brak .NET 10, więc nie przeprowadzono lokalnej kompilacji C# ani testu rzeczywistej przeglądarki Jellyfin.

## Wycofanie

Jeżeli nowa wersja jest niezgodna z Twoim układem strony Jellyfin, możesz wyłączyć MisioFlix w ustawieniach wtyczki lub zainstalować poprzednie wydanie. Nie usuwaj katalogu danych pluginu, tokenów MAL ani NFO. Oryginalny Jellyfin i odtwarzacz nie są modyfikowane na dysku.
