# pokedex

A Pokédex covering all 1025 Pokémon, powered by [PokéAPI](https://pokeapi.co).

- Thumbnails and official artwork come from the PokéAPI sprite CDN.
- Stats, types, and moves are fetched on click and cached in memory.
- Search the list by name or National Dex number.

## Running

Serve the folder with any static server, e.g.:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.
