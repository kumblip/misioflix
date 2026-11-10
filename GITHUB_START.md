# Start dla repozytorium https://github.com/kumblip/misioflix

## Co przesłać

Prześlij **zawartość** tego katalogu do głównego katalogu repozytorium (nie dodatkowy katalog `MisioFlix_Native_v0.4.0`).
Nie pomijaj `.github/workflows/build.yml` — to on uruchamia kompilację.
Nie przesyłaj plików `.env`, haseł, tokenów Jellyfin, NFO z prywatnej biblioteki ani filmów.

## Wgrywanie przez przeglądarkę

1. Otwórz https://github.com/kumblip/misioflix
2. Kliknij **Add file → Upload files** (w pustym repo: **uploading an existing file**).
3. Rozpakuj ZIP na swoim komputerze. Przenieś do okna GitHub wszystkie elementy **z wnętrza** katalogu, w tym `.github`.
4. Wpisz wiadomość commita np. `Initial source: MisioFlix Native 0.4.0`.
5. Kliknij **Commit changes**.

## Pierwsza kompilacja

1. Wejdź w zakładkę **Actions**.
2. Jeśli GitHub poprosi o włączenie workflow, zatwierdź.
3. Wybierz `MisioFlix — build dla Jellyfin 12.4` → **Run workflow** (albo otwórz wynik uruchomienia po commicie na branch `main`).
4. Gdy build skończy się zielono, pobierz **Artifacts → MisioFlix_0.4.0_JF12.4**.
5. Jeżeli build będzie czerwony, przekaż pełny log błędu; nie instaluj wtedy źródeł na NAS.

**Status:** paczka zawiera źródła; binarka DLL nie została jeszcze skompilowana ani zweryfikowana na Twoim NAS.

**Dalszy etap:** dopiero po udanej kompilacji i testach tworzymy workflow publikacji GitHub Releases oraz zgodny manifest repozytorium wtyczek Jellyfin. Sam artifact Actions nie jest automatycznie aktualizowaną wtyczką Jellyfin.
