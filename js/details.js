import {
  spriteUrl,
  typeIconUrl,
  isSelectable,
  getPokemon,
  getDefenseMatchups,
} from "./api.js";
import { isInTeam, toggleTeamMember } from "./team.js";
import {
  selectedVersionGroups,
  selectedGameLabel,
  onGenChange,
} from "./gens.js";

const infoBody = document.querySelector(".infoBody");
const placeholder = infoBody.querySelector(".placeholder");
const details = infoBody.querySelector(".details");

const elements = {
  name: details.querySelector(".name"),
  genus: details.querySelector(".genus"),
  variants: details.querySelector(".variants"),
  number: details.querySelector(".number"),
  types: details.querySelector(".types"),
  image: details.querySelector(".image"),
  shinyButton: details.querySelector(".shinyBtn"),
  cryButton: details.querySelector(".cryBtn"),
  teamButton: details.querySelector(".teamBtn"),
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

const VARIANT_LABELS = {
  alola: "Alolan",
  galar: "Galarian",
  hisui: "Hisuian",
  paldea: "Paldean",
  mega: "Mega",
  "mega-x": "Mega X",
  "mega-y": "Mega Y",
  gmax: "Gigantamax",
};

const REGIONAL_PREFIXES = {
  alola: "Alolan",
  galar: "Galarian",
  hisui: "Hisuian",
  paldea: "Paldean",
};

// "vulpix alola" reads better as "Alolan Vulpix".
const displayName = (pokemon, species) => {
  const base = species.varieties.find((variety) => variety.isDefault);
  if (!base) return pokemon.name;
  const baseName = base.name.replaceAll("-", " ");
  if (!pokemon.name.startsWith(`${baseName} `)) return pokemon.name;
  const suffix = pokemon.name.slice(baseName.length + 1).replaceAll(" ", "-");
  return REGIONAL_PREFIXES[suffix]
    ? `${REGIONAL_PREFIXES[suffix]} ${baseName}`
    : pokemon.name;
};

const renderVariants = ({ pokemon, species }) => {
  if (species.varieties.length < 2) {
    elements.variants.innerHTML = "";
    return;
  }

  const base = species.varieties.find((variety) => variety.isDefault);
  elements.variants.innerHTML = species.varieties
    .map((variety) => {
      const suffix =
        base && variety.name.startsWith(`${base.name}-`)
          ? variety.name.slice(base.name.length + 1)
          : variety.name;
      const label = variety.isDefault
        ? "Normal"
        : VARIANT_LABELS[suffix] || suffix.replaceAll("-", " ");
      const active = variety.name.replaceAll("-", " ") === pokemon.name;
      return `<button class="variantBtn ${active ? "active" : ""}" data-name="${variety.name}">${label}</button>`;
    })
    .join("");
};

const FACTOR_LABELS = { 4: "4×", 0.25: "¼×" };

const matchupIcons = (entries) =>
  entries
    .map(({ type, factor }) => {
      const icon = typeIconUrl(type);
      const badge = FACTOR_LABELS[factor]
        ? `<i>${FACTOR_LABELS[factor]}</i>`
        : "";
      return `<span class="matchup" title="${type} ${factor}×">${
        icon ? `<img class="typeIconSm" src="${icon}" alt="${type}">` : type
      }${badge}</span>`;
    })
    .join("");

const renderAbout = ({ pokemon, species, matchups }) => {
  const abilities = pokemon.abilities
    .map((a) => `${a.name}${a.hidden ? " (hidden)" : ""}`)
    .join(", ");

  const matchupRows = matchups
    ? [
        matchups.weak.length
          ? `<li><strong>Weak to</strong><span class="matchups">${matchupIcons(matchups.weak)}</span></li>`
          : "",
        matchups.resist.length
          ? `<li><strong>Resists</strong><span class="matchups">${matchupIcons(matchups.resist)}</span></li>`
          : "",
        matchups.immune.length
          ? `<li><strong>Immune to</strong><span class="matchups">${matchupIcons(matchups.immune)}</span></li>`
          : "",
      ].join("")
    : "";

  elements.panels.about.innerHTML = `
    ${species.flavor ? `<p class="flavor">${species.flavor}</p>` : ""}
    <ul class="infoList">
      <li><strong>Height</strong><span>${pokemon.height} m</span></li>
      <li><strong>Weight</strong><span>${pokemon.weight} kg</span></li>
      <li><strong>Abilities</strong><span class="cap">${abilities}</span></li>
      ${matchupRows}
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

// Version groups in release order, used to pick the newest game a pokemon
// has move data for when no game filter is active.
const GROUP_ORDER = [
  "red-blue", "yellow", "gold-silver", "crystal", "ruby-sapphire", "emerald",
  "firered-leafgreen", "diamond-pearl", "platinum", "heartgold-soulsilver",
  "black-white", "black-2-white-2", "x-y", "omega-ruby-alpha-sapphire",
  "sun-moon", "ultra-sun-ultra-moon", "lets-go-pikachu-lets-go-eevee",
  "sword-shield", "brilliant-diamond-and-shining-pearl", "legends-arceus",
  "scarlet-violet",
];

const latestGroupFor = (pokemon) => {
  for (let i = GROUP_ORDER.length - 1; i >= 0; i--) {
    const group = GROUP_ORDER[i];
    if (
      pokemon.moves.some((move) =>
        move.versions.some((version) => version.group === group)
      )
    ) {
      return group;
    }
  }
  return null;
};

const MOVE_SECTIONS = [
  { method: "level-up", title: "Level-up", showLevel: true },
  { method: "machine", title: "TM / HM", showLevel: false },
  { method: "egg", title: "Egg moves", showLevel: false },
  { method: "tutor", title: "Move tutor", showLevel: false },
];

const renderMoves = ({ pokemon }) => {
  const gameLabel = selectedGameLabel();
  const groups = selectedVersionGroups() || [latestGroupFor(pokemon)];

  const byMethod = {};
  for (const move of pokemon.moves) {
    for (const section of MOVE_SECTIONS) {
      const entries = move.versions.filter(
        (version) =>
          groups.includes(version.group) && version.method === section.method
      );
      if (!entries.length) continue;
      (byMethod[section.method] ||= []).push({
        name: move.name,
        level: Math.min(...entries.map((entry) => entry.level)),
      });
    }
  }

  (byMethod["level-up"] || []).sort(
    (a, b) => a.level - b.level || a.name.localeCompare(b.name)
  );
  for (const method of ["machine", "egg", "tutor"]) {
    (byMethod[method] || []).sort((a, b) => a.name.localeCompare(b.name));
  }

  const sections = MOVE_SECTIONS.filter(
    (section) => byMethod[section.method]?.length
  );

  const note = gameLabel
    ? `Moves in ${gameLabel}`
    : "Moves from the newest game with data";

  elements.panels.moves.innerHTML = sections.length
    ? `<p class="movesNote">${note}</p>` +
      sections
        .map(
          (section) => `
          <h4 class="movesHead">${section.title} · ${byMethod[section.method].length}</h4>
          <ul class="moves">
            ${byMethod[section.method]
              .map(
                (move) =>
                  `<li>${
                    section.showLevel
                      ? `<span class="lvl">${move.level > 0 ? `Lv ${move.level}` : "Evolve"}</span>`
                      : ""
                  }${move.name}</li>`
              )
              .join("")}
          </ul>`
        )
        .join("")
    : `<p class="movesNote">${note}</p><p class="flavor">No move data for this Pokémon in this game.</p>`;
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

// Back to the "Choose a Pokémon!" state (used when deselecting).
export const clearDetails = () => {
  current = null;
  showMessage("Choose a Pokémon!");
};

// The pokemon currently shown on the card (a variant differs from the
// species number), or null when the placeholder is showing.
export const shownPokemonId = () => (current ? current.pokemon.id : null);

export const renderDetails = (pokemon, species, stages, matchups) => {
  current = { pokemon, species, stages, matchups };
  showingShiny = false;

  details.className = `details ${pokemon.types[0]}`;
  placeholder.hidden = true;
  details.hidden = false;
  // Show the new pokemon from the top, wherever the old card was scrolled.
  infoBody.scrollTop = 0;

  elements.name.innerText = displayName(pokemon, species);
  elements.genus.innerText = species.genus || "";
  // Variants have internal ids above 10000; show the species' dex number.
  elements.number.innerText = `#${species.id ?? pokemon.id}`;
  elements.types.innerHTML = pokemon.types
    .map((type) => {
      const icon = typeIconUrl(type);
      return icon
        ? `<img class="typeIcon" src="${icon}" alt="${type}" title="${type}">`
        : `<p class="type">${type}</p>`;
    })
    .join("");

  // Team membership is per species, so all forms share one pokeball state.
  elements.teamButton.classList.toggle(
    "active",
    isInTeam(species.id ?? pokemon.id)
  );

  setArtwork();
  renderVariants(current);
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
  // On desktop this would yank the whole page, so only do it on phones.
  if (window.matchMedia("(max-width: 720px)").matches) {
    tab.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

elements.shinyButton.addEventListener("click", () => {
  if (!current) return;
  showingShiny = !showingShiny;
  setArtwork();
});

elements.teamButton.addEventListener("click", async () => {
  if (!current) return;
  const inTeam = await toggleTeamMember(
    current.species.id ?? current.pokemon.id
  );
  elements.teamButton.classList.toggle("active", inTeam);
});

elements.cryButton.addEventListener("click", () => {
  if (!current?.pokemon.cry) return;
  const audio = new Audio(current.pokemon.cry);
  audio.volume = 0.4;
  audio.play().catch(() => {});
});

// A different game filter changes which moves apply.
onGenChange(() => {
  if (current) renderMoves(current);
});

// Evolution chain clicks load that pokemon
elements.panels.evolution.addEventListener("click", (event) => {
  const item = event.target.closest(".evoItem[data-id]");
  if (item) onSelect(Number(item.dataset.id));
});

// Variant chips swap the card to that form (same species, same evolution)
elements.variants.addEventListener("click", async (event) => {
  const chip = event.target.closest(".variantBtn");
  if (!chip || !current) return;

  // If the user selects a different pokemon while this loads, `current`
  // changes and this stale variant must not overwrite the new card.
  const base = current;
  setLoading(true);
  try {
    const pokemon = await getPokemon(chip.dataset.name);
    const matchups = await getDefenseMatchups(pokemon.types);
    if (current !== base) return;
    renderDetails(pokemon, base.species, base.stages, matchups);
    setLoading(false);
  } catch (error) {
    console.error(error);
  } finally {
    if (current === base) setLoading(false);
  }
});
