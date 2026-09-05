import {
  getPokemonList,
  getPokemon,
  getSpecies,
  getEvolutionStages,
  getDefenseMatchups,
} from "./api.js";
import { initGenBar, onGenChange, randomAllowedId } from "./gens.js";
import { buildMenu, setActive, filterMenu, firstVisibleId } from "./menu.js";
import {
  initDetails,
  renderDetails,
  setLoading,
  showMessage,
  clearDetails,
  shownPokemonId,
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
let selectedId = null;

const selectPokemon = async (id) => {
  const request = ++latestRequest;
  selectedId = id;
  setActive(id);
  setLoading(true);

  try {
    const [pokemon, species] = await Promise.all([
      getPokemon(id),
      getSpecies(id),
    ]);
    const [stages, matchups] = await Promise.all([
      getEvolutionStages(species.evolutionChainUrl),
      getDefenseMatchups(pokemon.types),
    ]);
    if (request !== latestRequest) return;
    renderDetails(pokemon, species, stages, matchups);
  } catch (error) {
    if (request === latestRequest) {
      showMessage("Failed to load. Try again!");
      // Allow the next click on the same pokemon to retry, not deselect.
      selectedId = null;
      setActive(null);
    }
    console.error(error);
  } finally {
    if (request === latestRequest) setLoading(false);
  }
};

const refreshList = () => {
  // After a fatal API failure the banner shows the error, not match counts.
  if (noResults.dataset.error) return;
  noResults.hidden = filterMenu(searchInput.value) > 0;
};

// Clicking the already-selected pokemon in the list deselects it — but if
// the card is showing one of its variants, restore the base form instead.
const handleListClick = (id) => {
  if (id === selectedId && shownPokemonId() === id) {
    selectedId = null;
    latestRequest++; // ignore any in-flight fetch for the old selection
    setActive(null);
    clearDetails();
    setLoading(false);
    return;
  }
  selectPokemon(id);
};

const init = async () => {
  initGenBar();
  initDetails(selectPokemon);

  try {
    buildMenu(await getPokemonList(), handleListClick);
    refreshList();
  } catch (error) {
    noResults.innerText = "Could not reach PokéAPI — reload to retry";
    noResults.dataset.error = "1";
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

searchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const id = firstVisibleId();
  if (id) selectPokemon(id);
});

init();
