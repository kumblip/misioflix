# MisioFlix Native v0.4.112.0 — duplikat biblioteki po zmianie nazwy i 10 pozycji początkowych

Baza wydania: **v0.4.111.0** (wydanie z domyślnie widocznymi propozycjami oraz oknem „i”).

## Problem z nazwą biblioteki

Po zmianie nazwy w Jellyfinie z `AnimeENG` na `Anime ENG` w banerze MisioFlixa i filtrach wyszukiwarki bywały widoczne **obie nazwy**. Dotychczasowe `GetHomeLibrariesAsync` zwracało aktualną odpowiedź Jellyfina `Users/{userId}/Views` bez trwałego cache nazw. Gdy Jellyfin zwróci dwie pozycje o starym i nowym zapisie nazwy, frontend wypisywał obie.

Nowa funkcja `coalesceRenamedLibraryViews` w `home.js` scala kosmetyczne warianty tej samej nazwy różniące się odstępami (np. `AnimeENG`/`Anime ENG`) i kategorią zgodną dla obu pozycji, preferując pełniejszy, czytelniejszy wariant nazwy. Znormalizowana lista jest wspólna dla banera, wyboru bibliotek w wyszukiwarkach i karuzel bibliotek.

**Ochrona danych:** Funkcja nie usuwa ani nie modyfikuje bibliotek, NFO czy wpisów Jellyfina. Różne kategorie pozostają rozdzielone. Dwie różne biblioteki o **identycznej** nazwie zachowują dwa wpisy; rozróżnienie właściwych konfiguracji należy do administratora Jellyfina. Jeśli po aktualizacji jedna biblioteka znika z MisioFlixa, a oba widoki rzeczywiście nadal istnieją w natywnych bibliotekach Jellyfina, trzeba ręcznie sprawdzić strukturę bibliotek w Jellyfinie.

## Wczytywanie 10 kafelków

W `home.js` zmniejszono `SHELF_LIMIT` z **12** do **10**. Obejmuje to:

- początkowe pobieranie kafelków zwykłych bibliotek („Ostatnio dodane”);
- początkowe pobieranie każdego zestawu „Propozycje według gatunków” (także domyślnego losowania);
- następne porcje doładowywane przy przewijaniu (10 na partię).

**Niezmienione:** historyczny „Losuj” zwykłej biblioteki zwraca 5 pozycji, jak dotychczas; losowanie propozycji korzysta z pełnej pasującej puli. Nie ograniczono liczby dostępnych pozycji ani wyników w pełnym widoku gatunku. Nie dotknięto sposobu tworzenia katalogu wyszukiwarki, MAL, Simkl, odtwarzacza, NFO i GitHub Actions.

## Diagnostyka

- 490 testów Python i 57 skryptów Node.js: PASS.
- Testy obejmują kolejność `AnimeENG`/`Anime ENG`, odwróconą kolejność danych, stałe ID z inną nazwą, osobne biblioteki o identycznych nazwach, separację kategorii oraz limity karuzel.
- Zależność `lxml` nie jest potrzebna w CI.
- Kompilacja .NET 10 i weryfikacja na prawdziwym serwerze Jellyfin 12.4: **nie wykonano lokalnie**.
