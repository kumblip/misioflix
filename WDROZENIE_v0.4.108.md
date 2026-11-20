# MisioFlix v0.4.108.0 — wdrożenie i test po instalacji

## Repozytorium

Jeśli w repozytorium jest dokładnie v0.4.107.0, rozpakuj archiwum `MisioFlix_Native_v0.4.108_TYLKO_ZMIANY_OD_107.zip` do głównego katalogu repozytorium (z nadpisaniem wskazanych plików). W innym przypadku użyj pełnego archiwum po sprawdzeniu nowszych zmian.

Uruchom istniejące kroki GitHub **build** i **release**. Nie zmieniano workflow ani narzędzi publikacji. Tag wersji to **v0.4.108.0**. Następnie zaktualizuj wtyczkę w Jellyfinie, zrestartuj serwer i odśwież przeglądarkę (`Ctrl+F5`).

## Ustawienia

1. Jellyfin → Wtyczki → MisioFlix → Konfiguracja.
2. Rozwiń „Propozycje według gatunków”. Dotychczasowe pojedyncze wybory z v0.4.107 pokażą się jako osobne propozycje.
3. Rozwiń „Propozycja 1”, następnie „Pokaż gatunki”, zaznacz dowolne gatunki i ustaw „Co najmniej jeden” lub „Wszystkie wybrane”.
4. W razie potrzeby wybierz „+ Dodaj propozycję”, skonfiguruj zestaw 2, 3 itd.
5. Kliknij „Zapisz propozycje”.
6. Na stronie głównej włącz „Pokaż propozycje” i przełącz „Uwzględnij anime” w razie potrzeby.

## Kontrole

- Wszystkie trzy przełączniki pod „Oglądaj dalej” są na tej samej linii.
- Po starcie: biblioteki OFF, propozycje OFF, anime w propozycjach ON.
- „Losuj” jest zaznaczone po pierwszym pokazaniu karuzeli, „Ostatnio dodane” jest alternatywą.
- Zestaw AND pokazuje tylko tytuły ze wszystkimi wybranymi gatunkami; zestaw OR pokazuje z co najmniej jednym.
- Po wyłączeniu anime tylko propozycje tracą tytuły anime; inne biblioteki oraz MAL/Simkl działają bez zmian.
- Nowa karuzela nie ma opisu i podczas przewijania pobiera kolejne paczki, również w „Losuj”.

## Środowisko

Testy: 475 Python + 52 Node.js — PASS. Brak lokalnej kompilacji .NET 10 i dostępu do uruchomionego NAS-a.
