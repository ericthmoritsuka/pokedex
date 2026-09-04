import { spriteUrl, typeIconUrl, isSelectable } from "./api.js";

const infoBody = document.querySelector(".infoBody");
const placeholder = infoBody.querySelector(".placeholder");
const details = infoBody.querySelector(".details");

const elements = {
  name: details.querySelector(".name"),
  genus: details.querySelector(".genus"),
  number: details.querySelector(".number"),
  types: details.querySelector(".types"),
  image: details.querySelector(".image"),
  shinyButton: details.querySelector(".shinyBtn"),
  cryButton: details.querySelector(".cryBtn"),
  panels: Object.fromEntries(
    [...details.querySelectorAll(".tabPanel")].map((panel) => [
      panel.dataset.panel,
      panel,
    ])
  ),
};

let current = null; // { pokemon, species, stages }
let showingShiny = false;
let onSelect = () => {};

const MAX_BASE_STAT = 200;

const renderAbout = ({ pokemon, species }) => {
  const abilities = pokemon.abilities
    .map((a) => `${a.name}${a.hidden ? " (hidden)" : ""}`)
    .join(", ");

  elements.panels.about.innerHTML = `
    ${species.flavor ? `<p class="flavor">${species.flavor}</p>` : ""}
    <ul class="infoList">
      <li><strong>Height</strong><span>${pokemon.height} m</span></li>
      <li><strong>Weight</strong><span>${pokemon.weight} kg</span></li>
      <li><strong>Abilities</strong><span class="cap">${abilities}</span></li>
    </ul>`;
};

const renderStats = ({ pokemon }) => {
  elements.panels.stats.innerHTML = `
    <ul class="status">
      ${pokemon.stats
        .map(
          (stat) => `<li class="statRow">
            <span>${stat.label}</span>
            <span class="statValue">${stat.value}</span>
            <div class="statBar"><div style="width:${Math.min(
              100,
              (stat.value / MAX_BASE_STAT) * 100
            )}%"></div></div>
          </li>`
        )
        .join("")}
      <li class="statRow total"><span>TOTAL</span><span class="statValue">${
        pokemon.statsTotal
      }</span><div></div></li>
    </ul>`;
};

const renderMoves = ({ pokemon }) => {
  elements.panels.moves.innerHTML = `
    <ul class="moves">
      ${pokemon.moves
        .map(
          (move) =>
            `<li>${move.level ? `<span class="lvl">Lv ${move.level}</span>` : ""}${move.name}</li>`
        )
        .join("")}
    </ul>`;
};

const renderEvolution = ({ stages }) => {
  if (stages.length < 2) {
    elements.panels.evolution.innerHTML = `<p class="flavor">This Pokémon does not evolve.</p>`;
    return;
  }

  elements.panels.evolution.innerHTML = `
    <div class="evoChain">
      ${stages
        .map(
          (stage) => `<div class="evoStage">
            ${stage
              .map((entry) =>
                isSelectable(entry.id)
                  ? `<button class="evoItem" data-id="${entry.id}">
                      <img src="${spriteUrl(entry.id)}" alt="${entry.name}" loading="lazy">
                      <span>${entry.name}</span>
                    </button>`
                  : `<div class="evoItem"><span>${entry.name}</span></div>`
              )
              .join("")}
          </div>`
        )
        .join(`<span class="evoArrow">→</span>`)}
    </div>`;
};

const renderMore = ({ pokemon, species }) => {
  const rows = [
    species.isLegendary ? `<li><strong>Status</strong><span>Legendary</span></li>` : "",
    species.isMythical ? `<li><strong>Status</strong><span>Mythical</span></li>` : "",
    `<li><strong>Base exp.</strong><span>${pokemon.baseExperience ?? "?"}</span></li>`,
    `<li><strong>Capture rate</strong><span>${species.captureRate} / 255</span></li>`,
    `<li><strong>Growth</strong><span class="cap">${species.growthRate}</span></li>`,
    `<li><strong>Egg groups</strong><span class="cap">${species.eggGroups.join(", ") || "?"}</span></li>`,
    `<li><strong>Gender</strong><span>${
      species.femaleRate === null
        ? "genderless"
        : `${100 - species.femaleRate}% ♂ / ${species.femaleRate}% ♀`
    }</span></li>`,
    species.habitat ? `<li><strong>Habitat</strong><span class="cap">${species.habitat}</span></li>` : "",
  ];
  elements.panels.more.innerHTML = `<ul class="infoList">${rows.join("")}</ul>`;
};

const setArtwork = () => {
  const { pokemon } = current;
  elements.image.classList.remove("animation");
  void elements.image.offsetWidth;
  elements.image.classList.add("animation");
  elements.image.src =
    showingShiny && pokemon.shinyImage ? pokemon.shinyImage : pokemon.image;
  elements.image.alt = pokemon.name;
  elements.shinyButton.classList.toggle("active", showingShiny);
  elements.shinyButton.hidden = !pokemon.shinyImage;
  elements.cryButton.hidden = !pokemon.cry;
};

export const setLoading = (isLoading) => {
  infoBody.classList.toggle("loading", isLoading);
};

export const showMessage = (message) => {
  placeholder.innerText = message;
  placeholder.hidden = false;
  details.hidden = true;
};

export const renderDetails = (pokemon, species, stages) => {
  current = { pokemon, species, stages };
  showingShiny = false;

  details.className = `details ${pokemon.types[0]}`;
  placeholder.hidden = true;
  details.hidden = false;

  elements.name.innerText = pokemon.name;
  elements.genus.innerText = species.genus || "";
  elements.number.innerText = `#${pokemon.id}`;
  elements.types.innerHTML = pokemon.types
    .map((type) => {
      const icon = typeIconUrl(type);
      return icon
        ? `<img class="typeIcon" src="${icon}" alt="${type}" title="${type}">`
        : `<p class="type">${type}</p>`;
    })
    .join("");

  setArtwork();
  renderAbout(current);
  renderStats(current);
  renderMoves(current);
  renderEvolution(current);
  renderMore(current);
};

export const initDetails = (selectHandler) => {
  onSelect = selectHandler;
};

// Tabs
details.querySelector(".tabs").addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (!tab) return;

  details.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button === tab);
  });
  Object.entries(elements.panels).forEach(([name, panel]) => {
    panel.hidden = name !== tab.dataset.tab;
  });

  // On small screens the panel sits below the fold; bring it into view.
  tab.scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.shinyButton.addEventListener("click", () => {
  if (!current) return;
  showingShiny = !showingShiny;
  setArtwork();
});

elements.cryButton.addEventListener("click", () => {
  if (!current?.pokemon.cry) return;
  const audio = new Audio(current.pokemon.cry);
  audio.volume = 0.4;
  audio.play().catch(() => {});
});

// Evolution chain clicks load that pokemon
elements.panels.evolution.addEventListener("click", (event) => {
  const item = event.target.closest(".evoItem[data-id]");
  if (item) onSelect(Number(item.dataset.id));
});
