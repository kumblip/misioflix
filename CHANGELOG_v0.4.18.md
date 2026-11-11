# MisioFlix Native v0.4.18.0 — układ, Oglądaj dalej i losowanie

## Potwierdzone przez użytkownika w v0.4.17

- "Oglądaj dalej" pobiera dane.
- Oznaczenia statusu obejrzenia na kartach są widoczne.
- Odtwarzacz Jellyfin wyświetla obraz i odtwarza dźwięk. **Nie ruszamy rozwiązania izolacji CSS odtwarzacza.**

## Zmiany v0.4.18

1. **Zamiana miejsc:** pięć przycisków bibliotek i dwie wyszukiwarki zajmują prawą część górnego banera, obok logo; sekcja "Oglądaj dalej" znajduje się pod banerem, na całej szerokości, w postaci poziomej karuzeli.
2. **Pełna karuzela użytkownika:** wyświetla wszystkie pozycje zwrócone przez stronicowane API Jellyfin. Ma strzałki lewo/prawo, przewijanie, przeciąganie myszą i gesty dotykowe.
3. **Ukrywanie, nie usuwanie:** × korzysta z dotychczasowego POST `/MisioFlix/api/resume/hide`, zapisując widoczność per użytkownik w osobnym JSON. Nie modyfikuje stanu odtworzenia w Jellyfin, odcinków ani plików NFO.
4. **Pokaż ukryte / Ukryj ukryte:** przełącznik w nagłówku karuzeli wyświetla ukryte pozycje w tej samej karuzeli, ze stonowanym obramowaniem i przyciskiem "Przywróć". Pokazuje licznik; bez ukrytych pozycji jest nieaktywny.
5. **Losuj zawsze dostępne:** "Losuj" i "Ostatnio dodane" pozostają widoczne w każdej bibliotece również po losowaniu. Ponowne "Losuj" uruchamia nowe zapytanie `SortBy=Random` w obrębie danej biblioteki.
6. **Pięć propozycji:** losowanie pokazuje maksymalnie pięć pełnych kart, nie dwanaście. Tryb "Ostatnio dodane" zachowuje dotychczasowe stronicowanie po dwanaście.

## Bez zmian

Natywne Jellyfin 12.4, odtwarzanie, skórka/statusy, MAL, dwie wyszukiwarki, 52 gatunki anime, grupowanie sezonów/Speciali i autoryzacja użytkownika.

## Testy

- 44/44 testy źródłowe Python.
- Poprawna składnia JS i CSS (Node + PostCSS).
- Lokalny test na rzeczywistym Chromium/Playwright: 7 przycisków w banerze, pełna karuzela 15 pozycji, ukrywanie/odkrywanie/przywracanie, pięć wyników dwóch kolejnych losowań i powrót do 12 najnowszych.
- Brak kompilacji DLL i testu odtwarzania na NAS w tej sesji; należy zweryfikować poprzez GitHub Actions oraz Jellyfin.
