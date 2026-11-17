# Wdrożenie v0.4.99.0 — stałe okładki BoxSetów

1. Prześlij kompletne źródła v0.4.99 do GitHuba, zachowując ścieżki oraz katalog `.github/`.
2. Poczekaj na zielone GitHub Actions: `tools/sync_version.py`, `tools/run_tests.py`, `dotnet publish`, pakowanie ZIP DLL. Nie instaluj archiwum źródłowego ZIP jako wtyczki Jellyfina.
3. Zainstaluj nowy, **skompilowany pakiet Jellyfin** przez natywny menedżer wtyczek. Zrestartuj Jellyfina, jeśli potrzebne.
4. Wejdź jako administrator do Dashboard -> Wtyczki -> MisioFlix -> Konfiguracja.
5. W sekcji "Stałe okładki kolekcji Jellyfina" kliknij "Wygeneruj i zapisz brakujące okładki kolekcji". Po odczycie liczby brakujących okładek potwierdź. Operacja może wykonać kilkanaście żądań na kolekcję, nie zamykaj strony przed końcem.
6. Sprawdź komunikat ile okładek zapisano, ile pominięto z istniejącymi obrazami, ile nie miało plakatu członka oraz błędy. Odśwież MisioFlix i otwórz bibliotekę, następnie wróć do strony głównej — teraz powinny wyświetlać się natywne okładki Jellyfina (również w zwykłym Jellyfinie).

**Ważne:** zapis jest trwały po stronie Jellyfina. Nie modyfikuje NFO ani filmów, ale dodaje obraz do metadanych BoxSetu. Zrób backup danych metadanych Jellyfina przed pierwszym użyciem. Nie nadpisuje już istniejących okładek.

Kolaż po stronie HTML v0.4.98 pozostaje jako fallback, gdy jeszcze nie było generowania lub gdy brak członków z plakatem. Usługa synchronizacji NFO działa niezależnie i nadal może dodawać oraz usuwać powiązania zgodnie z dotychczasowymi zasadami. W celu zaktualizowania już istniejącego wygenerowanego plakatu po zmianie zawartości kolekcji należy ręcznie usunąć go z Primary w Jellyfinie, a następnie ponowić generowanie (nie ma auto-nadpisywania).

Jeżeli `POST /Items/{id}/Images/Primary` zwraca 403, sprawdź, czy używasz konta administratora. Jeżeli aplikacja zwraca błąd CORS lub obrazów nie da się wczytać w przeglądarce, zanotuj komunikat statusu, przeglądarkę i adres bazowy Jellyfina; nie zmieniaj uprawnień do udziałów multimediów na ślepo.
