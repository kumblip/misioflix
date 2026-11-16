# Wdrożenie v0.4.92.0 (Jellyfin 12.4 / .NET 10)

1. Wgraj `MisioFlix_Native_v0.4.92_GitHub_PELNE.zip` jako pełne repo (albo `...TYLKO_ZMIANY.zip` na dokładną wersję 0.4.91) do GitHub kumblip/misioflix. Źródła po rozpakowaniu powinny znajdować się w katalogu głównym repo (`meta.json`, `src/`, `.github/`).
2. Uruchom GitHub Actions, potwierdź `dotnet publish` i Release, w tym `MisioFlix_0.4.92.0_JF12.4.zip` oraz aktualizację `manifest.json`. Nie instaluj ZIP źródeł jako plugin DLL.
3. Zainstaluj nową DLL pluginu z katalogu Jellyfin. Jeśli nadal nie widzisz aktualizacji (właśnie tę usterkę naprawia wydanie), wykonaj JEDNORAZOWĄ ręczną aktualizację pluginu z gotowego ZIP Jellyfin wygenerowanego przez CI (instrukcje w `INSTALACJA_UGREEN.md`), lub zaczekaj na aktualizację katalogu przed ponowną próbą. Nie nadpisuj działającej DLL przy uruchomionym Jellyfinie.
4. Uruchom ponownie Jellyfin, sprawdź `0.4.92.0` na stronie pluginu.
5. Panel administracyjny → MisioFlix → Aktualizacje → `Wymuś aktualizację katalogu Jellyfina`.
6. W `Jellyfin → Wtyczki → Repozytoria` sprawdź, że URL dla MisioFlix zmienił się na wersjonowany adres commit SHA, inne repozytoria bez zmian. W samym panelu `Katalog Jellyfin` powinien pokazywać bieżącą wersję ze zweryfikowanego manifestu.

Uwaga: po ręcznym wymuszeniu URL repozytorium jest przypięty do konkretnego commita. Aby zobaczyć KOLEJNE przyszłe wydania, ponownie naciśnij `Wymuś aktualizację katalogu Jellyfina`. To świadomy kompromis pozwalający ominąć cache. Nie jest to automatyczna instalacja.

Testy lokalne: Python/Node przechodzą; SDK .NET 10 nie jest dostępne, CI musi potwierdzić kompilację.
