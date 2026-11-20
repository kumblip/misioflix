# MisioFlix v0.4.112.0 → v0.4.113.0

1. Jeśli repozytorium zawiera **dokładnie v0.4.112.0**, rozpakuj paczkę `MisioFlix_Native_v0.4.113_TYLKO_ZMIANY_OD_112.zip` do katalogu głównego repozytorium. Zachowaj foldery, nadpisując poprzednie pliki.
2. Dla innej lub nieznanej bazy użyj pełnego archiwum `MisioFlix_Native_v0.4.113_GitHub_PELNE.zip` (z zachowaniem własnych zmian, jeśli były).
3. Uruchom istniejące GitHub Actions `build`, następnie po sukcesie `release` z tagiem **`v0.4.113.0`**. Nie dodawaj workflow ani zależności Pythona.
4. Po instalacji wtyczki uruchom ponownie Jellyfin i wykonaj `Ctrl+F5` w przeglądarce.
5. Sprawdź: alfabetyczną kolejność przycisków bibliotek, przyciski wyszukiwarki i MAL/Simkl na końcu, wspólny niski baner z logo; na Android/iOS trzy kompaktowe kafelki w karuzelach, brak opisu i sprawny podgląd „i”.

Testy źródłowe: **494 Python + 58 Node.js (PASS)**. Kompilacja .NET i test na działającym NAS-ie: do potwierdzenia.
