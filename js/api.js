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

const cache = new Map();

const fetchJSON = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status} (${url})`);
  return response.json();
};

const idFromUrl = (url) => Number(url.split("/").filter(Boolean).pop());

// Reshape the raw API response into exactly what the card needs.
const toViewModel = (data) => {
  const stats = data.stats.map((entry) => ({
    label: STAT_LABELS[entry.stat.name] ?? entry.stat.name.toUpperCase(),
    value: entry.base_stat,
  }));
  stats.push({
    label: "TOTAL",
    value: data.stats.reduce((sum, entry) => sum + entry.base_stat, 0),
  });

  const levelUpMoves = data.moves.filter((entry) =>
    entry.version_group_details.some(
      (detail) => detail.move_learn_method.name === "level-up"
    )
  );
  const moves = (levelUpMoves.length ? levelUpMoves : data.moves)
    .slice(0, 4)
    .map((entry) => entry.move.name.replaceAll("-", " "));

  return {
    id: data.id,
    name: data.name.replaceAll("-", " "),
    types: data.types.map((entry) => entry.type.name),
    image:
      data.sprites.other["official-artwork"].front_default ||
      spriteUrl(data.id),
    stats,
    moves,
  };
};

export const getPokemonList = async () => {
  const { results } = await fetchJSON(`${API}/pokemon?limit=${TOTAL_POKEMON}`);
  return results.map((pokemon) => ({
    id: idFromUrl(pokemon.url),
    name: pokemon.name,
  }));
};

export const getPokemon = async (id) => {
  if (!cache.has(id)) {
    cache.set(id, toViewModel(await fetchJSON(`${API}/pokemon/${id}`)));
  }
  return cache.get(id);
};
