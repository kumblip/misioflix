# Wdrożenie v0.4.95: synchronizacja wielu kolekcji z NFO

1. Wgraj pełne źródła lub różnicę v0.4.94→0.4.95 do GitHuba i zbuduj w GitHub Actions (`dotnet publish`).
2. Zrób backup katalogu konfiguracji Jellyfina, w szczególności danych kolekcji, przed pierwszą próbą synchronizacji.
3. Zainstaluj wtyczkę i uruchom ponownie Jellyfina.
4. W `Panel administracyjny → Wtyczki → MisioFlix` użyj sekcji **Kolekcje Jellyfina z plików NFO**. Zaznacz automatyczną synchronizację lub użyj **Synchronizuj kolekcje z NFO teraz**.
5. Po wykonaniu odczytaj statystyki. Nowe BoxSety i członkostwa zostaną zapisane w Jellyfinie.
6. Jeżeli Jellyfin nie widzi NFO, sprawdź mapowanie ścieżki mediów w kontenerze Docker. Program nie zgaduje ścieżek Windows.

**Uwaga:** MisioFlix działa dodająco. Usunięcie tagu `<set>` z NFO nie usuwa członkostwa, ponieważ mogło zostać dodane ręcznie. Uporządkuj takie pozycje w panelu kolekcji Jellyfina.

**Format:** wspierane są `movie.nfo` i `tvshow.nfo` z wieloma `<set>`. `season.nfo`, `episodename.nfo` nie definiują samodzielnych członkostw. `<sorttitle>` pozostaje globalnym sortowaniem Jellyfina.
