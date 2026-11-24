# MisioFlix 0.4.153.0 — MAL i role bibliotek

Baza: 0.4.152.0. Wyszukiwarka używała identyfikatora biblioteki, ale odczyt MAL, nakładki kart, propozycje i Oglądaj dalej nadal w niektórych miejscach rozpoznawały anime wyłącznie po ścieżce. Teraz używają wspólnego przypisania roli na podstawie rzeczywistej przynależności elementu do bibliotek Jellyfina. Zapisana rola ma pierwszeństwo nad ścieżką; jeżeli brak dopasowania identyfikatora, pozostaje dotychczasowe sprawdzenie ścieżki. Starsze konfiguracje zachowują oba historyczne katalogi anime.

- Anime PL, Anime ENG i Anime PL+ENG: NFO + MAL. Simkl: filmy i seriale. Przy współdzielonym członkostwie anime ma pierwszeństwo; nieznane przypisania nadal nie są automatycznie wysyłane do Simkl.
- Weryfikacja dostępu do elementu oraz rodzica sezonu pozostaje obowiązkowa; MAL ID nadal pochodzi z lokalnego NFO. Zapis ról nie zmienia tokenów, ścieżek Jellyfina ani NFO.
- Wersja schematu lokalnego cache katalogu zmieniona na v9; wymusza odbudowę danych katalogowych przy następnym użyciu.
- Bez zmian w plakatach, CSS, filtrze statusu i mechanizmie wydań.

Wdrożenie: nałożyć kompletne pliki ZIP na 0.4.152.0, build, release, restart Jellyfin i Ctrl+F5. Upewnić się, że role bibliotek są zapisane i moduł Web MAL aktywny. Sprawdzić panel MAL na anime PL i ENG (w tym wybrany sezon), ramki na Home i brak panelu MAL na produkcjach Simkl. Nie rozłączać konta MAL tylko w celu aktualizacji.

Testy lokalne: 616 Python, 79 skryptów Node.js. Nowe testy klasyfikacji serwerowej są statycznymi testami kontraktu źródeł; nie zastępują kompilacji .NET 10 ani testu integracyjnego na Jellyfinie.
