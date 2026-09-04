// Generation and game filters shared by every app: the pokedex list, the
// quiz pool, the random button, the pickers, and the name-them-all game.
// Either some generations are selected (id ranges), or one game is selected
// (that game's actual regional pokedex, fetched from the API).

import { getGamePokedexIds } from "./api.js";

export const GENERATIONS = [
  { key: "kanto", label: "Kanto", from: 1, to: 151 },
  { key: "johto", label: "Johto", from: 152, to: 251 },
  { key: "hoenn", label: "Hoenn", from: 252, to: 386 },
  { key: "sinnoh", label: "Sinnoh", from: 387, to: 493 },
  { key: "unova", label: "Unova", from: 494, to: 649 },
  { key: "kalos", label: "Kalos", from: 650, to: 721 },
  { key: "alola", label: "Alola", from: 722, to: 809 },
  { key: "galar", label: "Galar", from: 810, to: 905 },
  { key: "paldea", label: "Paldea", from: 906, to: 1025 },
];

// Games that share a pokedex share a pill (Red/Blue/Yellow — FireRed and
// LeafGreen too; Gold/Silver/Crystal; and so on).
export const GAMES = [
  { key: "rby", label: "Red/Blue/Yellow", dexes: ["kanto"] },
  { key: "gsc", label: "Gold/Silver/Crystal", dexes: ["original-johto"] },
  { key: "rse", label: "Ruby/Sapphire/Emerald", dexes: ["hoenn"] },
  { key: "dp", label: "Diamond/Pearl", dexes: ["original-sinnoh"] },
  { key: "plat", label: "Platinum", dexes: ["extended-sinnoh"] },
  { key: "hgss", label: "HeartGold/SoulSilver", dexes: ["updated-johto"] },
  { key: "bw", label: "Black/White", dexes: ["original-unova"] },
  { key: "b2w2", label: "Black 2/White 2", dexes: ["updated-unova"] },
  { key: "xy", label: "X/Y", dexes: ["kalos-central", "kalos-coastal", "kalos-mountain"] },
  { key: "oras", label: "Omega Ruby/Alpha Sapphire", dexes: ["updated-hoenn"] },
  { key: "sm", label: "Sun/Moon", dexes: ["original-alola"] },
  { key: "usum", label: "Ultra Sun/Ultra Moon", dexes: ["updated-alola"] },
  { key: "letsgo", label: "Let's Go", dexes: ["letsgo-kanto"] },
  { key: "swsh", label: "Sword/Shield", dexes: ["galar", "isle-of-armor", "crown-tundra"] },
  { key: "pla", label: "Legends: Arceus", dexes: ["hisui"] },
  { key: "sv", label: "Scarlet/Violet", dexes: ["paldea", "kitakami", "blueberry"] },
];

const GENS_KEY = "pokedex.gens";
const GAME_KEY = "pokedex.game";

// Empty selection means "all generations".
let selected = new Set(JSON.parse(localStorage.getItem(GENS_KEY) || "[]"));
let selectedGame = localStorage.getItem(GAME_KEY) || null;
let gameIds = null; // number[] once the game's pokedex is loaded
let gameSet = null;

const listeners = [];

export const onGenChange = (listener) => listeners.push(listener);

const notify = () => listeners.forEach((listener) => listener());

const save = () => {
  localStorage.setItem(GENS_KEY, JSON.stringify([...selected]));
  if (selectedGame) localStorage.setItem(GAME_KEY, selectedGame);
  else localStorage.removeItem(GAME_KEY);
};

const loadGame = async (key) => {
  const game = GAMES.find((entry) => entry.key === key);
  if (!game) return;
  try {
    const ids = await getGamePokedexIds(game.dexes);
    if (selectedGame !== key) return; // the user moved on meanwhile
    gameIds = ids;
    gameSet = new Set(ids);
    notify();
  } catch (error) {
    console.error(error);
    if (selectedGame === key) {
      selectedGame = null;
      save();
      notify();
    }
  }
};

export const selectedGenerations = () =>
  selected.size
    ? GENERATIONS.filter((gen) => selected.has(gen.key))
    : GENERATIONS;

export const isAllowed = (id) => {
  if (selectedGame && gameSet) return gameSet.has(id);
  return selectedGenerations().some((gen) => id >= gen.from && id <= gen.to);
};

export const randomAllowedId = () => {
  if (selectedGame && gameIds && gameIds.length) {
    return gameIds[Math.floor(Math.random() * gameIds.length)];
  }
  const ranges = selectedGenerations();
  const total = ranges.reduce((sum, gen) => sum + (gen.to - gen.from + 1), 0);
  let n = Math.floor(Math.random() * total);
  for (const gen of ranges) {
    const size = gen.to - gen.from + 1;
    if (n < size) return gen.from + n;
    n -= size;
  }
  return 1;
};

export const selectionLabel = () => {
  if (selectedGame) {
    const game = GAMES.find((entry) => entry.key === selectedGame);
    if (game) return `Pokémon ${game.label}`;
  }
  return selected.size
    ? selectedGenerations().map((gen) => gen.label).join(", ")
    : "all generations";
};

export const initGenBar = () => {
  const genBar = document.querySelector(".genTabs");
  const gameBar = document.querySelector(".gameTabs");

  const render = () => {
    genBar.innerHTML = [
      `<button class="genTab helpBtn" data-help="#helpGens" title="What is this?">?</button>`,
      `<button class="genTab ${!selectedGame && selected.size === 0 ? "active" : ""}" data-gen="all">All</button>`,
      ...GENERATIONS.map(
        (gen) =>
          `<button class="genTab ${!selectedGame && selected.has(gen.key) ? "active" : ""}" data-gen="${gen.key}">${gen.label}</button>`
      ),
    ].join("");

    gameBar.innerHTML = GAMES.map(
      (game) =>
        `<button class="genTab gameTab ${selectedGame === game.key ? "active" : ""}" data-game="${game.key}">${game.label}</button>`
    ).join("");
  };

  genBar.addEventListener("click", (event) => {
    const tab = event.target.closest(".genTab");
    if (!tab || !tab.dataset.gen) return;

    selectedGame = null;
    gameIds = null;
    gameSet = null;

    if (tab.dataset.gen === "all") {
      selected.clear();
    } else if (selected.has(tab.dataset.gen)) {
      selected.delete(tab.dataset.gen);
    } else {
      selected.add(tab.dataset.gen);
      if (selected.size === GENERATIONS.length) selected.clear();
    }
    save();
    render();
    notify();
  });

  gameBar.addEventListener("click", (event) => {
    const tab = event.target.closest(".gameTab");
    if (!tab) return;

    if (selectedGame === tab.dataset.game) {
      // Clicking the active game turns the game filter off.
      selectedGame = null;
      gameIds = null;
      gameSet = null;
      save();
      render();
      notify();
      return;
    }

    selectedGame = tab.dataset.game;
    selected.clear();
    gameIds = null;
    gameSet = null;
    save();
    render();
    loadGame(selectedGame);
  });

  render();
  if (selectedGame) loadGame(selectedGame);
};
