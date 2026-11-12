# Wdrożenie MisioFlix v0.4.40.0 — Jellyfin 12.4

1. W repozytorium GitHub **nie usuwaj** istniejących plików. Rozpakuj `MisioFlix_Native_v0.4.40_Kompaktowy_MAL_Mobile_GitHub.zip` i nadpisz pliki zgodnie ze ścieżkami, licząc od katalogu głównego repozytorium.
2. Pozostaw niezmienione `.github/workflows/build.yml` i `release.yml`. Commit do `main` uruchamia Build; jeżeli w danym repozytorium wymagany jest ręczny Release, opublikuj wynik dotychczasowym procesem.
3. Zainstaluj **wygenerowaną przez GitHub Actions** wersję `0.4.40.0` na Jellyfin 12.4, zrestartuj Jellyfin, odśwież przeglądarkę `Ctrl+Shift+R` (na Androidzie odśwież stronę / wyczyść cache witryny w razie potrzeby).
4. Otwórz `Zero no Tsukaima` i jego sezon: pod „Oglądaj / Kontynuuj” powinien być MAL. Na telefonie: tylko przycisk „MAL”, po kliknięciu statystyki, a po kliknięciu „Edytuj MAL” formularz.
5. Zmień w edytorze testowo tylko ocenę, kliknij `Zapisz w MAL`. Potwierdzenie musi pojawić się **dopiero po pomyślnym POST**. Sprawdź na MAL, czy wynik został zapisany; pozostałe liczniki powinny pozostać bez zmian.
6. Sprawdź ramkę plakatu ze statusem MAL i karty AnimePL na telefonie: bez napisu `ANIME`, z pełnym rokiem, łapkami, gatunkami, opisem oraz kolorową ramką MAL.
7. W karuzeli i wyszukiwarce ocena MAL jest pokazywana jako cyfra + różowa łapka, bez `/10`.

## Co znajduje się w ZIP
- `meta.json` i `src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj` — wersja.
- `src/Jellyfin.Plugin.MisioFlix/Web/mal.js` — panel i oceny MAL.
- `src/Jellyfin.Plugin.MisioFlix/Web/client.js` — pełny rok na telefonie i format oceny w natywnych kartach.
- `src/Jellyfin.Plugin.MisioFlix/Web/theme.css` — wygląd kompaktowy, mobilny, kolory.
- `tests/current/` — testy regresyjne i uaktualnione oczekiwania.

## Ważne
- To **źródła do Build**, a nie gotowa DLL do instalacji bez kompilacji.
- NIE zmieniaj Client Secret, OAuth, NFO ani ustawienia grupowania filmów.
- Backend endpointu diagnostyki pozostaje zabezpieczony, lecz panel „Diagnostyka MAL” został usunięty z UI.
- Nie udostępniaj tokenów MAL, nagłówków Authorization ani pełnych adresów callback z kodem OAuth.
