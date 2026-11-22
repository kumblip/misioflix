# MisioFlix — usunięcie Smart Downloads ze strony głównej

Ta paczka usuwa z MisioFlixa wyłącznie:
- przycisk „Smart Downloads” z banera głównego;
- popup konfiguracji Smart Downloads i związany kod JavaScript;
- dedykowane style CSS popupu i regułę kolejności jego przycisku.

Zachowano przyciski bibliotek, dwie wyszukiwarki, MAL, Simkl,
kompaktowy układ mobilnego logo w tym samym kontenerze i resztę funkcji.
MisioCache nie jest zmieniany ani odinstalowywany przez tę paczkę.

Wgrywanie: rozpakować ZIP do repozytorium MisioFlix (nie MisioCache),
zachowując ścieżki katalogów, zatwierdzić zmiany i uruchomić właściwą
procedurę publikacji na GitHub. Nie ruszać workflow ani numerowania wersji.

Testy na bazie źródeł MisioFlix v0.4.121 z zastosowanymi ostatnimi
pliki home.js/theme.css i testem logo: 528 testów Python i 61 skryptów Node OK.
Kompilacja .NET i test w Androidzie nie zostały wykonane w tej sesji.
