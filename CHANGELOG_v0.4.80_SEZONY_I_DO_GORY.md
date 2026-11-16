# MisioFlix Native v0.4.80.0

## Pasek sezonów — naprawa faktycznego DOM Jellyfin 12.4

- W v0.4.79 pasek `S01`, `S02` itd. trafiał pod wszystkimi odcinkami, ponieważ `primary.append(nav)` dopisywał kontrolkę na końcu kontenera.
- W v0.4.80 pasek jest dodawany bezpośrednio **przed** `#listChildrenCollapsible` (lub kontenerem `#childrenContent`), wewnątrz rzeczywistego nadrzędnego `.detailSection`. Załączony przez użytkownika wyciąg HTML potwierdził tę strukturę.
- Nadal działa dla anime i zwykłych seriali, z aktywnym sezonem oznaczonym różowym kolorem. Nie zmieniono kolejności odcinków, NFO ani nawigacji wstecz.
- Kiedy Jellyfin jeszcze nie wstawił elementu listy, wykonywana jest odroczona próba osadzenia przycisków; nie dopisujemy ich już na dole.

## Wyszukiwarka

- Przywrócono opis przełącznika: **„Pokaż osobno sezony/speciale/itd.”**.
- Pozostałe filtry, podpowiedzi i działanie katalogów są bez zmian.

## Pływająca strzałka „Do góry”

- Jedna wspólna kontrolka z prawej na dole wszystkich stron MisioFlixa. Pokazuje się, gdy aktualnie przewijana zawartość jest wystarczająco daleko od góry.
- Przy otwartej wyszukiwarce anime lub filmów i seriali kontrolka działa na **wewnętrzny obszar wyszukiwarki**, a nie na stronę za modalem. Po zamknięciu wraca do aktywnego przewijanego widoku Jellyfina.
- Obsługuje przewijane kontenery Jellyfina 12.4 i standardowy scroll przeglądarki. Nie przestawia elementów native DOM ani nie wpływa na poziome karuzele.
- Gdy widoczny jest odtwarzacz, kontrolka nie jest wyświetlana. Zachowana dostępność klawiatury i aria-label.

## Testy źródłowe

- 372 testy Python i 30 skryptów Node (z nowymi testami osadzenia w zagnieżdżonym DOM i modalnego przewijania).
- Testy w Node/Python nie zastępują kompilacji DLL ani weryfikacji w uruchomionym Jellyfinie na NAS-ie.
