# Archiwum MAL — instrukcja v0.4.60

1. Wgraj zawartość paczki `TYLKO_ZMIANY` do repozytorium GitHub z zachowaniem ścieżek (w tym nowego pliku `Web/mal-archive.css` i dwóch plików C#).
2. Zatwierdź aktualizację w GitHubie, uruchom build/publish, zainstaluj powstałą wtyczkę i ponownie uruchom Jellyfin.
3. Wejdź w MisioFlix i na stronie głównej kliknij przycisk swojego konta `MAL: ...`.
4. Sekcja „Lokalne kopie MyAnimeList” pokaże czas ostatniej udanej pełnej kopii i liczbę zapisanych wpisów. Pierwsze pobranie może wymagać kilku stron z MAL; aktualizacja następuje bez blokowania przeglądarki.
5. Wybierz „Bieżąca kopia MAL”, kopię dzienną lub miesięczną i kliknij **„Pobierz wybraną kopię”**. Plik JSON zostanie zapisany przez przeglądarkę na Twoim urządzeniu. Nie ma importu.
6. Gdy MAL był offline lub NAS był wyłączony przez >72 h, pierwszy dostępny cykl automatycznie ponowi pełne pobranie; aktualna kopia nie zostanie zastąpiona niepełnym wynikiem.
7. Po ręcznym `Edytuj MAL → Zapisz w MAL` dotychczasowa edycja zapisuje do MAL. Następnie w tle powstanie nowa pełna kopia.

Folder danych NAS zarządzany przez Jellyfin: `<DataPath>/misioflix/mal/archive/<użytkownik Jellyfin>/<MAL ID>/`.
Pliki: `current.json`, `state.json`, `daily/yyyy-MM-dd.json`, `monthly/yyyy-MM.json`.
Dane kont MAL i Simkl są rozdzielone; katalog danych MAL nie jest katalogiem Simkl.

Ważne: nie kopiuj plików JSON do katalogu wtyczek w celu „przywrócenia” danych. Są przeznaczone do archiwizacji/pobrania na komputer, nie do importowania lub nadpisywania MAL.
