const card = document.querySelector(".card");

const elements = {
  name: card.querySelector(".name"),
  number: card.querySelector(".number"),
  types: card.querySelector(".types"),
  image: card.querySelector(".image"),
  stats: card.querySelector(".status"),
  moves: card.querySelector(".moves"),
};

export const setLoading = (isLoading) => {
  card.classList.toggle("loading", isLoading);
};

export const showMessage = (message) => {
  elements.name.innerText = message;
};

export const renderCard = (pokemon) => {
  card.className = `card ${pokemon.types[0]}`;

  elements.name.innerText = pokemon.name;
  elements.number.innerText = `#${pokemon.id}`;
  elements.types.innerHTML = pokemon.types
    .map((type) => `<p class="type">${type}</p>`)
    .join("");

  elements.image.classList.remove("animation");
  void elements.image.offsetWidth;
  elements.image.classList.add("animation");
  elements.image.src = pokemon.image;
  elements.image.alt = pokemon.name;

  elements.stats.innerHTML = pokemon.stats
    .map((stat) => `<li>${stat.label} ${stat.value}</li>`)
    .join("");
  elements.moves.innerHTML = pokemon.moves
    .map((move) => `<li>${move}</li>`)
    .join("");
};
