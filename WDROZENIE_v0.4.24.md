# Wdrożenie MisioFlix Native v0.4.24.0

1. Rozpakuj archiwum aktualizacji **źródeł**.
2. Wgraj zawarte pliki do repozytorium `kumblip/misioflix`, zachowując strukturę katalogów. Nie usuwaj istniejących innych plików projektu.
3. **Nie zmieniaj** `.github/workflows/build.yml` ani `release.yml`. Numer wersji pochodzi z `meta.json`.
4. Uruchom GitHub Actions → Build. Skrypt pakujący powinien utworzyć `MisioFlix_0.4.24.0_JF12.4.zip`.
5. Zainstaluj skompilowany ZIP w Jellyfin zgodnie z dotychczasowym procesem, zrestartuj Jellyfin i wymuś odświeżenie przeglądarki `Ctrl+Shift+R`.
6. Sprawdź osobno Filmy ENG, Filmy PL, Seriale Animowane PL i Seriale PL, zarówno z przycisków u góry, jak i ze strony głównej. W pasku adresu powinno pojawić się `#/list?parentId=...&serverId=...`.
7. Potwierdź, że AnimePL nadal działa pod `#/mixed?topParentId=...&collectionType=mixed`.

## Gdyby nadal występował spinner
- Wciśnij F12 → Network, odśwież niedziałającą bibliotekę, zanotuj odpowiedź pierwszego nieudanego żądania `Items` (status HTTP, nazwa endpointu, bez nagłówka Authorization i bez tokenu).
- Sprawdź Console pod kątem komunikatów `[MisioFlix]` i błędów React. Możesz podesłać wynik bez danych uwierzytelniających.
- **Nie skanuj ponownie bibliotek, nie usuwaj NFO ani plików.** Jeśli test nowej wersji nie pomoże, można cofnąć się do ostatniej działającej wersji interfejsu.

Wersja naprawia konkretny brak parametru `serverId` w generowanych linkach. Samo przejście testów nie gwarantuje, że serwer odpowie poprawnie na wszystkie żądania.
