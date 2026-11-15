# MisioFlix Native v0.4.66.0 — edytor metadanych, RC

Baza: v0.4.65 RC (z zachowaniem poprawki gotowości AnimePL); stabilny checkpoint v0.4.64 pozostaje nienaruszony.

## Zdiagnozowane zachowanie

W v0.4.65 po 3000 ms od kliknięcia „Edytuj metadane” własny kod MisioFlixa ustawiał `#/metadata`, jeżeli nie znalazł `.formDialog`. To przenosiło użytkownika do *Menedżera metadanych*, a nie edytora bieżącego tytułu. Ponadto w fazie `capture` kliknięcia wybierającego `edit` kod synchronicznie przenosił węzły szczegółów, zanim natywne `itemContextMenu` skończyło obsługę tego zdarzenia.

## Naprawa

- Nie zmieniamy URL po nieudanym lub opóźnionym montowaniu natywnego edytora. Nie ma automatycznego zastępowania `edit` ekranem `#/metadata`.
- Po wyborze polecenia `edit` oddajemy natywną strukturę szczegółów do Jellyfina w następnym *zadaniu* event loop (timeout 0), dopiero po natywnej obsłudze kliknięcia i rozstrzygnięciu akcji action-sheet.
- Obecność natywnego edytora rozpoznajemy po `.editItemMetadataForm`, zamiast po dowolnym `.formDialog` (także z innego menu). Po jego rzeczywistym zamknięciu przywracamy układ MisioFlix.
- Gdy edytor nie pojawi się w 8 s, pozostajemy na szczegółach tytułu i logujemy ostrzeżenie w Console; nie ukrywamy pierwotnego błędu Jellyfin, w tym ewentualnego błędu pobierania chunku.
- Bez zmian w MAL/Simkl, backupach, backendzie i logice bibliotek AnimePL.

## Testy i ograniczenia

Testy statyczne oraz symulacja węzłów edytora / menu Jellyfin, bez prawdziwego dostępu do serwera użytkownika. Test NAS i kompilacja dotnet nadal wymagane. Jest to RC, nie nowy checkpoint.
