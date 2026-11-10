# misioflix Native 0.4.0 — pierwszy moduł dla Jellyfin 12.4

**Wersja ŹRÓDŁOWA / etap techniczny.** To NIE jest gotowa do instalacji wtyczka DLL.
Celem tej paczki jest utworzenie w pełni autonomicznego projektu C# dla Jellyfin 12.4,
który po zbudowaniu działa na porcie **8096** i nie podmienia `index.html`.

## Co jest w kodzie

- `Plugin.cs` i `meta.json` — własna wtyczka Jellyfin 12.4/.NET 10.
- `MisioFlixStartupFilter` — własna integracja **response-time**, dopisuje dwie referencje
  do osadzonych zasobów JS/CSS w odpowiedzi HTML; **nie zapisuje plików Jellyfin Web**.
- `MisioFlixController` — serwowanie własnych grafik i JS/CSS z DLL;
  `GET /MisioFlix/api/health`, `GET /MisioFlix/api/catalog`, `GET /MisioFlix/api/item/{id}`.
- `MisioFlixCatalogService` — lista pozycji pobierana od Jellyfin z **uprawnieniami bieżącego konta**,
  a następnie NFO dla anime czytane z katalogu `/media/raid/animelektor` (tylko odczyt).
  Filmy/seriale: tytuły polskie i gatunki z Jellyfin. Anime: `originaltitle`, `plot`,
  `year`, `genre`, `tag Typ:` **wyłącznie z NFO**. Brak pola w NFO = brak wartości.
- `Web/client.js` i `Web/theme.css` — własny katalog, karuzele, wyszukiwarka anime,
  wyszukiwarka pozostałych produkcji, karty i wyjście do **oryginalnego interfejsu Jellyfin**.
- `Web/assets` — trzy przesłane grafiki misioflix.
- `.github/workflows/build.yml` — budowa **poza NAS-em** i automatyczne pakowanie DLL na GitHub Actions.

## Czego ten etap jeszcze NIE zapewnia

- Nie zastępuje jeszcze automatycznie wszystkich ekranów i kart natywnych bibliotek Jellyfin.
  Z uwagi na bezpieczeństwo odtwarzacza uruchamia katalog osobnym przyciskiem w Jellyfin Web.
- Nie zapewnia jeszcze odtwarzania jednym kliknięciem we wszystkich klientach.
  Aktualnie otwiera pozycję w oryginalnym widoku szczegółów Jellyfin (należy przetestować trasę).
- Nie udowodniono jeszcze zgodności w Jellyfin Android/iOS/Desktop.
- Endpoint szczegółów nie pobiera jeszcze listy odcinków — otwórz pozycję w oryginalnym Jellyfin.
- Własny middleware nie jest oficjalnym stabilnym API rozszerzania Jellyfin Web,
  więc po większych aktualizacjach mogą być konieczne poprawki.
- **Nie skompilowano DLL w tym środowisku** — nie ma tu .NET 10 ani dostępu do NuGet.
  Wymagane uruchomienie `dotnet publish` w GitHub Actions lub na innym komputerze.

## Jak zbudować bez kompilacji na NAS

Instrukcja: `BUDOWANIE.md`. Po pomyślnym CI powstanie paczka:
`MisioFlix_0.4.0_JF12.4.zip`, zawierająca DLL i `meta.json`.

## Dlaczego nie proxy?

Po zbudowaniu i instalacji wtyczka działa w tym samym serwerze Jellyfin na `:8096`.
Nie powstają dodatkowe porty 8097 ani 8098 i nie używamy Home Screen Sections,
JavaScript Injectora, Media Bar, Netflin ani ich API.

## Bezpieczeństwo

- Brak zapisów NFO, brak operacji zmiany folderów multimedialnych.
- Endpoint katalogu wymaga sesji użytkownika Jellyfin (`[Authorize]`).
- Serwer pobiera listę pozycji przez własne, autoryzowane `/Users/Me` i `/Items?UserId=...`.
  Dopiero dla identyfikatorów z tej listy zagląda do katalogu NFO. Nie ma endpointu
  przyjmującego dowolną ścieżkę pliku od użytkownika.
- Żądania backendu mogą łączyć się tylko z lokalnym Jellyfin pod HTTP loopback.
- Zasoby WWW są osadzone w DLL, nie są pobierane z obcego CDN.
- Przed dostępem z internetu trzeba przetestować kontrolę uprawnień na realnym serwerze.

## Źródła techniczne

- Oficjalny szablon: https://github.com/jellyfin/jellyfin-plugin-template
- Wtyczki: https://jellyfin.org/docs/general/server/plugins/
- Zmiany Jellyfin 12: https://jellyfin.org/posts/jellyfin-release-12.0/

Kod C# przeznaczony do połączenia z GPLv3 Jellyfin, przy dystrybucji należy zachować
warunki odpowiedniej licencji GPL. Trzy grafiki w `Web/assets` zostały dostarczone
przez użytkownika i są częścią jego identyfikacji wizualnej.

---

### Repozytorium projektu

Kod przeznaczony jest dla https://github.com/kumblip/misioflix. Instrukcja pierwszego przesłania i budowy: [GITHUB_START.md](GITHUB_START.md).
