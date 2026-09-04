import {
  getPokemonList,
  getPokemon,
  getSpecies,
  getEvolutionStages,
} from "./api.js";
import { initGenBar, onGenChange, randomAllowedId } from "./gens.js";
import { buildMenu, setActive, filterMenu, firstVisibleId } from "./menu.js";
import {
  initDetails,
  renderDetails,
  setLoading,
  showMessage,
} from "./details.js";
import { enterQuiz } from "./quiz.js";
import { renderTeam } from "./team.js";
import { enterNameAll } from "./nameall.js";
import "./compare.js";

const pokedex = document.querySelector(".pokedex");
const rotom = document.querySelector(".rotom");
const cover = document.querySelector(".cover");
const deviceTabs = document.querySelector(".deviceTabs");
const appMenu = document.querySelector(".appMenu");
const diceButton = document.querySelector(".diceDex");
const searchInput = document.querySelector("#search");
const noResults = document.querySelector(".noResults");

const openPokedex = () => pokedex.classList.remove("closed");
const closePokedex = () => pokedex.classList.add("closed");

// ---------- Devices: the Pokédex and the Rotom apps ----------

const setDevice = (name) => {
  deviceTabs.querySelectorAll(".deviceTab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.device === name);
  });
  pokedex.hidden = name !== "pokedex";
  rotom.hidden = name !== "rotom";
  if (name === "rotom") enterApp(currentApp);
};

// ---------- Rotom apps ----------

const appBodies = {
  quiz: document.querySelector(".quizBody"),
  team: document.querySelector(".teamBody"),
  compare: document.querySelector(".compareBody"),
  nameall: document.querySelector(".nameallBody"),
};

let currentApp = "quiz";

const enterApp = (app) => {
  if (app === "quiz") enterQuiz();
  if (app === "team") renderTeam();
  if (app === "nameall") enterNameAll();
};

const setApp = (app) => {
  currentApp = app;
  appMenu.querySelectorAll(".appBtn").forEach((button) => {
    button.classList.toggle("active", button.dataset.app === app);
  });
  Object.entries(appBodies).forEach(([name, body]) => {
    body.hidden = name !== app;
  });
  enterApp(app);
};

// ---------- Pokédex ----------

// Guards against out-of-order responses: only the most recent click may render.
let latestRequest = 0;

const selectPokemon = async (id) => {
  const request = ++latestRequest;
  setActive(id);
  setLoading(true);

  try {
    const [pokemon, species] = await Promise.all([
      getPokemon(id),
      getSpecies(id),
    ]);
    const stages = await getEvolutionStages(species.evolutionChainUrl);
    if (request !== latestRequest) return;
    renderDetails(pokemon, species, stages);
  } catch (error) {
    if (request === latestRequest) showMessage("Failed to load. Try again!");
    console.error(error);
  } finally {
    if (request === latestRequest) setLoading(false);
  }
};

const refreshList = () => {
  noResults.hidden = filterMenu(searchInput.value) > 0;
};

const init = async () => {
  initGenBar();
  initDetails(selectPokemon);

  try {
    buildMenu(await getPokemonList(), selectPokemon);
    refreshList();
  } catch (error) {
    noResults.innerText = "Could not reach PokéAPI";
    noResults.hidden = false;
    console.error(error);
  }

  // Deep links: #rotom opens the apps device, #25 goes straight to that pokemon.
  if (location.hash === "#rotom") {
    setDevice("rotom");
    return;
  }
  const id = Number(location.hash.replace("#", ""));
  if (id) {
    openPokedex();
    selectPokemon(id);
  }
};

deviceTabs.addEventListener("click", (event) => {
  const tab = event.target.closest(".deviceTab");
  if (tab) setDevice(tab.dataset.device);
});

appMenu.addEventListener("click", (event) => {
  const button = event.target.closest(".appBtn");
  if (button) setApp(button.dataset.app);
});

cover.addEventListener("click", openPokedex);
document.querySelector(".closeDex").addEventListener("click", closePokedex);

diceButton.addEventListener("click", () => {
  diceButton.classList.remove("shake");
  void diceButton.offsetWidth;
  diceButton.classList.add("shake");
  selectPokemon(randomAllowedId());
});

document.addEventListener("keydown", (event) => {
  // Escape inside an input just leaves the input alone (it may also be
  // dismissing a password manager popup) — only close from outside one.
  if (event.key === "Escape" && event.target.tagName !== "INPUT") {
    closePokedex();
  }
});

searchInput.addEventListener("input", refreshList);
onGenChange(refreshList);

// "?" buttons toggle the help text they point at.
document.addEventListener("click", (event) => {
  const button = event.target.closest(".helpBtn");
  if (!button) return;
  const box = document.querySelector(button.dataset.help);
  if (box) box.hidden = !box.hidden;
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const id = firstVisibleId();
  if (id) selectPokemon(id);
});

init();
