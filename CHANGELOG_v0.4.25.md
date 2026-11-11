# MisioFlix Native v0.4.25.0 — kolekcje i nawigacja

## Zmiany względem v0.4.24

- Dodano **Strona główna (←)** na stronach bibliotek (`#/list`, `#/mixed`, `/movies`, `/tv`) — bez ingerowania w React-owy widok.
- Kliknięcie kafelka rzeczywistego folderu (`Folder` / `CollectionFolder`) w widoku `#/list` otwiera jego zawartość przez `#/list?parentId=<ID>&serverId=<ID>`.
- Kliknięcie `BoxSet` prowadzi do strony szczegółów danej kolekcji.
- Kafelki folderów/BoxSet z brakiem plakatu mogą pokazać mozaikę pierwszych czterech plakatów z ich zawartości, pobieraną z uprawnieniami zalogowanego użytkownika. Jeśli plakatów nie ma, Jellyfin pokazuje oryginalny symbol folderu. Oryginalny plakat kolekcji nie jest nadpisywany.
- Nad folderami wyświetla się mała etykieta **KOLEKCJA**.
- Nie zmieniono tras AnimePL ani natywnych funkcji filmów, seriali i odtwarzacza; zachowano obejście `/list` z `serverId` z v0.4.24.
- Zachowano kontrolki Jellyfin: menu, oznaczanie obejrzenia i inne przyciski nadal są obsługiwane natywnie.

**Uwaga:** to poprawka po stronie klienta. Nie zmienia definicji kolekcji, plików wideo ani danych Jellyfin.

## Testy lokalne

- 92/92 testy Python oraz 2/2 testy Node.
- Chromium (symulowany interfejs): folder i BoxSet przechodzą do odpowiedniej strony; przycisk prowadzi do strony głównej; zwykłe filmy bez zmian; mozaika obrazów i cleanup po SPA.
- Kompilacja DLL i rzeczywisty test na NAS-ie nadal wymagane.
