const API = "https://pokeapi.co/api/v2";
export const TOTAL_POKEMON = 1025;

export const spriteUrl = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

const TYPE_IDS = {
  normal: 1, fighting: 2, flying: 3, poison: 4, ground: 5, rock: 6,
  bug: 7, ghost: 8, steel: 9, fire: 10, water: 11, grass: 12,
  electric: 13, psychic: 14, ice: 15, dragon: 16, dark: 17, fairy: 18,
};

// Official type badge from Scarlet/Violet; null for types we don't know an id for.
export const typeIconUrl = (type) =>
  TYPE_IDS[type]
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/${TYPE_IDS[type]}.png`
    : null;

const STAT_LABELS = {
  hp: "HP",
  attack: "ATTACK",
  defense: "DEFENSE",
  "special-attack": "SP. ATTACK",
  "special-defense": "SP. DEFENSE",
  speed: "SPEED",
};

const pokemonCache = new Map();
const speciesCache = new Map();
const evolutionCache = new Map();

const fetchJSON = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status} (${url})`);
  return response.json();
};

const idFromUrl = (url) => Number(url.split("/").filter(Boolean).pop());

const cleanName = (name) => name.replaceAll("-", " ");

// Every move with where it's learned: per version group, by which method,
// and at what level. The details panel filters this by the selected game.
const pickMoves = (data) =>
  data.moves.map((entry) => ({
    name: cleanName(entry.move.name),
    versions: entry.version_group_details.map((detail) => ({
      group: detail.version_group.name,
      method: detail.move_learn_method.name,
      level: detail.level_learned_at,
    })),
  }));

// Reshape the raw API response into exactly what the UI needs.
const toPokemonViewModel = (data) => {
  const artwork = data.sprites.other["official-artwork"];
  const stats = data.stats.map((entry) => ({
    label: STAT_LABELS[entry.stat.name] ?? entry.stat.name.toUpperCase(),
    value: entry.base_stat,
  }));

  return {
    id: data.id,
    name: cleanName(data.name),
    types: data.types.map((entry) => entry.type.name),
    image: artwork.front_default || spriteUrl(data.id),
    shinyImage: artwork.front_shiny,
    cry: data.cries?.latest || data.cries?.legacy || null,
    height: data.height / 10, // decimeters -> meters
    weight: data.weight / 10, // hectograms -> kilograms
    baseExperience: data.base_experience,
    abilities: data.abilities.map((entry) => ({
      name: cleanName(entry.ability.name),
      hidden: entry.is_hidden,
    })),
    stats,
    statsTotal: stats.reduce((sum, stat) => sum + stat.value, 0),
    moves: pickMoves(data),
  };
};

const toSpeciesViewModel = (data) => {
  const flavorEntries = data.flavor_text_entries.filter(
    (entry) => entry.language.name === "en"
  );
  // Later entries come from newer games. (No Array.at: older phones lack it.)
  const lastEntry = flavorEntries[flavorEntries.length - 1];
  const flavor = lastEntry && lastEntry.flavor_text.replace(/[\n\f\r]/g, " ");
  const genus = data.genera.find((entry) => entry.language.name === "en")?.genus;

  return {
    id: data.id,
    flavor: flavor || null,
    genus: genus || null,
    varieties: data.varieties.map((entry) => ({
      name: entry.pokemon.name,
      isDefault: entry.is_default,
    })),
    captureRate: data.capture_rate,
    growthRate: cleanName(data.growth_rate.name),
    eggGroups: data.egg_groups.map((entry) => cleanName(entry.name)),
    femaleRate: data.gender_rate === -1 ? null : data.gender_rate * 12.5,
    habitat: data.habitat ? cleanName(data.habitat.name) : null,
    isLegendary: data.is_legendary,
    isMythical: data.is_mythical,
    evolutionChainUrl: data.evolution_chain?.url || null,
  };
};

// Flatten the chain tree into stages; a stage can hold several pokemon
// (e.g. Eevee's stage two holds every eeveelution).
const toEvolutionStages = (data) => {
  const stages = [];
  let current = [data.chain];
  while (current.length) {
    stages.push(
      current.map((node) => ({
        id: idFromUrl(node.species.url),
        name: cleanName(node.species.name),
      }))
    );
    current = current.flatMap((node) => node.evolves_to);
  }
  return stages;
};

export const isSelectable = (id) => id >= 1 && id <= TOTAL_POKEMON;

const pokedexCache = new Map();

// The species ids of one or more in-game pokedexes, merged and deduplicated.
export const getGamePokedexIds = async (dexNames) => {
  const lists = await Promise.all(
    dexNames.map((name) => {
      if (!pokedexCache.has(name)) {
        const promise = fetchJSON(`${API}/pokedex/${name}`).then((data) =>
          data.pokemon_entries.map((entry) =>
            idFromUrl(entry.pokemon_species.url)
          )
        );
        // A failed fetch must not poison the cache: allow a retry.
        promise.catch(() => pokedexCache.delete(name));
        pokedexCache.set(name, promise);
      }
      return pokedexCache.get(name);
    })
  );
  return [...new Set(lists.flat())].filter((id) => id <= TOTAL_POKEMON);
};

const typeRelationsCache = new Map();

const getTypeRelations = (typeName) => {
  if (!typeRelationsCache.has(typeName)) {
    typeRelationsCache.set(
      typeName,
      fetchJSON(`${API}/type/${typeName}`).then((data) => data.damage_relations)
    );
  }
  return typeRelationsCache.get(typeName);
};

// Defensive matchups for a type combination: which attacking types are
// super effective (weak), not very effective (resist), or useless (immune).
export const getDefenseMatchups = async (types) => {
  const relations = await Promise.all(types.map(getTypeRelations));

  const factors = {};
  for (const name of Object.keys(TYPE_IDS)) factors[name] = 1;
  for (const relation of relations) {
    for (const entry of relation.double_damage_from) factors[entry.name] *= 2;
    for (const entry of relation.half_damage_from) factors[entry.name] *= 0.5;
    for (const entry of relation.no_damage_from) factors[entry.name] = 0;
  }

  const weak = [];
  const resist = [];
  const immune = [];
  for (const [type, factor] of Object.entries(factors)) {
    if (factor === 0) immune.push({ type, factor });
    else if (factor > 1) weak.push({ type, factor });
    else if (factor < 1) resist.push({ type, factor });
  }
  weak.sort((a, b) => b.factor - a.factor);
  resist.sort((a, b) => a.factor - b.factor);
  return { weak, resist, immune };
};

let listPromise = null;

export const getPokemonList = () => {
  if (!listPromise) {
    listPromise = fetchJSON(`${API}/pokemon?limit=${TOTAL_POKEMON}`).then(
      ({ results }) =>
        results.map((pokemon) => ({
          id: idFromUrl(pokemon.url),
          name: pokemon.name,
        }))
    );
    // Allow a retry if the first fetch fails.
    listPromise.catch(() => {
      listPromise = null;
    });
  }
  return listPromise;
};

export const getPokemon = async (id) => {
  if (!pokemonCache.has(id)) {
    pokemonCache.set(id, toPokemonViewModel(await fetchJSON(`${API}/pokemon/${id}`)));
  }
  return pokemonCache.get(id);
};

export const getSpecies = async (id) => {
  if (!speciesCache.has(id)) {
    speciesCache.set(
      id,
      toSpeciesViewModel(await fetchJSON(`${API}/pokemon-species/${id}`))
    );
  }
  return speciesCache.get(id);
};

export const getEvolutionStages = async (url) => {
  if (!url) return [];
  if (!evolutionCache.has(url)) {
    evolutionCache.set(url, toEvolutionStages(await fetchJSON(url)));
  }
  return evolutionCache.get(url);
};
