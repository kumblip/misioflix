# MisioFlix 0.4.146.0 — HOTFIX filtrowania języka anime

Baza 0.4.145.0. Kandydat do testu na NAS, nie STABLE.

- Wyszukiwarka anime klasyfikuje wynik podczas pobierania katalogu konkretnej, dostępnej dla użytkownika biblioteki, niezależnie od niejednoznacznego `anime_source` elementu. Endpoint `/home/libraries` zwraca przypisaną w konfiguracji rolę animeRole według identyfikatora biblioteki Jellyfin.
- Anime PL → Polski (lektor); Anime ENG → Bez lektora (ENG); Anime PL+ENG → oba tryby. Wszystkie → wszystkie dostępne biblioteki anime. Jawna rola administratora ma pierwszeństwo przed nazwą i flagami. Bez jawnej roli rozpoznawane są wyłącznie standardowe nazwy Anime PL/ENG/PL+ENG (także bez spacji).
- Dla pozostałych bibliotek używamy istniejącego indeksu flag `pl_audio` (nie napisów), a przy braku danych zachowujemy jednostronną klasyfikację z katalogu; niejednoznaczne `both` bez potwierdzenia roli nie jest dowodem na podwójną bibliotekę. Nieznane pozycje widoczne w trybie Wszystkie. Brak dodatkowych żądań i brak ponownego skanowania mediów.
- Dotyczy serii, sezonów i filmów. Zachowane niezależne filtry bibliotek, typów, gatunków i obejrzanych, domyślny PL oraz dotychczasowy wygląd. Cache v8 unieważnia stare migawki. Brak zmian w globalnym katalogu propozycji, flagach, diagnostyce, MAL/SIMKL oraz odtwarzaniu. Pełna paginacja 144 pozostaje bez zmian.
- Regresja JS symuluje raportowany przypadek: wszystkie rekordy mają `anime_source=both`, również biblioteki PL i ENG. Sprawdza obie konfiguracje sezonów, wszystkie tryby, role mimo zmienionych nazw, nazwy starszej konfiguracji, flagi i brak danych oraz brak kolejnych żądań po przełączeniu.

Kompilacja DLL i potwierdzenie na NAS-ie: do wykonania. Nie publikowano na GitHubie. Nie rozstrzygnięto faktycznej konfiguracji ról użytkownika.
