import {
  getPokemonList,
  getPokemon,
  getSpecies,
  getEvolutionStages,
  TOTAL_POKEMON,
} from "./api.js";
import { buildMenu, setActive, filterMenu, firstVisibleId } from "./menu.js";
import {
  initDetails,
  renderDetails,
  setLoading,
  showMessage,
} from "./details.js";
import { enterQuiz } from "./quiz.js";
import { renderTeam, toggleTeamMember } from "./team.js";
import { addToCompare } from "./compare.js";

const pokedex = document.querySelector(".pokedex");
const cover = document.querySelector(".cover");
const searchInput = document.querySelector("#search");
const noResults = document.querySelector(".noResults");
const appMenu = document.querySelector(".appMenu");

const openPokedex = () => pokedex.classList.remove("closed");
const closePokedex = () => pokedex.classList.add("closed");

// ---------- App modes: the right screen hosts several "apps" ----------

const bodies = {
  dex: document.querySelector(".infoBody"),
  quiz: document.querySelector(".quizBody"),
  team: document.querySelector(".teamBody"),
  compare: document.querySelector(".compareBody"),
};

let mode = "dex";

const setMode = (next) => {
  mode = next;
  appMenu.querySelectorAll(".appBtn[data-app]").forEach((button) => {
    button.classList.toggle("active", button.dataset.app === next);
  });
  Object.entries(bodies).forEach(([name, body]) => {
    body.hidden = name !== next;
  });
  if (next === "quiz") enterQuiz();
  if (next === "team") renderTeam();
};

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

// What a click in the list does depends on the active app.
const handleListClick = (id) => {
  if (mode === "team") {
    toggleTeamMember(id);
  } else if (mode === "compare") {
    addToCompare(id);
  } else {
    if (mode !== "dex") setMode("dex");
    selectPokemon(id);
  }
};

const init = async () => {
  initDetails(selectPokemon);

  try {
    buildMenu(await getPokemonList(), handleListClick);
  } catch (error) {
    noResults.innerText = "Could not reach PokéAPI";
    noResults.hidden = false;
    console.error(error);
  }

  // Deep link: opening the site with #25 goes straight to that pokemon.
  const id = Number(location.hash.replace("#", ""));
  if (id) {
    openPokedex();
    selectPokemon(id);
  }
};

cover.addEventListener("click", openPokedex);
document.querySelector(".closeDex").addEventListener("click", closePokedex);
document.addEventListener("keydown", (event) => {
  // Escape inside an input just leaves the input alone (it may also be
  // dismissing a password manager popup) — only close from outside one.
  if (event.key === "Escape" && event.target.tagName !== "INPUT") {
    closePokedex();
  }
});

appMenu.addEventListener("click", (event) => {
  const button = event.target.closest(".appBtn");
  if (!button) return;

  if (button.classList.contains("randomBtn")) {
    button.classList.remove("shake");
    void button.offsetWidth;
    button.classList.add("shake");
    setMode("dex");
    selectPokemon(1 + Math.floor(Math.random() * TOTAL_POKEMON));
    return;
  }
  setMode(button.dataset.app);
});

searchInput.addEventListener("input", (event) => {
  noResults.hidden = filterMenu(event.target.value) > 0;
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const id = firstVisibleId();
  if (id) handleListClick(id);
});

init();
