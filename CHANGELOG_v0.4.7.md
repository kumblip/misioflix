# MisioFlix Native 0.4.7.0 — original Jellyfin UI first

- Removed second home UI, route handling, cloned poster cards and full catalogue fetch.
- Original Jellyfin Web controls all pages, navigation, sorting, search and playback.
- CSS changes existing card/header/background appearance (Modern + Legacy targets).
- Small JS reads existing playback indicators (only) for three status outlines.
- Kept C# integration intact to support future incremental NFO/MAL extensions.
- Reduced regression tests to the new architecture; older overlay-specific tests are obsolete.
- Known limitations: NFO advanced search, MAL account page, personal rating paw panel and full-library random shuffle are not surfaced in v0.4.7.
