import {
  getPokemonList,
  getPokemon,
  getSpecies,
  getEvolutionStages,
} from "./api.js";
import { buildMenu, setActive, filterMenu, firstVisibleId } from "./menu.js";
import {
  initDetails,
  renderDetails,
  setLoading,
  showMessage,
} from "./details.js";

const pokedex = document.querySelector(".pokedex");
const cover = document.querySelector(".cover");
const searchInput = document.querySelector("#search");
const noResults = document.querySelector(".noResults");

const openPokedex = () => pokedex.classList.remove("closed");

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

const init = async () => {
  initDetails(selectPokemon);

  try {
    buildMenu(await getPokemonList(), selectPokemon);
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

searchInput.addEventListener("input", (event) => {
  noResults.hidden = filterMenu(event.target.value) > 0;
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const id = firstVisibleId();
  if (id) selectPokemon(id);
});

init();
