# v0.4.91.0 — łapki i rozmiar kolekcji we wspólnej ramce

Zmiana ma wyłącznie charakter prezentacyjny:
- Kafelki filmów i seriali należących do Jellyfin BoxSet pokazują `N 📦` wewnątrz już istniejącego kontenera łapek (bez dodatkowej ramki w ramce).
- **Najpierw łapki** (sezony/odcinki i ocena użytkownika Simkl), pod nimi `N 📦`.
- Działa na stronie głównej, w natywnych bibliotekach i na doładowanych kafelkach bibliotek; nie zmienia samych kolekcji ani liczby ich elementów.
- Zmieniono wyłącznie `theme.css` i porządek elementów w `simkl.js` (plus wersja, testy i dokumentacja). Istniejący `home.js` oraz `client.js` już poprawnie umieszczały licznik w kontenerze, ale CSS rysował na nim dodatkową ramkę.
- Kafelki samych kolekcji z licznikiem `N 🎬` pozostają bez zmian.
- Nie modyfikowano `Jellyfin_Wlasny_CSS.txt` ani `zrobionepozamisioflixem.txt`, wyszukiwarek, MAL, Simkl API, katalogu NFO, infinite scroll ani player back.

Weryfikacja: `python3 tools/run_tests.py`, `node --check src/Jellyfin.Plugin.MisioFlix/Web/simkl.js`. Kompilację `.NET 10` musi potwierdzić CI. Testy nie stanowią testu działającego NAS-a.
