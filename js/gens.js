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
// accent: the games' iconic cover colors, shown as a strip on the pill.
export const GAMES = [
  { key: "rby", groups: ["red-blue", "yellow"], label: "Red/Blue/Yellow", dexes: ["kanto"],
    accent: "linear-gradient(90deg,#d5321e 0 33%,#2358a8 33% 66%,#f2c50f 66%)" },
  { key: "gsc", groups: ["gold-silver", "crystal"], label: "Gold/Silver/Crystal", dexes: ["original-johto"],
    accent: "linear-gradient(90deg,#b69e31 0 33%,#9b9ba5 33% 66%,#77c5e0 66%)" },
  { key: "rse", groups: ["ruby-sapphire", "emerald"], label: "Ruby/Sapphire/Emerald", dexes: ["hoenn"],
    accent: "linear-gradient(90deg,#c72c3b 0 33%,#1362b0 33% 66%,#009e60 66%)" },
  { key: "dp", groups: ["diamond-pearl"], label: "Diamond/Pearl", dexes: ["original-sinnoh"],
    accent: "linear-gradient(90deg,#86b6e2 0 50%,#e2b3c4 50%)" },
  { key: "plat", groups: ["platinum"], label: "Platinum", dexes: ["extended-sinnoh"],
    accent: "linear-gradient(90deg,#8f8f9d,#c6c6cf)" },
  { key: "hgss", groups: ["heartgold-soulsilver"], label: "HeartGold/SoulSilver", dexes: ["updated-johto"],
    accent: "linear-gradient(90deg,#d4af37 0 50%,#a8a8b8 50%)" },
  { key: "bw", groups: ["black-white"], label: "Black/White", dexes: ["original-unova"],
    accent: "linear-gradient(90deg,#3a3a3a 0 50%,#e8e8e8 50%)" },
  { key: "b2w2", groups: ["black-2-white-2"], label: "Black 2/White 2", dexes: ["updated-unova"],
    accent: "linear-gradient(90deg,#2b2b2b 0 50%,#cfd6db 50%)" },
  { key: "xy", groups: ["x-y"], label: "X/Y", dexes: ["kalos-central", "kalos-coastal", "kalos-mountain"],
    accent: "linear-gradient(90deg,#025da6 0 50%,#ea1a3e 50%)" },
  { key: "oras", groups: ["omega-ruby-alpha-sapphire"], label: "Omega Ruby/Alpha Sapphire", dexes: ["updated-hoenn"],
    accent: "linear-gradient(90deg,#ab2813 0 50%,#26649c 50%)" },
  { key: "sm", groups: ["sun-moon"], label: "Sun/Moon", dexes: ["original-alola"],
    accent: "linear-gradient(90deg,#f5991b 0 50%,#4a5fc1 50%)" },
  { key: "usum", groups: ["ultra-sun-ultra-moon"], label: "Ultra Sun/Ultra Moon", dexes: ["updated-alola"],
    accent: "linear-gradient(90deg,#e8590c 0 50%,#6b2d8b 50%)" },
  { key: "letsgo", groups: ["lets-go-pikachu-lets-go-eevee"], label: "Let's Go", dexes: ["letsgo-kanto"],
    accent: "linear-gradient(90deg,#f5c518 0 50%,#b47448 50%)" },
  { key: "swsh", groups: ["sword-shield"], label: "Sword/Shield", dexes: ["galar", "isle-of-armor", "crown-tundra"],
    accent: "linear-gradient(90deg,#00a1e8 0 50%,#e70059 50%)" },
  { key: "pla", groups: ["legends-arceus"], label: "Legends: Arceus", dexes: ["hisui"],
    accent: "linear-gradient(90deg,#b39b4d 0 50%,#3f5d58 50%)" },
  { key: "sv", groups: ["scarlet-violet"], label: "Scarlet/Violet", dexes: ["paldea", "kitakami", "blueberry"],
    accent: "linear-gradient(90deg,#d13425 0 50%,#8334b5 50%)" },
];

// The best-known version exclusives per game pill (families and mascots).
// PokéAPI has no exclusives data, so this is curated by hand; ids are
// national dex numbers.
const EXCLUSIVES = {
  rby: [
    { label: "Red", color: "#e06a5a", ids: [23, 24, 43, 44, 45, 56, 57, 58, 59, 123, 125] },
    { label: "Blue", color: "#6f9bd8", ids: [27, 28, 37, 38, 52, 53, 69, 70, 71, 126, 127] },
  ],
  gsc: [
    { label: "Gold", color: "#d8c06a", ids: [58, 59, 167, 168, 207, 216, 217, 226] },
    { label: "Silver", color: "#c0c0cc", ids: [37, 38, 165, 166, 225, 227, 231, 232] },
  ],
  rse: [
    { label: "Ruby", color: "#e06a75", ids: [273, 274, 275, 303, 335, 338, 383] },
    { label: "Sapphire", color: "#6f8fd8", ids: [270, 271, 272, 302, 336, 337, 382] },
  ],
  dp: [
    { label: "Diamond", color: "#a9cbe8", ids: [198, 408, 409, 430, 434, 435, 483] },
    { label: "Pearl", color: "#eec3d3", ids: [200, 410, 411, 429, 431, 432, 484] },
  ],
  hgss: [
    { label: "HeartGold", color: "#d8c06a", ids: [58, 59, 167, 168, 207, 216, 217, 226] },
    { label: "SoulSilver", color: "#c0c0cc", ids: [37, 38, 165, 166, 225, 227, 231, 232] },
  ],
  bw: [
    { label: "Black", color: "#8f8f8f", ids: [546, 547, 574, 575, 576, 643] },
    { label: "White", color: "#f2f2f2", ids: [548, 549, 577, 578, 579, 644] },
  ],
  xy: [
    { label: "X", color: "#7ba7d4", ids: [684, 685, 692, 693, 716] },
    { label: "Y", color: "#e58a97", ids: [682, 683, 690, 691, 717] },
  ],
  oras: [
    { label: "Omega Ruby", color: "#e06a75", ids: [273, 274, 275, 303, 335, 338, 383] },
    { label: "Alpha Sapphire", color: "#6f8fd8", ids: [270, 271, 272, 302, 336, 337, 382] },
  ],
  sm: [
    { label: "Sun", color: "#f5b56a", ids: [27, 28, 766, 776, 791] },
    { label: "Moon", color: "#9aa5e0", ids: [37, 38, 765, 780, 792] },
  ],
  usum: [
    { label: "Ultra Sun", color: "#f09b6a", ids: [27, 28, 766, 776, 791, 798, 806] },
    { label: "Ultra Moon", color: "#b28ad0", ids: [37, 38, 765, 780, 792, 797, 805] },
  ],
  letsgo: [
    { label: "Let's Go Pikachu", color: "#f5d76a", ids: [27, 28, 43, 44, 45, 58, 59] },
    { label: "Let's Go Eevee", color: "#cfa080", ids: [37, 38, 52, 53, 69, 70, 71] },
  ],
  swsh: [
    { label: "Sword", color: "#7ccbe8", ids: [83, 273, 274, 275, 554, 555, 633, 634, 635, 782, 783, 784, 865, 888] },
    { label: "Shield", color: "#ee85ab", ids: [77, 78, 222, 246, 247, 248, 270, 271, 272, 704, 705, 706, 864, 889] },
  ],
  sv: [
    { label: "Scarlet", color: "#e0806f", ids: [246, 247, 248, 434, 435, 936, 984, 985, 986, 987, 988, 989, 1005, 1007] },
    { label: "Violet", color: "#b48ad8", ids: [316, 317, 371, 372, 373, 937, 990, 991, 992, 993, 994, 995, 1006, 1008] },
  ],
};

// The selected game's version groups (for filtering move data), or null.
export const selectedVersionGroups = () => {
  const game = GAMES.find((entry) => entry.key === selectedGame);
  return game ? game.groups : null;
};

export const selectedGameLabel = () => {
  const game = GAMES.find((entry) => entry.key === selectedGame);
  return game ? game.label : null;
};

// Which version (if any) this pokemon is exclusive to in the selected game.
export const exclusiveFor = (id) => {
  const versions = selectedGame && EXCLUSIVES[selectedGame];
  if (!versions) return null;
  return versions.find((version) => version.ids.includes(id)) || null;
};

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
  const currentChip = document.querySelector(".filterCurrent");
  const toggles = document.querySelectorAll(".filterToggle");

  const currentLabel = () => {
    if (selectedGame) {
      const game = GAMES.find((entry) => entry.key === selectedGame);
      if (game) return game.label;
    }
    return selected.size
      ? selectedGenerations().map((gen) => gen.label).join(", ")
      : "All";
  };

  const render = () => {
    genBar.innerHTML = [
      `<button class="genTab ${!selectedGame && selected.size === 0 ? "active" : ""}" data-gen="all">All</button>`,
      ...GENERATIONS.map(
        (gen) =>
          `<button class="genTab ${!selectedGame && selected.has(gen.key) ? "active" : ""}" data-gen="${gen.key}">${gen.label}</button>`
      ),
    ].join("");

    gameBar.innerHTML = GAMES.map(
      (game) =>
        `<button class="genTab gameTab ${selectedGame === game.key ? "active" : ""}" data-game="${game.key}" style="--gc:${game.accent}">${game.label}</button>`
    ).join("");

    const filtered = selectedGame || selected.size > 0;
    currentChip.innerText = filtered ? `${currentLabel()} ✕` : "All";
    currentChip.classList.toggle("clearable", Boolean(filtered));
  };

  // Clicking the chip clears the active filter without opening the rows.
  currentChip.addEventListener("click", () => {
    if (!selectedGame && selected.size === 0) return;
    selectedGame = null;
    gameIds = null;
    gameSet = null;
    selected.clear();
    save();
    render();
    notify();
  });

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const target = document.querySelector(toggle.dataset.target);
      const willOpen = target.hidden;
      genBar.hidden = true;
      gameBar.hidden = true;
      toggles.forEach((button) => button.classList.remove("open"));
      if (willOpen) {
        target.hidden = false;
        toggle.classList.add("open");
      }
    });
  });

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
