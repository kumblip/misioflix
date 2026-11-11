# Wdrożenie MisioFlix Native 0.4.33.0

1. Rozpakuj archiwum ZIP **lokalnie**.
2. Wgraj zawarte pliki do istniejącego repozytorium GitHub w odpowiadające im ścieżki (zastąp poprzednie wersje). Nie kasuj innych plików.
3. Nie zmieniaj `.github/workflows/build.yml` ani `release.yml` — obecne workflow korzystają z `meta.json`.
4. Uruchom akcję Build i sprawdź jej wynik; zainstaluj skompilowaną paczkę w działającym Jellyfin 12.4.
5. Uruchom ponownie kontener Jellyfin i wyczyść cache strony poprzez Ctrl+Shift+R.
6. Otwórz Zero no Tsukaima (MAL 1195). U góry powinien być badge z **Twoją oceną MAL**, a poniżej zwinięty formularz **Edytuj MAL**. Zapisz zmianę i sprawdź, że pojawiła się również na myanimelist.net.
7. Wróć na główną. Ramki anime powinny odzwierciedlać zapamiętany stan MAL; brak wpisu MAL oznacza neutralną ramkę. Ramki filmów i seriali powinny pozostać po staremu.
8. Sprawdź drugi sezon anime mający **inne** MAL ID w `season.nfo`: powinien pokazać własny wpis MAL.
9. Sprawdź na drugim koncie Jellyfin: oceny i ramki nie mogą przejmować danych poprzedniego użytkownika.

Odczyt listy MAL występuje dopiero przy otwarciu szczegółów anime (po stronie serwera istnieje jego pamięć podręczna). Strona główna działa na zapamiętanych danych i nie odpytuje MAL przy każdym otwarciu. Możesz ręcznie wymusić odświeżenie otwartego anime.

**Nie zmieniaj konta OAuth ani NFO.** Do zgłoszeń nie przesyłaj kodów autoryzacji, Client Secret ani tokenów.
