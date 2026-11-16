# Wdrożenie v0.4.84.0

1. Wgraj pełne źródła do repozytorium `kumblip/misioflix` i opublikuj Release dotychczasowym GitHub Actions.
2. Zainstaluj nową wersję w Jellyfin, zrestartuj Jellyfin i odśwież Edge przez Ctrl+F5.
3. W AnimePL (`#/mixed`) przewiń poniżej pierwszych 100 anime. Plakaty i tytuły kolejnych kart powinny być prawidłowe; po pobraniu metadanych NFO/MAL pojawią się takie same łapki, gatunki, ramki i opisy jak na pierwszej stronie.
4. Przewiń niżej i sprawdź, że kolejna partia po 100 pojawia się automatycznie. Na kolejnych kartach także mają być własne plakaty, bez kopiowanego różowego licznika.
5. Sprawdź także bibliotekę filmów, seriali i niezmienione wyszukiwarki.

Uwaga: pierwsze 100 kart jest nadal zarządzane przez React, a dodatkowe strony przez osobny kontener MisioFlixa. Wtyczka nie podmienia natywnego DOM, lecz nowe karty nie obsługują wszystkich akcji React. Nie przeprowadzono testu z uruchomionym NAS użytkownika ani kompilacji DLL.
