import { getPokemonList, getPokemon } from "./api.js";
import { buildMenu, setActive, filterMenu, firstVisibleId } from "./menu.js";
import {
  renderCard,
  openCard,
  setLoading,
  showMessage,
} from "./card.js";

const searchInput = document.querySelector("#search");
const noResults = document.querySelector(".noResults");

// Guards against out-of-order responses: only the most recent click may render.
let latestRequest = 0;

const selectPokemon = async (id) => {
  const request = ++latestRequest;
  setActive(id);
  openCard();
  setLoading(true);

  try {
    const pokemon = await getPokemon(id);
    if (request !== latestRequest) return;
    renderCard(pokemon);
  } catch (error) {
    if (request === latestRequest) showMessage("Failed to load");
    console.error(error);
  } finally {
    if (request === latestRequest) setLoading(false);
  }
};

const init = async () => {
  try {
    buildMenu(await getPokemonList(), selectPokemon);
  } catch (error) {
    noResults.innerText = "Could not reach PokéAPI";
    noResults.hidden = false;
    console.error(error);
  }
};

searchInput.addEventListener("input", (event) => {
  noResults.hidden = filterMenu(event.target.value) > 0;
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const id = firstVisibleId();
  if (id) selectPokemon(id);
});

init();
