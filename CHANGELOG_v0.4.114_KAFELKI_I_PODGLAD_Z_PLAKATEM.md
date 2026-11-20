# MisioFlix Native v0.4.114.0 — kafelki i okno podglądu

Podstawa: pełna **v0.4.113.0**. Zmiany w prezentacji, bez zmian w logice MAL/Simkl, odtwarzania, NFO, uprawnień i API katalogu.

## Komputer — wyniki wyszukiwania
- Karty w wynikach wyszukiwarek nie rozciągają się do wysokości najdłuższego opisu w danym rzędzie.
- Wysokość każdej karty odpowiada jej rzeczywistej zawartości; sam opis pozostaje widoczny (do dotychczasowych 4 linii), a pełny opis jest w podglądzie `i`.
- W karuzelach bibliotek wiersz tytułu zachowuje widoczny, klikalny przycisk `i`, również na komputerze.

## Telefon — Jellyfin na Android/iOS, przeglądarka
- Karuzele bibliotek i propozycji mają jednakową, zwartą wysokość: plakat 2:3, gatunki na plakacie, jeden wiersz tytułu, `i` po prawej, bez opisu i bez pustej rezerwy miejsca po nim.
- Pełna lista po kliknięciu nagłówka gatunku (np. `Romans`, `Isekai`) korzysta z tego samego układu trzech kafelków i kompaktowych znaczników.
- Poprawka używa konkretnych selektorów z `!important` dla starszych zasad Jellyfin Mobile: nie wpływa na statusy MAL/Simkl ani na elementy odtwarzania.

## Okno `i`
- Wyświetla plakat z istniejącego adresu Jellyfin `Primary` (tego samego, co kafelek); brak plakatu lub błąd pobierania ma neutralną informację zastępczą.
- Wyświetla pełną nazwę, wszystkie gatunki i nieskrócony opis.
- Przycisk **Otwórz** jest po lewej, **Zamknij** po prawej.
- Zachowuje dotychczasowe działanie zamykania klawiszem Esc, kliknięciem poza oknem i przywracanie focusu.
- Nie pobiera oddzielnych danych MAL/Simkl.

## Weryfikacja

- Automatyczne: 499 testów Python i 59 skryptów Node.js — zaliczone.
- Nie wykonywano kompilacji .NET 10 ani wizualnego testu na rzeczywistym Jellyfinie.
- Dotychczasowe workflow GitHub Actions pozostają niezmienione.
