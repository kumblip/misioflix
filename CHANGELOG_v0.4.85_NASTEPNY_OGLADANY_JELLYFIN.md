# MisioFlix 0.4.85 — „Następny odcinek” = obejrzany w Jellyfin

- Zmiana dotyczy **wyłącznie** ręcznego kliknięcia natywnego przycisku **Następny** (oraz skrótu klawiaturowego następnego odcinka) podczas odtwarzania w Jellyfin Web.
- Przy kliknięciu front-end wysyła autoryzowaną informację o intencji przejścia do następnego odcinka. Nie zatrzymuje własnego odtwarzacza Jellyfina ani nie zastępuje sterowania.
- Serwer MisioFlixa sprawdza, czy po tej akcji rozpoczęła się faktycznie kolejna pozycja z tej samej serii. Jeżeli tak, **poprzedni odcinek jest oznaczany jako obejrzany w oryginalnym systemie UserData Jellyfina** (`BaseItem.MarkPlayed(User)`), nawet gdy obejrzano 1 sekundę.
- Zwykłe zatrzymanie, przewijanie, wstecz, otwarcie innego tytułu lub automatyczne przejście bez sygnału użytkownika nie wywołują dodatkowego oznaczenia. Próg 90% w Jellyfinie nie jest zmieniany.
- Rozpoznawanie obowiązuje tylko dla sąsiadujących numerów odcinków tego samego serialu oraz pierwszego odcinka następnego sezonu; brak arbitralnego zaliczania przeskoków E01→E17.
- Zapis dotyczy użytkownika, który wydał polecenie; żadna lokalna baza statusów obejrzenia ani osobna baza MisioFlix nie jest tworzona.
- Nie zmieniono wyszukiwarek, bibliotek, łapek, NFO, odtwarzacza, integracji MAL/Simkl ani skryptu aktualizacji.

## Ważne ograniczenia

- Ręczne „Następny” przez inne niezależne klienty (aplikacja TV, odtwarzacz zewnętrzny) nie jest przechwytywane — to rozwiązanie dla wbudowanego Jellyfin Web, także gdy jest wyświetlane przez przeglądarkę mobilną.
- Rozpoznanie przycisku bazuje na HTML Jellyfin Web 12.4; po przyszłych zmianach w tym HTML może wymagać korekty.
- Wtyczka wymaga kompilacji GitHub Actions i testu na serwerze. Zestaw testów źródłowych nie stanowi testu integracyjnego na NAS-ie.
