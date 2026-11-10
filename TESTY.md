# Testy i ograniczenia — MisioFlix Native 0.4.0

## Sprawdzone w aktualnym środowisku

- [x] Składnia JS: `node --check`.
- [x] Struktura manifestu i zgodność numeracji w źródłach.
- [x] Obecność wszystkich grafik, CSS i JS.
- [x] Przykładowe `tvshow.nfo` — tytuł rōmaji, cztery gatunki i tag typu.
- [x] W JS istnieją dwa odrębne widoki wyszukiwania; nie ma zewnętrznych CDN.

## Niewykonane / wymagające weryfikacji

- [ ] Kompilacja C# dla `net10.0`, `Jellyfin.Controller/Model/Common 12.4.0`.
  Ten komputer nie ma `dotnet` i nie ma połączenia z NuGet. GitHub Actions wykonuje
  kompilację i zatrzymuje pakowanie, jeżeli kod nie przejdzie kompilatora.
- [ ] Załadowanie wtyczki do działającego Jellyfin 12.4.0.
- [ ] Middleware przechwyci właściwy `index.html`, nie kolidując z CSP, cache i innymi wtyczkami.
- [ ] Ładowanie klienta Jellyfin Web i jego tokenu po zalogowaniu.
- [ ] Prawidłowe filtrowanie dostępu na zwykłym koncie użytkownika.
- [ ] Logika NFO na prawdziwej bibliotece anime; NFO używa wyłącznie danych XML.
- [ ] Odtwarzanie i powrót przez natywny Jellyfin Web w przeglądarce.
- [ ] Android / iOS / Desktop z własnymi klientami WWW.
- [ ] Wszystkie standardowe widoki kart zastąpione wyglądem misioflix.

## Pierwszy test na UGREEN

Po skompilowaniu i instalacji:
1. `/MisioFlix/api/health` odpowiada `version: 0.4.0`.
2. Konsola serwera nie pokazuje błędu ładowania pluginu.
3. Zalogowany Jellyfin Web ma przycisk misioflix.
4. Po kliknięciu widoczne są dwie niezależne wyszukiwarki.
5. Po dodaniu bibliotek NFO anime jest prezentowane inaczej niż źródła gatunków filmów.
6. Oryginalny ekran odtwarzania działa normalnie po wyjściu z misioflix.

Jeśli etap 2–6 nie przechodzi, nie przechodź do natywnych aplikacji. Sprawdź logi
Jellyfin i zrezygnuj z wtyczki zgodnie z `INSTALACJA_UGREEN.md`.
