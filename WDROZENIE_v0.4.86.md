# Wdrożenie v0.4.86.0

1. Wgraj pełną paczkę do repozytorium `kumblip/misioflix` (albo nałóż paczkę zmian na źródła v0.4.85).
2. Uruchom **Actions → MisioFlix — build dla Jellyfin 12.4**. Najważniejszy etap: `dotnet publish` ma przejść bez błędów.
3. Dopiero po zielonym buildzie uruchom dotychczasową publikację Release dla wersji v0.4.86.0. Nie publikuj archiwum źródeł jako instalacyjnej wtyczki Jellyfin.
4. Zainstaluj wygenerowaną paczkę DLL przez Jellyfin, wykonaj wymagany restart i `Ctrl+F5`.
5. Test: podczas odtwarzania S01E21 kliknij „Następny” albo otwórz bezpośrednio S01E22 z tego samego urządzenia, bez długiej przerwy. Po uruchomieniu E22 poprzedni E21 powinien otrzymać **obejrzany + czas wznowienia 00:00 w Jellyfinie** (również po jednej sekundzie). Zwykły Stop, przewinięcie i przeskok do innej serii nie powinny oznaczać obejrzenia.

Wersja v0.4.85.0 nie skompilowała się. Ta paczka naprawia znane błędy kompilacji, ale nie zawiera skompilowanego DLL.
