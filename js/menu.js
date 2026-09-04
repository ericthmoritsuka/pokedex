import { spriteUrl } from "./api.js";

const menu = document.querySelector(".menu");
const items = new Map();

export const buildMenu = (pokemonList, onSelect) => {
  const fragment = document.createDocumentFragment();

  for (const pokemon of pokemonList) {
    const item = document.createElement("li");
    item.dataset.id = pokemon.id;
    item.dataset.name = pokemon.name;
    item.innerHTML = `<a class="thumb" href="#" title="#${pokemon.id} ${pokemon.name}">
      <img loading="lazy" width="70" height="70" src="${spriteUrl(pokemon.id)}" alt="${pokemon.name}">
    </a>`;
    items.set(pokemon.id, item);
    fragment.append(item);
  }

  menu.replaceChildren(fragment);

  menu.addEventListener("click", (event) => {
    const thumb = event.target.closest(".thumb");
    if (!thumb) return;
    event.preventDefault();
    onSelect(Number(thumb.closest("li").dataset.id));
  });
};

export const setActive = (id) => {
  menu.querySelector("img.ativo")?.classList.remove("ativo");
  items.get(id)?.querySelector("img").classList.add("ativo");
};

export const filterMenu = (term) => {
  // Names in the API use dashes ("mr-mime"), so let "mr mime" match too.
  const query = term.trim().toLowerCase().replaceAll(" ", "-").replace("#", "");
  let visible = 0;

  for (const item of items.values()) {
    item.hidden =
      Boolean(query) &&
      !item.dataset.name.includes(query) &&
      item.dataset.id !== query;
    if (!item.hidden) visible++;
  }

  return visible;
};

export const firstVisibleId = () => {
  for (const [id, item] of items) {
    if (!item.hidden) return id;
  }
  return null;
};
