# MisioFlix Native 0.4.26.0 — osobna karuzela „Kolekcje”

## Zmiany względem v0.4.25

- Dodano sekcję **Kolekcje** bezpośrednio po karuzeli/karuzelach AnimePL na stronie głównej. Wyświetla **rzeczywiste kolekcje Jellyfin `BoxSet`** z uprawnieniami zalogowanego użytkownika — bez wymuszania opcjonalnego grupowania filmów i seriali w ustawieniach Jellyfin.
- Kliknięcie plakatu lub nazwy kolekcji otwiera jej główną stronę szczegółów. Tytuł sekcji otwiera widok kolekcji z poprawnymi `parentId` i `serverId`; karuzela może być przewijana i korzysta z dotychczasowych przycisków „Losuj” / „Ostatnio dodane”.
- Pojedyncze filmy i seriale nadal pozostają osobnymi pozycjami. Zapytanie pobierające karuzele filmowe/serialowe przekazuje `CollapseBoxSetItems=false`, nawet gdy ustawienie grupowania w Jellyfin było chwilowo włączone na potrzeby testu.
- Wykluczono widok `collections` z obu wyszukiwarek i przycisków pięciu bibliotek w banerze. Gatunki i dotychczasowe źródła NFO/Jellyfin nie zostały zmienione.
- W zwykłych bibliotekach odróżniamy **KOLEKCJA** (`BoxSet`) od **FOLDER** (`Folder`). Jeżeli API potwierdza, że folder nie ma żadnych elementów, dostaje oznaczenie **PUSTY FOLDER**. Nic nie jest usuwane ani automatycznie ukrywane.
- Zapytania o kolekcje pod folderem kolekcji nie przekazują `IncludeItemTypes=BoxSet` ze względu na znany błąd filtrowania tego połączenia parametrów w Jellyfin; wynik filtrowany jest po `Type=BoxSet`.
- Brak zmian w playerze, punkcie wznowienia, NFO, plikach bibliotek i `.github/workflows/`.

## Kontrola lokalna

- 99/99 testów Python oraz 2/2 skrypty Node.
- Chromium: prawidłowa kolejność AnimePL → Kolekcje → Filmy ENG, karta BoxSet z plakatem i licznikiem, link do szczegółów kolekcji, wyłączenie kolekcji z wyszukiwania mediów.
- Brak lokalnego kompilatora .NET/Jellyfin 12.4; DLL i test rzeczywistego API kolekcji wymagają GitHub Actions i instalacji na NAS.

## Granice

- Podobnie nazwane foldery fizyczne (np. „Step Up &”) **nie** są automatycznie traktowane jak `BoxSet`. Brak plakatu i angielski tytuł nie dowodzą pustej zawartości. Etykieta „PUSTY FOLDER” pojawia się tylko po udanym zapytaniu i potwierdzeniu 0 elementów.
- Jeśli aktualny użytkownik nie widzi biblioteki typu `boxsets` w `/Users/{id}/Views`, osobny wiersz nie będzie dostępny — niczego nie odblokowujemy ani nie obchodzimy uprawnień.
