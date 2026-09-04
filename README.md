# pokedex

A Pokédex covering all 1025 Pokémon, powered by [PokéAPI](https://pokeapi.co).
Try it live: https://ericthmoritsuka.github.io/pokedex/

- Opens like the real device — click the cover; the ✕ button folds it shut.
- Search by name or National Dex number; deep links like `#25` jump straight to a Pokémon.
- Tabs for description, stats, moves (with learn levels), the evolution chain, and breeding/misc data.
- Shiny artwork toggle and the Pokémon's actual cry.
- Data, sprites, and type icons come from PokéAPI and its sprite CDN, cached in memory.

## Running

Serve the folder with any static server, e.g.:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Credits

The Pokédex was designed and originally implemented by Eric Moritsuka. The recent
improvements — the PokéAPI integration, the openable device UI, and the extra info
tabs — were made with AI assistance. Pokémon data and images from
[PokéAPI](https://pokeapi.co); Pokémon and Pokémon character names are trademarks
of Nintendo.
