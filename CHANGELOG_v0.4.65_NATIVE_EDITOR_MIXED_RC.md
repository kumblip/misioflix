# MisioFlix Native v0.4.65.0 — wersja testowa RC

Podstawa: zaakceptowany checkpoint v0.4.64.0. Dostarczone źródło historyczne: v0.4.5.0.

## Zmiany

1. **Edytuj metadane:** przed przekazaniem kliknięcia do natywnego `itemContextMenu` Jellyfina oryginalne elementy szczegółów zostają przywrócone w ich miejsce. MisioFlix wstrzymuje przestawianie tego DOM podczas otwierania/obsługi `metadataEditor.show` i przywraca własny układ po zamknięciu okna. Nie zmieniono natywnego edytora, zapisów NFO ani API. Stara ścieżka awaryjna Menedżera metadanych pozostaje do czasu potwierdzenia na NAS-ie.

2. **AnimePL, /mixed:** `client.js` czeka z dekoracją kart do zakończenia montowania widocznej listy Jellyfina (stabilna karta z tym samym `data-id` przez dwa cykle animacji). Dekoruje wyłącznie aktualny kontener listy, nie modyfikuje ukrytych, buforowanych drzew React i nie stosuje odzyskiwania po błędzie jako warunku działania. Oryginalne menu, przewijanie i odtwarzacz nie są podmieniane.

3. **Dotychczasowy pojedynczy reload po błędzie:** pozostawiony tymczasowo jako zabezpieczenie. Usunięcie po udanym, powtarzalnym teście na rzeczywistym NAS-ie — lokalne testy nie dowodzą naprawy losowego wyjątku z Jellyfina.

## Zakres

Modyfikacje funkcjonalne dotyczą wyłącznie `Web/details.js` oraz `Web/client.js`; nie zmieniono `mal.js`, `simkl.js`, ich CSS, baz danych, synchronizacji ani usług C#.

## Ograniczenia

Nie udało się odtworzyć incydentalnego wyjątku `addScrollEventListener is not a function` ani błędu natywnego edytora w uruchomionej instalacji użytkownika. Jest to kandydat do poprawy przyczyny, nie zweryfikowany na NAS-ie fix. Pozostawić v0.4.64 jako checkpoint.
