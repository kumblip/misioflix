# MisioFlix Native v0.4.76.0 — wdrożenie

1. Wgraj zawartość pełnego ZIP-a do repozytorium `kumblip/misioflix` **z zachowaniem struktury katalogów**, zastępując starsze pliki.
2. Uruchom istniejący GitHub Actions `build`/`release` — numer wersji pochodzi z `meta.json` i jest spójny z `.csproj`.
3. Po zielonej kompilacji opublikuj wersję 0.4.76.0 i zaktualizuj wtyczkę Jellyfin; zrestartuj kontener, a następnie odśwież pamięć przeglądarki.
4. Sprawdź długi tytuł w szczegółach; wpisz `ari` w obu wyszukiwarkach i przewiń listę 18 podpowiedzi; sprawdź filtr „Obejrzane” z podłączonym MAL oraz po odłączeniu, gdy kopia `current.json` już istnieje.

**Uwaga:** po całkowitym odłączeniu i braku lokalnego archiwum używany jest status Jellyfin. Zapisana kopia MAL jest wyłącznie odczytywana. Jeśli danemu użytkownikowi przypisano w przeszłości wiele różnych kont MAL, bez aktywnego powiązania wtyczka nie zgaduje, którego archiwum użyć.

Paczka zawiera **źródła do GitHub Actions**, nie instalacyjny plik DLL. Testy: 361 Python + 27 Node.js (przeszły); DLL i NAS nie zostały przetestowane w tej sesji.
