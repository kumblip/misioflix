# MisioFlix 0.4.88 — bezpośredni cel Wstecz i odporność bibliotek

- Zmieniono **docelową akcję** przycisku `ArrowBackIcon` w natywnym odtwarzaczu: po sprawdzeniu aktualnego odcinka i jego `SeasonId` w Jellyfinie przechodzi bezpośrednio do `#/details?id=<SeasonId>`.
- **Bez pośredniego `history.back()`, bez powrotu do szczegółów odcinka, bez timera ponownego ustawiania adresu i bez pełnego `location.reload()`**. Przechwytywany jest tylko przycisk odtwarzacza, nie zwykłe przyciski Wstecz.
- Jeżeli brak potwierdzonego odcinka/sezonu, pozostaje natywne działanie Jellyfina; nie otwieramy losowej strony.
- Library infinite scroll: ponowna weryfikacja pierwszej partii po React remount i próba powrotu do aktualnych parametrów biblioteki przed rezygnacją. Zapytania nadal są zgodne z rzeczywistą kolejnością Jellyfina. Nie zmieniano wyszukiwarek.
- Uwaga: moduł bibliotek nadal korzysta z dodatkowej siatki dla kolejnych stron, a nie natywnego rozszerzenia renderowania React.
- Po instalacji przetestować: player -> Wstecz -> sezon -> biblioteka (bez Ctrl+F5) -> doładowanie stron 101–200 i 201–300.
