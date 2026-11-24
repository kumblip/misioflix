# MisioFlix 0.4.149.0 — kompatybilność wtyczek

Baza: 0.4.147.0, bez zmian związanych z plakatami z 0.4.148.0. Zastępuje wcześniejszą paczkę 0.4.149 zawierającą tylko rollback plakatów.

- W ustawieniach administratora dodano sekcję „Kompatybilność z innymi wtyczkami” z przełącznikami dziewięciu modułów Web.
- Wszystkie moduły są domyślnie aktywne, również po wczytaniu starszej konfiguracji. Wyłączone moduły nie są wstrzykiwane do świeżo otwartego dokumentu. Zachowano istniejące zabezpieczenia przed powtórną inicjalizacją; dodano wspólny znacznik wstrzykiwania.
- Motyw jest wspólną bazą dla Home, szczegółów, doładowywania bibliotek, interfejsów MAL/SIMKL oraz flag. Wyłączenie motywu pomija także te zależne moduły. Ustawienia poszczególnych modułów pozostają zapisane.
- Wyłączenie układu szczegółów przy aktywnym Home zachowuje samą funkcję natywnego Play/Resume, bez inicjalizacji rozszerzonego układu. Moduły powrotu do sezonu i oznaczania poprzedniego odcinka można wyłączyć niezależnie.
- Przełączniki dotyczą klienta Web; nie wyłączają zadań serwerowych synchronizacji MAL/SIMKL, NFO ani istniejącej diagnostyki. Zmiany stosują się po pełnym odświeżeniu klienta Web.
- `home.js` jest identyczny bajt w bajt z 0.4.147.0: brak nowej kolejki plakatów, brak dodatkowych wariantów rozdzielczości. Pełna pula propozycji oraz optymalizacja filtrów z 147 pozostają bez zmian.

Testy lokalne: 608 Python, 77 skryptów Node.js (w tym cztery nowe przypadki wykonawcze). Kompilacja DLL .NET 10 i rzeczywista zgodność z zewnętrznymi wtyczkami wymagają weryfikacji przez CI i na serwerze Jellyfin.
