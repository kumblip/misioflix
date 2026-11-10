# MisioFlix Native v0.4.14.0

- **Mniej pustego miejsca na górze Home:** własny ekran startowy jest wstawiany na początek zawartości, dzięki czemu znika duża pusta przerwa nad hero.
- **Skróty do bibliotek:** pod sekcją hero pojawia się pasek przycisków prowadzących bezpośrednio do bibliotek Jellyfin (AnimePL, Filmy ENG, Filmy PL, Seriale itd.).
- **Wyszukiwarka anime:** nowy panel wyszukuje po tytule, opisie i gatunkach anime, korzystając z danych NFO dla anime.
- **Wyszukiwarka nie-anime:** osobny panel dla filmów i seriali spoza anime, z gatunkami pobranymi przez Jellyfin oraz filtrem typu `Wszystko / Seriale / Filmy`.
- **Wyniki w stylu MisioFlix Home:** wyniki są renderowane jako te same karty/plakaty, z przyciskiem `Pokaż więcej`.
- Zachowane zostały: karuzele bibliotek, przeciąganie myszką, przesuwanie palcem, strzałki, losowanie i `Oglądaj dalej`.

Testy lokalne: 23/23 zaliczonych (`test_v0412`, `test_home_0412`, `test_drag_0413`), plus kontrola składni `home.js`.
Kompilacja GitHub Actions i test na NAS pozostają do potwierdzenia.
