# MisioFlix Native v0.4.110.0 — jedno wydanie: sortowanie propozycji, listy gatunków i dwa wpisy bocznego menu

**Baza:** v0.4.109.0. Wszystkie poprawki CI z v0.4.108 pozostają zachowane.

## 1. Sortowanie propozycji w panelu MisioFlix

W sekcji **Propozycje według gatunków** każdy zestaw ma uchwyt `⠿` w nagłówku rozwijanego panelu.

- Uchwyt można przeciągać myszą na inną pozycję. Na ekranach dotykowych działa także przeciąganie uchwytu palcem.
- Dla klawiatury: ustaw fokus na uchwycie i naciśnij strzałkę w górę albo w dół.
- Po zmianie kolejności naciśnij dotychczasowy przycisk **„Zapisz propozycje”**. Zapisana kolejność obowiązuje na stronie głównej wszystkich użytkowników z dostępem do właściwych tytułów.
- Zapis obejmuje oryginalną listę `RecommendationSets` i nie zmienia wybranych gatunków ani warunku AND/OR. W trakcie przestawiania rozwinięte panele pozostają rozwinięte.
- Bez naciśnięcia „Zapisz propozycje” zmieniona kolejność pozostaje wyłącznie w bieżącym widoku konfiguracji.

## 2. Otwieranie wszystkich propozycji z danej karuzeli

Nagłówki karuzel gatunkowych, np. **Akcja**, **Kryminał**, **Romans** czy **Akcja + Komedia**, są klikalne i otwierają pełny, osobny widok listy.

- Lista zawiera wszystkie pozycje dopasowane do tego samego zestawu gatunków i jego reguły „wszystkie / dowolny”, z poszanowaniem przełącznika „Uwzględnij anime”.
- Wyświetla identyczne plakaty, łapki i kolorowe ramki, ale bez opisów.
- Kolejne kafelki doładowują się automatycznie podczas przewijania. Wykorzystywane jest istniejące API `recommendation-cards`, do 24 identyfikatorów na żądanie; **nie ma limitu 5**.
- Kolejność odpowiada aktualnie wybranemu trybowi karuzeli: domyślnie **Losuj**, alternatywnie **Ostatnio dodane**.
- Jest przycisk zamknięcia, Esc i awaryjny przycisk ręcznego doładowania. Kliknięcie kafelka nadal otwiera natywne szczegóły Jellyfina.

## 3. Nawigacja administratora

Na samym dole panelu konfiguracji znajduje się **„← Wróć do MisioFlix — widok ogólny wtyczki”**.

Link prowadzi do `#/dashboard/plugins/97d15b37b868492b83daeb67b16a0d44?name=MisioFlix` na **tym samym serwerze i porcie**, z którego administrator korzysta. Dzięki temu działa również zdalnie przez Tailscale, zamiast wymuszać nazwę hosta `kumadlaneko`.

Nie modyfikowano globalnego paska wtyczek Jellyfina ani jego routingu.

## 4. Dwa natywne wpisy w bocznym menu administratora Jellyfin

Zamiast wydawać oddzielną v0.4.111.0, obie funkcjonalności publikujemy razem jako **v0.4.110.0**. Rejestracja dwóch stron (`IHasWebPages`, `PluginPageInfo`) znajduje się w `src/Jellyfin.Plugin.MisioFlix/Plugin.cs`:

- **MisioFlix — ustawienia** — istniejąca konfiguracja, zachowana jako pierwsza strona rejestracji; przycisk „Konfiguruj” pozostaje powiązany z ustawieniami;
- **MisioFlix** — osobna pozycja otwierająca ogólny widok informacji o wtyczce; nowa strona `Web/overviewPage.html` przekierowuje przez natywny router Jellyfina do `#/dashboard/plugins/97d15b37b868492b83daeb67b16a0d44?name=MisioFlix`.

Nowa pozycja nie wymaga ani stałego hosta `kumadlaneko`, ani modyfikacji `/jellyfin-web`. Na stronie przeglądu jest też klikalny link na wypadek, gdyby klient nie wykonał automatycznego przekierowania. U dołu ustawień pozostaje link powrotu z v0.4.110.

## Zakres i testy

Zmiany w kodzie: `Web/configPage.html`, `Web/home.js`, `Web/theme.css`, `Plugin.cs`, nowa `Web/overviewPage.html`, pliki wersji, dokumentacji oraz testów. Nie zmieniono MAL, Simkl, NFO, odtwarzacza, wyszukiwarek i GitHub Actions.

- 482 testy Python — PASS
- 55 testów Node.js — PASS
- Test Chromium: przeciąganie myszą, strzałki klawiatury, zachowanie kolejności po zapisie — PASS
- Test Chromium: 37 wyników otwieranych w pełnym widoku, pobranych w partiach 24 + 13 bez opisów — PASS

Kompilacji .NET 10 i weryfikacji na fizycznym Jellyfinie/NAS-ie nie wykonano w tym środowisku.
