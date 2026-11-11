# Wdrożenie MisioFlix v0.4.26.0

1. Rozpakuj `MisioFlix_Native_v0.4.26_Kolekcje_Osobna_Karuzela_GitHub.zip`.
2. Wgraj pliki do istniejącego repozytorium `kumblip/misioflix`, zachowując ścieżki. To aktualizacja źródeł, nie gotowa biblioteka `.dll`.
3. **Nie wgrywaj ani nie edytuj** `.github/workflows/build.yml` i `release.yml`. Obecne workflow czytają `meta.json` i uruchamiają testy z `tests/current`.
4. W GitHub Actions uruchom Build; z jego artefaktów pobierz paczkę wtyczki `MisioFlix_0.4.26.0_JF12.4.zip`.
5. Zaktualizuj wtyczkę w Jellyfin, uruchom kontener ponownie, odśwież przeglądarkę przez Ctrl+Shift+R.
6. W ustawieniach Jellyfin **pozostaw wyłączone** „Grupuj filmy w kolekcje” i „Grupuj seriale w kolekcje”. Nowa sekcja strony głównej nie wymaga tych opcji.
7. Sprawdź stronę główną: `AnimePL → Kolekcje → Filmy ENG`. Kliknij kilka kolekcji z własnymi plakatami. Kliknięcie powinno otworzyć oryginalną stronę kolekcji ze wszystkimi jej filmami.
8. Sprawdź „Step Up &” i „The Whole Nine Yards + The Whole Ten Yards” w zwykłej bibliotece filmów. Powinny mieć etykietę FOLDER, ewentualnie PUSTY FOLDER **tylko po potwierdzeniu braku dzieci przez Jellyfin**. Żadnych folderów nie usuwano.
9. Sprawdź, że filmy w karuzelach Filmy ENG / Filmy PL nadal wyświetlają się osobno i nie znikają pod grupowaniem.

Jeżeli sekcja „Kolekcje” się nie pojawi, sprawdź, czy `/Users/Me/Views` Twojego konta zawiera widok z `CollectionType=boxsets` oraz czy Jellyfin zwraca jego elementy. Nie potrzebujemy zmieniać ustawienia grupowania, aby to zweryfikować.
