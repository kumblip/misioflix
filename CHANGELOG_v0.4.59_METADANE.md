# MisioFlix Native v0.4.59.0 — prawidłowy fallback metadanych Jellyfin 12

- Usunięto nieistniejącą trasę `edititemmetadata.html`, która powodowała „Nie znaleziono strony”.
- `Edytuj metadane` (`data-id="edit"`) nadal w pierwszej kolejności obsługuje natywny edytor Jellyfin: `src/components/itemContextMenu.js` importuje `src/components/metadataEditor/metadataEditor.js` i otwiera dialog `metadataEditor.show(itemId, serverId)`.
- Po 3 sekundach, jeżeli Jellyfin nie otworzył dialogu, fallback przechodzi do działającej strony `#/metadata` („Menedżer metadanych”). W takim przypadku użytkownik musi wybrać pozycję ręcznie w menedżerze.
- Nie tworzono własnego formularza i nie dodawano zapisu metadanych przez API. To bezpieczny workaround nawigacji, **nie potwierdzona naprawa braku natywnego dialogu**.
- Wszystkie pozostałe opcje menu i mechanizmy MAL/Simkl pozostają bez zmian.
