# Instalacja — MisioFlix Native 0.4.12.0

**To poprawka do istniejącego repozytorium `kumblip/misioflix` — nie kompletny zamiennik wszystkich jego plików.** Nie usuwaj źródeł `Plugin.cs`, usług MAL, grafik ani narzędzi publikacyjnych, których nie ma w archiwum.

## 1. Ustawienia strony głównej Jellyfin

Użytkownik, który ma zobaczyć nowe karuzele, wybiera: awatar → Ustawienia → Strona główna.

- **Sekcje ekranu startowego 1–10:** `Brak`.
- **Biblioteki → „Wyświetlaj w sekcjach ekranu startowego…”:** odznaczone (AnimePL, Filmy ENG, Filmy PL, Seriale Animowane PL i Seriale PL).
- **Foldery biblioteki:** odznaczone.
- Kliknij **Zapisz**. Tę konfigurację należy wykonać osobno na każdym profilu Jellyfin, który ma korzystać z układu MisioFlix.

Wyłączenie natywnego „Ostatnio dodane” zapobiega pobraniu najpierw poziomych grafik. Nowe karuzele pobierają z API Jellyfin tylko serię lub film, nie sezon/odcinek. Jeśli użytkownik nie wyłączy starych sekcji, może zobaczyć oba zestawy.

## 2. Wgranie źródeł do GitHub

1. Rozpakuj archiwum ZIP na komputerze.
2. Wgraj pliki do `https://github.com/kumblip/misioflix`, zachowując ścieżki `.github/workflows/...` oraz `src/Jellyfin.Plugin.MisioFlix/...`.
3. Nadpisz tylko pliki z paczki, nie usuwaj pozostałych.
4. W GitHub Actions sprawdź budowę i wszystkie testy; DLL **nie została** skompilowana lokalnie.
5. Po zielonym buildzie uruchom dotychczasowy workflow Release z zatwierdzeniem `PUBLIKUJ`.
6. Po pojawieniu się `0.4.12.0` w katalogu Jellyfin zainstaluj aktualizację i zrestartuj kontener Jellyfin. Następnie wykonaj `Ctrl+Shift+R`.

## 3. Testy na NAS

- Otwórz `http://kumadlaneko:8096/web/#/home`. Upewnij się, że jest **jeden** pasek nawigacji i zamiast natywnych Latest widać własne półki MisioFlix.
- Zobacz, czy do `AnimePL` ładowane są **całe Series**, bez `Season` i `Episode`. Jeśli Arifureta nadal jest rozbita na wiele `Series`, to problem struktury biblioteki Jellyfin, a nie karty.
- Kliknij `Losuj ↻` w AnimePL i Filmy ENG; wynik ma pochodzić wyłącznie z wybranej biblioteki.
- Kliknij plakat: musi otworzyć `#/details?id=...&serverId=...` i natywne szczegóły Jellyfin.
- Kliknij logo w menu, przejdź do bibliotek i wróć — bez dodatkowej strony, bez duplikowania półek.
- Rozpocznij i przerwij odcinek. Sprawdź „Oglądaj dalej”; użyj `×`, potem `Ukryte` → `Przywróć`. Historia Jellyfin nie może się zmienić.
- Włącz drugi profil Jellyfin i sprawdź, że nie dziedziczy listy ukrytych pozycji pierwszego.
- Sprawdź konsolę przeglądarki i zadania Jellyfin pod kątem błędów 401/403/500 przy `/MisioFlix/api/home/...`.

## 4. Ograniczenia i powrót

Projekt nadal działa jako **jedna natywna wtyczka Jellyfin C#** dostarczająca motyw CSS/JS i nowe endpointy. Nic nie jest uruchamiane na osobnym porcie. Nie zmieniamy `index.html` na dysku i nie instalujemy Netflin, Media Bar ani JavaScript Injectora jako zależności.

Jeśli nowa wersja na Twojej instalacji powoduje błąd, wyłącz wtyczkę MisioFlix w panelu Jellyfin, zrestartuj Jellyfin i w ustawieniach strony głównej możesz przywrócić standardowe sekcje. Zmiana preferencji nie kasuje biblioteki ani NFO.

## Testy przed wydaniem

Lokalny Chromium sprawdza zachowanie JS z **symulowanym API**. Nie dowodzi zgodności C# z Jellyfin 12.4.0 — tę potwierdzi dopiero zielony GitHub Actions i test na NAS. Przeciążone biblioteki mogą wydłużyć odpowiedź Resume/NextUp.
