// Generation filter shared by every app: the pokedex list, the quiz pool,
// the random button, the pickers, and the name-them-all game.

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

const STORAGE_KEY = "pokedex.gens";

// Empty selection means "all generations".
let selected = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));

const listeners = [];

export const onGenChange = (listener) => listeners.push(listener);

const save = () =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));

export const selectedGenerations = () =>
  selected.size
    ? GENERATIONS.filter((gen) => selected.has(gen.key))
    : GENERATIONS;

export const isAllowed = (id) =>
  selectedGenerations().some((gen) => id >= gen.from && id <= gen.to);

export const randomAllowedId = () => {
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

export const selectionLabel = () =>
  selected.size
    ? selectedGenerations().map((gen) => gen.label).join(", ")
    : "all generations";

export const initGenBar = () => {
  const bar = document.querySelector(".genTabs");

  const render = () => {
    bar.innerHTML = [
      `<button class="genTab helpBtn" data-help="#helpGens" title="What is this?">?</button>`,
      `<button class="genTab ${selected.size === 0 ? "active" : ""}" data-gen="all">All</button>`,
      ...GENERATIONS.map(
        (gen) =>
          `<button class="genTab ${selected.has(gen.key) ? "active" : ""}" data-gen="${gen.key}">${gen.label}</button>`
      ),
    ].join("");
  };

  bar.addEventListener("click", (event) => {
    const tab = event.target.closest(".genTab");
    if (!tab || !tab.dataset.gen) return;

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
    listeners.forEach((listener) => listener());
  });

  render();
};
