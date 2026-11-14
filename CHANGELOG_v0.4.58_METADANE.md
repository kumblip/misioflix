# MisioFlix Native v0.4.58.0 — edytor metadanych Jellyfina

Baza: v0.4.57.0 (Simkl + automatyczne oznaczanie, backup, ramki).

- `details.js`: przy kliknięciu natywnej pozycji **Edytuj metadane** / **Edit metadata** Jellyfin ma pierwszeństwo. Gdy po 950 ms nie zmieniła się trasa ani nie pojawiło nowe widoczne okno dialogowe, uruchamiamy własną nawigację do **oryginalnego edytora Jellyfin**, nie implementujemy nowego formularza i nie zapisujemy danych samodzielnie.
- Priorytet ma `Dashboard.navigate('edititemmetadata.html?id=...')`, jeżeli Jellyfin udostępnia API. Alternatywnie następuje nawigacja do starszej trasy `#!/edititemmetadata.html?id=...`.
- Pozostałe pozycje menu, MAL, Simkl, odtwarzanie i CSS pozostały bez zmian.

**Granice testu:** dostępny jest kod źródłowy, ale nie działająca instalacja Jellyfin 12.4. Nie potwierdzono obsługi starej trasy przez konkretny wariant routera w Jellyfin użytkownika. Gdyby edytor nadal nie ruszył, trzeba sprawdzić w DevTools błąd z konsoli po kliknięciu, żeby ustalić dokładną trasę tego wydania.
