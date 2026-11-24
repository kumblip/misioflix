# MisioFlix 0.4.151.0 — cztery statusy propozycji, CI FIX

Paczka zastępuje wcześniejszy ZIP 151. Do nałożenia na 150 lub nieudaną 151.
- Cztery stany, pełne etykiety w jednym przycisku: 📹 Wszystkie, Stan: Nierozpoczęte, Stan: Rozpoczęte, Stan: Zakończone.
- Osobna klasyfikacja dla propozycji; zachowany dotychczasowy kontrakt `watched` dla wyszukiwarki, kafelków i integracji. Filtr nadal korzysta z danych Jellyfin, nie ze stanów MAL/SIMKL.
- Aktualizacja testu Node do rzeczywistej kolejności czterech stanów i załadowania funkcji normalizacji; testowane także brakujące dane, pozostałe filtry i spóźnione odpowiedzi.
- Przywrócona spójność istniejącego znacznika diagnostycznego Home, bez rozbudowy diagnostyki.
- Bez zmian w ładowaniu plakatów, limitach katalogu i kompatybilności wtyczek.
- Lokalnie: 612 testów Python, 79 skryptów Node (w tym dodatkowy test diagnostyczny 143 z archiwum źródeł). Testy klasyfikacji C# są kontrolami kodu źródłowego; kompilacja .NET 10 i rzeczywiste dane NAS niezweryfikowane.

Nadpisz pliki w repozytorium i uruchom build. Po pomyślnej kompilacji standardowa procedura release, restart Jellyfin, Ctrl+F5.
