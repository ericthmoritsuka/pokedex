import { getPokemonList, spriteUrl } from "./api.js";
import { isAllowed, onGenChange } from "./gens.js";

// A compact searchable pokemon strip: type to filter, click a sprite to pick.
export const createPicker = (root, onPick) => {
  const input = root.querySelector(".pickerInput");
  const results = root.querySelector(".pickerResults");
  let list = [];

  const render = () => {
    const query = input.value
      .trim()
      .toLowerCase()
      .replaceAll(" ", "-")
      .replace("#", "");
    const matches = list
      .filter(
        (pokemon) =>
          isAllowed(pokemon.id) &&
          (!query ||
            pokemon.name.includes(query) ||
            String(pokemon.id) === query)
      )
      .slice(0, 12);

    results.innerHTML = matches
      .map(
        (pokemon) => `<li>
          <button type="button" class="pickerItem" data-id="${pokemon.id}" title="#${pokemon.id} ${pokemon.name}">
            <img loading="lazy" width="44" height="44" src="${spriteUrl(pokemon.id)}" alt="${pokemon.name}">
          </button>
        </li>`
      )
      .join("");
  };

  getPokemonList()
    .then((pokemonList) => {
      list = pokemonList;
      render();
    })
    .catch(console.error);

  input.addEventListener("input", render);
  onGenChange(render);

  results.addEventListener("click", (event) => {
    const item = event.target.closest(".pickerItem");
    if (item) onPick(Number(item.dataset.id));
  });
};
