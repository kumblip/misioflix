# MisioFlix Native 0.4.92.0 — rzeczywiste wymuszenie wczytania manifestu przez Jellyfin 12.4

## Problem
Panel wersji v0.4.91 pokazywał: GitHub/manifest 0.4.91.0, natywny katalog Jellyfin 0.4.90.0. Stary przycisk wstrzykiwał `?mf_refresh=TIMESTAMP` do adresu repozytorium przez `POST /Repositories` z przeglądarki, co nie gwarantowało nowej zawartości, a potem jedynie ponownie odczytywał `/Packages`.

## Mechanizm w v0.4.92
**Jellyfin 12.4 nie ma osobnego zapisanego pliku katalogu wtyczek** do edycji; `InstallationManager.GetAvailablePackages()` odczytuje na żywo manifest z URL każdego aktywnego repozytorium. Potwierdzone w kodzie `Emby.Server.Implementations/Updates/InstallationManager.cs` tag v12.4.

Nowy przycisk **Wymuś aktualizację katalogu Jellyfina** wywołuje:
1. `POST /MisioFlix/api/updates/native-catalog/refresh` (polityka Jellyfin `RequiresElevation`, tylko administrator).
2. Serwer pobiera aktualny SHA `main` z `https://api.github.com/repos/kumblip/misioflix/commits/main` z nagłówkami anty-cache.
3. Buduje unikalny, niezmienny URL `https://raw.githubusercontent.com/kumblip/misioflix/<40-znakowy-commit>/manifest.json` — żaden starszy snapshot z ruchomego `main` nie może być pod nim zwrócony.
4. Wywołuje **Jellyfin** `IInstallationManager.GetPackages("MisioFlix", pinnedUrl, true, cancel)` i weryfikuje identyfikator pakietu, `targetAbi=12.4.0.0`, wersję >= zainstalowanej, `sourceUrl` z Releases MisioFlixa.
5. Zmienia wyłącznie `Url` pojedynczego zarejestrowanego repozytorium MisioFlix i używa `IServerConfigurationManager.SaveConfiguration()` — tej samej warstwy, co natywny `POST /Repositories`. Nie nadpisuje plików systemowych, DLL, listy innych repozytoriów ani manifestu w repozytorium.
6. Frontend dopiero **po potwierdzeniu zapisu** odczytuje `GET /Packages`, `GET /Repositories`, `GET /Plugins`, żeby potwierdzić, że sam Jellyfin zwrócił nową wersję. Instalacja jest dostępna dopiero przy zgodnym ABI i wersji w katalogu.

## Zachowanie i ograniczenia
- Zmiana repozytorium jest trwała do kolejnego wymuszenia albo ręcznej edycji. Ponieważ SHA jest niezmienny, **nowe przyszłe wersje wymagają ponownego kliknięcia Wymuś** (cykliczne sprawdzanie GitHub w MisioFlix pozostaje niezależne).
- Jeśli GitHub API zwróci błąd/rate-limit albo sam menedżer Jellyfina nie zaakceptuje manifestu, nie aktualizuje repozytorium; interfejs pokazuje błąd. NIE obiecywać sukcesu bez `GET /Packages`.
- Sama operacja nie instaluje pakietu; do instalacji służy osobny przycisk `Zainstaluj aktualizację`, wykonujący natywne `POST /Packages/Installed/MisioFlix?...`.
- Aby używać nowego przycisku, trzeba najpierw zainstalować DLL 0.4.92.0. Jeśli katalog istniejącej instalacji jest zablokowany na starszej wersji, może być potrzebna jednorazowa ręczna aktualizacja z gotowego ZIP Jellyfin plugin po kompilacji w GitHub Actions; ZIP źródeł to nie gotowa DLL.
- Nie uruchamiano kompilacji .NET 10 w środowisku przygotowania. Ciągłość kompilacji musi potwierdzić CI. Testy JS/Python nie zastępują serwerowego testu na NAS.

## Mapa plików i zależności
- `Services/MisioFlixNativeCatalogRefreshService.cs` (NOWY) — GitHub SHA, weryfikacja pakietu natywnym `IInstallationManager`, trwały zapis w `IServerConfigurationManager`.
- `Controllers/MisioFlixUpdateController.cs` — nowe API tylko dla administratora.
- `Services/ScriptInjection.cs` — rejestracja usługi singleton w DI; NIE zmieniono wstrzykiwanych skryptów do stron użytkownika.
- `Web/configPage.html` — nowe działanie przycisku i potwierdzanie z prawdziwego `GET /Packages`; rozpoznaje stare repozytorium z `?mf_refresh=` i nowe z SHA.
- `tests/current/native_catalog_refresh_092.cjs`, `test_native_catalog_refresh_092.py` — regresje natywnego zapisu, negatywnego przypadku, wyboru wersji i braku nieautoryzowanego zapisu.

## Test ręczny
1. W starym wydaniu katalog pokazuje np. 0.4.90.0, release/manifest 0.4.91.0.
2. Po instalacji DLL 0.4.92 otwórz `Panel administracyjny → MisioFlix → Aktualizacje` jako administrator.
3. Kliknij `Wymuś aktualizację katalogu Jellyfina`.
4. Sprawdź nowy adres repozytorium w `Jellyfin → Wtyczki → Repozytoria`: zamiast `.../main/manifest.json?mf_refresh=` powinno być `.../<SHA>/manifest.json`.
5. `Katalog Jellyfin` musi pokazać nową wersję (minimum zgodną z wydanym releasem). `Zainstaluj aktualizację` aktywuje się tylko gdy wersja > zainstalowanej.
6. Zrób to samo z ponownym otwarciem panelu; pin ma być trwały i nie może zmieniać innych repozytoriów.
7. Sprawdź GitHub Actions Release, czy `manifest.json` i plik ZIP Jellyfin rzeczywiście wskazują tę samą wersję.

Źródła upstream: `https://raw.githubusercontent.com/jellyfin/jellyfin/v12.4/Emby.Server.Implementations/Updates/InstallationManager.cs` i `https://raw.githubusercontent.com/jellyfin/jellyfin/v12.4/Jellyfin.Api/Controllers/PackageController.cs`.
