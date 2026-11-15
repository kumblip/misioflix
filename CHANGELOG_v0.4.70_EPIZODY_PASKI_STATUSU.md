# MisioFlix Native v0.4.70.0 — paski statusu odcinków

- W natywnych listach odcinków anime (MAL) i pozostałych seriali (Simkl) status jest widoczny wyłącznie jako pionowy pasek szerokości 4 px po lewej.
- Kolory: różowy = nieobejrzane, złoty = rozpoczęte, zielony = obejrzane. Obejrzany odcinek z rzeczywistym wznowieniem ma zielony pasek po lewej i złoty pasek na dole (4 px). Brak pełnego obramowania.
- Naprawiono brak pasków w szczegółach całej serii anime, jeśli Jellyfin renderuje bezpośrednio odcinki (a nie odrębny ekran sezonu). Lista odcinków jest odczytywana tylko na potrzeby wyglądu. Przy kilku sezonach status ukończenia jednego wpisu MAL nie jest przypisywany innym sezonom.
- Odrębne klasy CSS MAL/Simkl; bez zapisów do zewnętrznych serwisów, Jellyfina, NFO lub historii.
- Zachowano bez przenoszenia natywnego DOM funkcjonujący od v0.4.67 edytor metadanych; pozostałe obszary wyglądu niezmienione.
- Wersja testowa RC — zachować checkpoint v0.4.64.0.
