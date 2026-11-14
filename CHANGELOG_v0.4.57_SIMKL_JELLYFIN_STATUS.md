# MisioFlix Native v0.4.57.0 — synchronizacja ręcznego ✓ Jellyfin (BETA)

Baza: pełna v0.4.56 (film/serial, oddzielny Simkl, MAL bez zmian).

1. Serwer nasłuchuje `IUserDataManager.UserDataSaved` i tylko `UserDataSaveReason.TogglePlayed`.
   Kliknięcie w Jellyfinie „Obejrzany” / jego cofnięcie dla pojedynczego filmu lub
   odcinka serialu spoza AnimePL zapisuje zmianę do lokalnej kolejki użytkownika,
   a następnie synchronizuje historię z Simkl. To samo działa w obsługiwanych
   aplikacjach mobilnych używających natywnego API Jellyfina.
2. Automatyczny próg odtwarzania: **80%** (zamiast wcześniejszych 75%).
3. Zachowana reguła „Następny odcinek”: nawet po kilku sekundach; również
   przejście do odcinka 1 następnego sezonu. Bez zmian w tej regule.
4. Zdarzenia TogglePlayed są porządkowane w pojedynczej kolejce asynchronicznej;
   nie ma nasłuchu CSS/JS ani interakcji z MAL. Wysyłka do API nie blokuje Jellyfina.
5. Jeśli nie ma jeszcze kopii pobranej z Simkl, lokalna baza inicjalizuje
   pusty snapshot i zachowuje zmianę oraz operację oczekującą do synchronizacji.

**Uwaga:** przyciski `✓` w Jellyfinie i edytor `Simkl` są oddzielnymi
interfejsami: nowy monitor reaguje na zapis historii w samym Jellyfinie.
W bazie lokalnej pozostaje osobna historia, kopie dzienne/miesięczne i kolejka.
Nie zapisujemy anime do Simkl.

**Testowanie:** testy kontraktu Pythona i Node.js nie zastępują kompilacji
.NET 10 ani testu integracyjnego na NAS-ie z kontem Simkl.
