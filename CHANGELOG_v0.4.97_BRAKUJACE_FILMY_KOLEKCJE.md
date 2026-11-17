# MisioFlix v0.4.97 — brakujące filmy w kolekcjach NFO, weryfikacja i diagnostyka

## Problem zgłoszony przez użytkownika
- „Flintstonowie”: kolekcja pokazuje 1 serial, brakuje filmów.
- „Café Myszka”: kolekcja pokazuje 1 serial, brakuje filmu.
- „Scooby-Doo”: kolekcja pokazuje 6 seriali, brakuje filmów.
- Użytkownik potwierdza, że pliki NFO danych filmów zawierają tagi `<set>`.

## Zmiany na bazie v0.4.96
1. Dwie niezależne kwerendy Jellyfin `BaseItemKind.Movie` i `BaseItemKind.Series` zamiast jednej z dwoma typami. Zapobiega pomijaniu kategorii przy problematycznej kombinacji filtrów i pozwala odróżnić brak filmów w bazie od błędu NFO.
2. Wyszukiwanie `movie.nfo`, `tvshow.nfo` oraz NFO dopasowanego do nazwy pliku filmu bez rozróżniania wielkości liter na dyskach Linux (`Movie.NFO`, `TVSHOW.nfo`, itp.). Nie wybiera przypadkowego NFO z folderu: tylko dokładna nazwa lub jednoznaczna różnica wielkości liter.
3. Brak NFO poprzednio zarejestrowanego w stanie synchronizatora lub przypisanego do zarządzanego członkostwa blokuje usuwanie w danym przebiegu. **Samo nieodnalezienie pliku nie oznacza skasowania `<set>`.** Usunięty `<set>` z prawidłowo sparsowanego istniejącego NFO nadal uruchamia dotychczasowe uzgadnianie i może usunąć powiązanie.
4. Po dodaniu elementów sprawdzane jest rzeczywiste członkostwo w `BoxSet.LinkedChildren`. Jeśli żądane pozycje nie znalazły się w kolekcji, synchronizator blokuje operacje usuwania i zgłasza ostrzeżenie.
5. Administrator może zobaczyć raport po zakończonym skanowaniu: ile filmów i seriali zeskanowano, ile filmów miało NFO i `<set>`, ile faktycznie widać w BoxSetach, jakich filmów brakuje, oraz przykłady pominiętych NFO.
6. Admin-only `GET MisioFlix/api/nfo-collections/report` zwraca ostatni raport, bez dostępu użytkowników niebędących administratorami. Panel ma przycisk „Pokaż raport filmów i seriali”; ręczna synchronizacja wyświetla go automatycznie.

## Bez zmian
- Brak zapisu do źródłowych NFO i plików multimedialnych.
- Dotychczasowe powiązania `set`/`sorttitle`, sortowanie wewnątrz BoxSetów, zapis ledger, cykl co 30 minut.
- Usuwanie wyłącznie powiązań wcześniej zapisanych w ledger; puste BoxSety tylko utworzone przez wtyczkę i tylko po kompletnym poprawnym skanie.
- Nie dotykano MAL, Simkl, stronicowania, odtwarzacza i warstwy szczegółów kolekcji.

## Ograniczenia / zadania odbiorcze
- Sam kod nie dowodzi, że wskazane filmy są widoczne w bazie Jellyfina jako `Movie` ani że ich NFO są dostępne pod ścieżką wewnątrz kontenera.
- Konieczne jest sprawdzenie wyniku `dotnet publish` na GitHub Actions (brak SDK .NET 10 w lokalnym środowisku), uruchomienie na NAS-ie i kliknięcie synchronizacji ręcznej.
- Jeśli raport pokaże filmów=0, problem dotyczy enumeracji bazy Jellyfina; jeśli filmów jest dużo, ale `moviesWithNfo`/`moviesWithSet` mało, trzeba zweryfikować ścieżki i pliki NFO. Jeśli oczekiwane filmy są odczytywane, ale `MissingMovieCount>0`, trzeba zbadać zapis powiązań w bazie Jellyfina.
