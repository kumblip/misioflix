# Wdrożenie v0.4.83.0

1. Wgraj **pełną paczkę** do repozytorium `kumblip/misioflix` i uruchom dotychczasowy GitHub Actions / Release. Nie wgrywaj paczki ZIP jako pojedynczego pliku źródłowego.
2. Zainstaluj aktualizację przez repozytorium wtyczek Jellyfina, zrestartuj Jellyfin i odśwież Edge przez Ctrl+F5.
3. Otwórz bibliotekę AnimePL w natywnym widoku `#/mixed`. Przewiń do dołu pierwszej setki kart.
4. W DevTools > Network sprawdź żądanie `Users/.../Items`: ma mieć **jeden** parametr `StartIndex=100` oraz **jeden** `Limit=100`, bez dodatkowego `startIndex=0` i `limit=100`.
5. W konsoli przy sukcesie pojawi się `[MisioFlix Library Scroll] Doładowano 100 kart (offset 200 )` (przy mniejszej bibliotece liczba może być niższa). Dodatkowe karty pojawią się pod pierwszą siatką.
6. Sprawdź filtry/sortowanie, nawigację do szczegółów, inne biblioteki oraz obie wyszukiwarki. W przypadku problemu natywne stronicowanie pozostaje dostępne.

Uwaga: wersja 0.4.83 naprawia powielone parametry i pomijanie stron, ale zachowuje architekturę dodatkowej sekcji znaną z v0.4.82. Nie jest to pełna integracja React. DLL nie została skompilowana ani przetestowana na NAS-ie w tym środowisku.
