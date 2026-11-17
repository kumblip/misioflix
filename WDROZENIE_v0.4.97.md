# Wdrożenie v0.4.97 — kolekcje zawierają wyłącznie seriale

1. Wykonaj backup danych Jellyfina (w tym natywnych kolekcji `BoxSet` i folderu stanu MisioFlix `misioflix/collections`) przed aktualizacją. Nie jest to aktualizacja wyłącznie wizualna; synchronizator v0.4.96 nadal tworzy, dodaje i usuwa swoje zarządzane powiązania.
2. Wgraj pełne źródła v0.4.97 do GitHub, sprawdź kompilację `dotnet publish` w GitHub Actions i zainstaluj faktyczny pakiet pluginu z Release. ZIP źródłowy nie jest DLL gotową do instalacji.
3. Zrestartuj Jellyfin po instalacji, wejdź jako administrator do strony konfiguracji MisioFlix.
4. Kliknij „Synchronizuj kolekcje z NFO teraz”, a potem „Pokaż raport filmów i seriali”.
5. Zweryfikuj liczniki filmów z NFO oraz filmów z `<set>`. Sprawdź kolekcje Flintstonowie, Café Myszka i Scooby-Doo.
6. Jeśli filmów nadal brakuje, skopiuj tekst raportu do kolejnej rozmowy. Raport pokazuje, czy problem jest po stronie skanowania filmów, czy natywnego zapisu BoxSet.
7. Jeśli jest problem z tworzeniem BoxSetów, sprawdź log Jellyfina pod kątem komunikatów `MisioFlix skipped invalid/unavailable NFO`, `MisioFlix failed to update BoxSet` i `MisioFlix: collection ... has NFO members missing`.

### Główne ograniczenie
Nie przeprowadzono testu na Twojej instancji Jellyfina, zatem nie należy uznawać brakujących filmów za naprawione na NAS-ie, zanim raport i faktyczna zawartość kolekcji to potwierdzą.
