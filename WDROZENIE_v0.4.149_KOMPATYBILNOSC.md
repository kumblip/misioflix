# Wdrożenie 0.4.149.0 — kompatybilność wtyczek

1. Paczkę można nałożyć na repozytorium 147, 148 lub nieopublikowane 149. Zawiera oryginalny home.js z wersji 147 oraz test regresji zastępujący wycofany test kolejki plakatów 148 w tej samej ścieżce. Nie trzeba usuwać plików ręcznie. Dokumenty historyczne 148 mogą pozostać.
2. Rozpakuj pliki do katalogu głównego repozytorium, nadpisując pliki o tych samych ścieżkach. Nie używaj poprzedniej paczki 149 (sam rollback). Jeśli tag/release 149 został już opublikowany, nie nadpisuj wydania; potrzebny jest nowy numer.
3. Commit, build, release z hasłem PUBLIKUJ, aktualizacja wtyczki i restart Jellyfina; następnie Ctrl+F5.
4. Ustawienia MisioFlixa → Kompatybilność z innymi wtyczkami. Domyślnie wszystko włączone. Przy konflikcie wyłącz wybrany moduł, zapisz i odśwież całe okno klienta Web. Ponownie włącz moduł, zapisz i odśwież, aby go przywrócić.
5. Motyw jest nadrzędny dla modułów wizualnych. Wyłączenie Home może wymagać włączenia natywnych sekcji Home w preferencjach Jellyfina, jeśli uprzednio ustawiono je na Brak. Wyłączenie interfejsu MAL/SIMKL nie zatrzymuje synchronizacji serwerowej. Nie trzeba zmieniać ustawień innych wtyczek ani czyścić cache obrazów.
