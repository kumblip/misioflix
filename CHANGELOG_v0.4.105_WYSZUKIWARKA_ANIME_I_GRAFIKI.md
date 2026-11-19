# MisioFlix v0.4.105.0 — odświeżanie wyszukiwarki, AnimePL/AnimeEN, PNG i diagnostyka

Bazą są pełne źródła **v0.4.104.0**. Oryginalny sposób wersjonowania i publikacji w GitHub Actions pozostał bez zmian.

## 1. Wyszukiwarka: ręczne „Odśwież dane”
- Ręczne odświeżenie odtwarza zaznaczone gatunki (wymagane i wykluczone), wpisaną frazę, stan obejrzenia, biblioteki, typy, wybór sezonów, przełącznik lektora, liczbę wyświetlonych kart i przewinięcie.
- Jeśli jakiś gatunek zniknie z aktualnego katalogu, pozostaje widoczny z liczbą 0; wcześniej ustawiony filtr nie zostaje po cichu wyłączony.
- Odświeżenie nadal pobiera pełny, uprawniony katalog. **Nie zmieniano** API na strumieniowanie, paginacji serwera ani istniejącego ładowania kolejnych 30 kafelków w interfejsie.

## 2. Dwie fizyczne lokalizacje anime
- Obecny `AnimeRoot` = `/media/raid/animelektor` (bez zmian) — AnimePL, polski lektor.
- Nowy opcjonalny `AnimeOriginalRoot` = `/media/raid/anime` — docelowa biblioteka AnimeEN, oryginalne audio i napisy angielskie. Nazwa folderu to **`anime`**, nie `AnimeEN`.
- Oba katalogi nadal używają dokładnie tego samego parsera NFO i integracji MAL; Simkl jest wykluczony także dla nowego katalogu.
- W wyszukiwarce anime pole **„Lektor (AnimePL)”** jest domyślnie zaznaczone. Zaznaczone: wyniki tylko z `animelektor`; odznaczone: wyniki tylko z `anime`.
- Wyszukiwarka filmów i seriali działa bez tego filtra. Nazwy biblioteki w Jellyfin mogą być różne, ale w celu ich ujęcia w wyszukiwarce anime muszą zawierać słowo `anime`.
- Nie analizujemy plików wideo, by rozpoznać ścieżkę dźwiękową. Wyboru dokonuje się na podstawie fizycznego położenia wpisu.
- Schemat cache wyszukiwarki podniesiono z v1 do v2, żeby stare dane bez `anime_source` nie maskowały nowej biblioteki. Po aktualizacji pierwszy odczyt katalogu musi zostać wykonany ponownie jeden raz.

## 3. Numer wersji w `/MisioFlix/api/health`
- Zamiast wartości `0.4.30` na sztywno endpoint pobiera wersję z faktycznie załadowanego assembly DLL.
- Wersja pokazywana przez natywny panel Jellyfin już wcześniej była poprawna; nie zmieniano tego mechanizmu.

## 4. Bezstratna kompresja obrazów
- `logo.png`: 1 404 353 B → 995 849 B (oszczędność 408 504 B, ok. 29,1%). Dekodowane piksele RGBA pozostają identyczne.
- `mark.png`: 499 044 B — wynik bezstratnej rekompresji nie był mniejszy; oryginał zachowany bez zmian.
- `background.png`: bez zmian.

## 5. Bez zmian
MAL, Simkl, zabezpieczenia tagu Anime, odtwarzanie, NFO, kolekcje, historia, resume, oryginalne workflow, CSS innych sekcji i automatyczne numerowanie wydań.

## 6. Testy
- 464 testy Python — PASS.
- 47 testów Node.js — PASS.
- Dodatkowe testy filtrowania dwóch katalogów i ręcznego odświeżenia.
- .NET 10 i test na działającym NAS/Jellyfin — NIE WYKONANO w środowisku przygotowania źródeł.
