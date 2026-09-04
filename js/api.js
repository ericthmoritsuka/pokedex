const API = "https://pokeapi.co/api/v2";
const TOTAL_POKEMON = 1025;

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

// Level-up moves sorted by learn level; falls back to the first moves of any
// kind for pokemon with no level-up data.
const pickMoves = (data) => {
  const byLevel = [];
  for (const entry of data.moves) {
    const levels = entry.version_group_details
      .filter((detail) => detail.move_learn_method.name === "level-up")
      .map((detail) => detail.level_learned_at);
    if (levels.length) {
      byLevel.push({ name: cleanName(entry.move.name), level: Math.min(...levels) });
    }
  }
  byLevel.sort((a, b) => a.level - b.level);

  if (!byLevel.length) {
    return data.moves
      .slice(0, 12)
      .map((entry) => ({ name: cleanName(entry.move.name), level: null }));
  }
  return byLevel.slice(0, 12);
};

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
  // Later entries come from newer games.
  const flavor = flavorEntries.at(-1)?.flavor_text.replaceAll(/[\n\f\r]/g, " ");
  const genus = data.genera.find((entry) => entry.language.name === "en")?.genus;

  return {
    flavor: flavor || null,
    genus: genus || null,
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

export const getPokemonList = async () => {
  const { results } = await fetchJSON(`${API}/pokemon?limit=${TOTAL_POKEMON}`);
  return results.map((pokemon) => ({
    id: idFromUrl(pokemon.url),
    name: pokemon.name,
  }));
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
