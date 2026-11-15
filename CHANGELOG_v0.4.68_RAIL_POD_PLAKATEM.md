# MisioFlix Native v0.4.68.0 RC — panele wracają pod plakat

## Przyczyna
W v0.4.67 własny `.mf-detail-poster-rail` był pozycjonowany w 4. wierszu głównego CSS Grid, razem z natywnymi sekcjami szczegółów. Długi blok sezonów/kolekcji/podobnych w prawej kolumnie opóźniał start lewego panelu, mimo że plakat kończył się wcześniej.

## Poprawka
- Na dużych ekranach MisioFlix kotwiczy tylko swój panel na rzeczywistej dolnej krawędzi natywnego plakatu, bez zmiany kontenera/rodzica plakatu.
- `ResizeObserver` dostosowuje pozycję podczas zmian rozmiaru plakatu i wysokości panelu (np. rozwijanie MAL lub Simkl). Przy zmianie rozdzielczości układ jest obliczany ponownie.
- Wolne miejsce pod lewym panelem jest uwzględnione w minimalnej wysokości strony, gdy nie ma kolekcji ani podobnych.
- Na urządzeniach mobilnych zachowana jest naturalna sekwencja: plakat → panel → reszta.
- Nie zmienia się logika MAL/Simkl, własne style obu usług ani aktywne odtwarzanie.
- Jellyfin-owned nodes pozostają w macierzystych kontenerach DOM — natywny edytor metadanych z v0.4.67 nadal działa bez naruszenia lifecycle scroll komponentów.

## Ryzyko / testy NAS
Test wizualny w Chromium z fiksturą sprawdza położenie pod plakatem przy krótkiej i długiej zawartości prawej kolumny, po rozwinięciu panelu, przy filmach z kolekcją i bez niej oraz przy widoku mobilnym. Ostateczny wygląd i edytor należy potwierdzić w działającym Jellyfinie.
