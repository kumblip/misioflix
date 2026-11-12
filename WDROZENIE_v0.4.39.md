# MisioFlix 0.4.39.0 — wdrożenie

1. Wgraj **wyłącznie pliki zawarte w archiwum źródłowym ZIP** do katalogu głównego już istniejącego repozytorium GitHub, nadpisując podane ścieżki. Nie usuwaj pozostałych źródeł ani plików `.github/workflows/build.yml` i `.github/workflows/release.yml`.
2. Uruchom GitHub Actions **Build**. To kompiluje .NET 10 DLL. Potwierdź powodzenie kompilacji; przejście testów źródłowych nie jest równoznaczne z udanym Build.
3. Jeśli używasz katalogu wtyczek Jellyfin, wykonaj również standardową procedurę **Release** istniejącego projektu (publikuje ZIP DLL i uaktualnia repozytorium manifest). Sam commit `manifest.json` nie dowodzi, że Jellyfin już pobrał nowy katalog.
4. Zainstaluj aktualizację, uruchom ponownie Jellyfin i wykonaj `Ctrl+Shift+R` w przeglądarce.
5. Otwórz **Zero no Tsukaima (MAL ID 1195)**. W panelu MAL oczekujemy po aktualnym raporcie: ocena 10/10, status Obejrzane, **13** odcinków i **6** ponownych obejrzeń. Jeśli od czasu raportu zmieniłeś MAL, obowiązują wartości aktualnie zwrócone przez MAL. Jeśli panel pokazuje stare wartości, użyj „Odśwież z MAL”.
6. Wejdź w AnimePL. Porównaj wygląd kart z v0.4.29: nakładki `ANIME`/rok/typ, łapki sezonów/odcinków, gatunki/pełny opis i ramki MAL. Przewiń kilka ekranów w dół oraz z powrotem — sprawdź, czy Jellyfin nie zgłasza błędu scroller/WebComponent i czy każdy plakat otwiera właściwe anime.
7. Jeżeli pojawi się ponownie `addScrollEventListener is not a function`, prześlij pełny komunikat i adres widoku. Test Chromium bada odtworzony DOM, nie rzeczywisty wirtualizowany komponent Jellyfin 12.4. Nie zmieniaj danych biblioteki, NFO ani ustawień MAL w celu obejścia błędu.

**Bezpieczeństwo:** brak tokenów i tajnych danych w ZIP; NFO, odtwarzacz i konfiguracja MAL pozostają bez zmian. Diagnostyka v0.4.38 nadal dostępna na żądanie.
