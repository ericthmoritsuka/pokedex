import { getPokemonList, getPokemon } from "./api.js";
import { buildMenu, setActive, filterMenu } from "./menu.js";
import { renderCard, setLoading, showMessage } from "./card.js";

// Guards against out-of-order responses: only the most recent click may render.
let latestRequest = 0;

const selectPokemon = async (id) => {
  const request = ++latestRequest;
  setActive(id);
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
    selectPokemon(1);
  } catch (error) {
    showMessage("Could not reach PokéAPI");
    console.error(error);
  }
};

document.querySelector("#search").addEventListener("input", (event) => {
  filterMenu(event.target.value);
});

init();
