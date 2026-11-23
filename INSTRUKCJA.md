# MisioFlix — wspolne karuzele dla wszystkich bibliotek (wariant Z FLAGAMI)

## Cel
Wszystkie biblioteki widoczne dla uzytkownika Jellyfina sa wykrywane do karuzel po trwalym ID. Rolą biblioteki (Anime PL, ENG, PL+ENG, Simkl) steruje sie NFO/MAL/Simkl, lecz nie widocznoscia biblioteki. Nowe biblioteki dolaczaja automatycznie; kolejnosc i widocznosc konfiguruje sie w MisioFlix -> ustawienia -> Karuzele.

## Co zostalo poprawione
- Usunieto filtrowanie bibliotek w panelu na podstawie CollectionType/roli; dla kazdego prawidlowego ItemId tworzy sie pozycje na liscie.
- Serwer /home/libraries uwzglednia biblioteki bez CollectionType jako mixed.
- Kazda karuzela korzysta z tego samego odczytu bezposrednich pozycji z Jellyfina po ParentId i zalogowanym uzytkowniku; jesli brak tytulow, probuje odczytu rekurencyjnego i autoryzowanej starszej sciezki Users/{id}/Items.
- Foldery z tvshow.nfo/movie.nfo moga byc kafelkami, niezaleznie od roli biblioteki. Bez dowodu rodzaju mediow nie zgaduje sie typu dowolnego folderu.
- Przy obsludze anime w karuzeli nie blokuje odczytu dodatkowy warunek na stara sciezke AnimeSource. NFO nadal dostarcza tytul, opis i gatunki; nie zmienia to mechaniki MAL ani wyszukiwarki anime.
- Paginacja pamieta liczbe przejrzanych pozycji Jellyfina, a nie tylko liczbe pokazanych kafelkow.

## Instalacja tylko przez strone GitHub
1. Wybierz galez main w kumblip/misioflix. Nie podmieniaj calej zawartosci repozytorium archiwum ZIP.
2. Rozpakuj paczke. Podmien pliki w folderach repozytorium w tej samej strukturze:
   - src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs
   - src/Jellyfin.Plugin.MisioFlix/Web/configPage.html
   - src/Jellyfin.Plugin.MisioFlix/Web/home.js
   - wszystkie pliki w tests/current/ wymienione w tej paczce
3. Zatwierdz commit. W Actions sprawdz build, po czym uruchom workflow publikacji na main wedlug dotychczasowej procedury.
4. Po instalacji zaktualizowanej wtyczki w Jellyfin odswiez strone (Ctrl+F5), w ustawieniach MisioFlixa wybierz "Odswiez liste karuzel", skontroluj Anime PL i ENG i zapisz kolejnosc.
5. Sprawdz karuzele Anime PL, Anime ENG i pozostale; sprawdz "Losuj" i "Ostatnio dodane". Dopiero pozniej testuj wyszukiwarke anime/MAL, bo to odrebne mechanizmy.

## Bezpieczenstwo i testy
- Nie zmieniono: .github/workflows, meta.json, automatycznego numerowania, fizycznych plikow na NAS, NFO, MAL, Simkl, flag i odtwarzacza.
- Testy lokalne: 566 testow Python i 61 skryptow Node, wszystkie OK.
- Nie zweryfikowano kompilacji .NET 10 ani dzialania bezposrednio na Jellyfinie/NAS (brak .NET w srodowisku). Wynik 603 pozycji wymaga testu na Twoim serwerze.
- Warto zachowac poprzedni sprawny Release do wycofania aktualizacji.
