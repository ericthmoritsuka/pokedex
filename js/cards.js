// Trading cards for the selected pokemon, from the TCGdex API
// (https://tcgdex.dev — free, no key). The pokeball-area card button shows
// how many cards exist; clicking it opens a gallery that can be sorted by
// set, rarity, price, or energy, and clicking a card enlarges it with
// set / rarity / illustrator / price details plus ‹ › navigation. The set
// and illustrator are links to their own galleries, and prices show in
// dollars and reais at the day's ECB rate (https://frankfurter.dev).

import { spriteUrl } from "./api.js";

const API = "https://api.tcgdex.net/v2/en";
const GRAPHQL = "https://api.tcgdex.net/v2/graphql";
const RATES_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL,EUR";

const button = document.querySelector(".cardsBtn");
const badge = button.querySelector(".cardCount");
const overlay = document.querySelector(".cardsOverlay");
const backButton = overlay.querySelector(".cardsBack");
const titleElement = overlay.querySelector(".cardsTitle");
const note = overlay.querySelector(".cardsNote");
const sortBar = overlay.querySelector(".cardsSort");
const grid = overlay.querySelector(".cardsGrid");
const zoom = document.querySelector(".cardZoom");
const zoomImage = zoom.querySelector(".zoomImage");
const zoomInfo = zoom.querySelector(".zoomInfo");
const zoomPrev = zoom.querySelector(".zoomPrev");
const zoomNext = zoom.querySelector(".zoomNext");

const fetchJSON = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status} (${url})`);
  return response.json();
};

const gql = async (query) => {
  const response = await fetch(GRAPHQL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`GraphQL failed: ${response.status}`);
  const result = await response.json();
  if (!result.data) throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  return result.data;
};

// A failed fetch must not poison a cache, so every cached promise cleans
// itself up on rejection and the next call retries.
const cached = (cache, key, make) => {
  if (!cache.has(key)) {
    const promise = make();
    promise.catch(() => cache.delete(key));
    cache.set(key, promise);
  }
  return cache.get(key);
};

// ---------- Data ----------

const setsCache = new Map();

// Set id -> { name, index }; the /sets list order roughly follows release
// order, so the index doubles as a chronological sort key for the gallery.
const getSets = () =>
  cached(setsCache, "all", () =>
    fetchJSON(`${API}/sets`).then(
      (sets) => new Map(sets.map((set, index) => [set.id, { name: set.name, index }]))
    )
  );

// "cel25-5" -> "cel25"; the set id is everything before the last dash.
const setIdOf = (cardId) => cardId.slice(0, cardId.lastIndexOf("-"));

// "SWSH039" and "5a" still sort sensibly by their digits.
const numericLocalId = (localId) => Number((localId.match(/\d+/) || [Infinity])[0]);

const withSetNames = async (cards) => {
  const sets = await getSets();
  return cards.map((card) => {
    const set = sets.get(setIdOf(card.id));
    return {
      ...card,
      setName: set ? set.name : setIdOf(card.id),
      setIndex: set ? set.index : -1,
    };
  });
};

const dexCache = new Map();

const getDexCards = (dexId) =>
  cached(dexCache, dexId, () =>
    fetchJSON(`${API}/cards?dexId=eq:${dexId}`).then(withSetNames)
  );

const setCache = new Map();

const getSet = (setId) => cached(setCache, setId, () => fetchJSON(`${API}/sets/${setId}`));

const illustratorCache = new Map();

const getIllustratorCards = (name) =>
  cached(illustratorCache, name, () =>
    fetchJSON(`${API}/cards?illustrator=eq:${encodeURIComponent(name)}`).then(withSetNames)
  );

const cardCache = new Map();

const getCard = (cardId) => cached(cardCache, cardId, () => fetchJSON(`${API}/cards/${cardId}`));

const ratesCache = new Map();

// The day's ECB rates, everything relative to the dollar.
const getRates = () =>
  cached(ratesCache, "brl", () =>
    fetchJSON(RATES_URL).then((data) => ({
      usdToBrl: data.rates.BRL,
      eurToUsd: 1 / data.rates.EUR,
      eurToBrl: data.rates.BRL / data.rates.EUR,
      date: data.date,
    }))
  );

// The first USD (TCGplayer mid) and EUR (Cardmarket trend) a card's
// variants report.
const cardPrices = (card) => {
  let usd = null;
  let eur = null;
  for (const variant of card?.variants_detailed || []) {
    const tcgplayer = variant.pricing?.tcgplayer || {};
    for (const finish of Object.values(tcgplayer)) {
      if (!usd && finish && typeof finish === "object" && finish.midPrice) {
        usd = finish.midPrice;
      }
    }
    const cardmarket = variant.pricing?.cardmarket;
    if (!eur && cardmarket?.trend) eur = cardmarket.trend;
  }
  return { usd, eur };
};

const formatBRL = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ---------- Sorting ----------

// Common to rarest, mainline and Pocket rarities side by side. The exact
// ranking between fancy modern rarities is debatable; the tile labels show
// the rarity, so the grouping stays transparent.
const RARITY_TIERS = [
  ["None", "Promo"],
  ["Common", "One Diamond"],
  ["Uncommon", "Two Diamond"],
  ["Rare", "Three Diamond"],
  ["Rare Holo", "Holo Rare", "Holo Rare V", "Four Diamond"],
  ["Holo Rare VMAX", "Holo Rare VSTAR", "Rare Holo LV.X", "Double rare"],
  ["Ultra Rare", "Radiant Rare", "Amazing Rare", "Shiny rare", "One Star", "One Shiny"],
  ["Illustration rare", "Shiny rare VMAX", "Shiny Ultra Rare", "Full Art Trainer", "Two Star", "Two Shiny"],
  ["Special illustration rare", "Secret Rare", "Classic Collection", "ACE SPEC Rare", "Three Star"],
  ["Hyper rare", "Mega Hyper Rare", "Crown", "LEGEND"],
];
const RARITY_RANK = {};
RARITY_TIERS.forEach((tier, index) => {
  for (const name of tier) RARITY_RANK[name] = index;
});

// A rarity this table doesn't know lands mid-table instead of on top.
const rarityRank = (rarity) => RARITY_RANK[rarity] ?? (rarity ? 5 : 0);

const ENERGY_ORDER = [
  "Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting",
  "Darkness", "Metal", "Fairy", "Dragon", "Colorless",
];

// Trainers and energy cards (no type) go after every pokemon.
const energyRank = (types) => {
  const index = ENERGY_ORDER.indexOf(types?.[0]);
  return index === -1 ? ENERGY_ORDER.length : index;
};

const bySetOrder = (a, b) =>
  (a.setIndex ?? 0) - (b.setIndex ?? 0) ||
  numericLocalId(a.localId) - numericLocalId(b.localId) ||
  a.id.localeCompare(b.id);

// dir is 1 (ascending) or -1; clicking the active chip flips it. Cards
// with no price stay last in both directions.
const sortTiles = (view) => {
  const dir = view.dir;
  const comparators = {
    set: (a, b) => bySetOrder(a, b) * dir,
    rarity: (a, b) => (rarityRank(a.rarity) - rarityRank(b.rarity)) * dir || bySetOrder(a, b),
    energy: (a, b) => (energyRank(a.types) - energyRank(b.types)) * dir || bySetOrder(a, b),
    price: (a, b) => {
      if (a.priceUsd == null && b.priceUsd == null) return bySetOrder(a, b);
      if (a.priceUsd == null) return 1;
      if (b.priceUsd == null) return -1;
      return (a.priceUsd - b.priceUsd) * dir || bySetOrder(a, b);
    },
  };
  view.tiles.sort(comparators[view.sort]);
};

// What each sort means by default: chronological, rarest first, most
// expensive first, canonical energy order.
const DEFAULT_DIR = { set: 1, rarity: -1, price: -1, energy: 1 };

const SORT_NOTES = {
  set: { 1: "oldest set first", "-1": "newest set first" },
  rarity: { 1: "most common first", "-1": "rarest first" },
  price: { 1: "cheapest first", "-1": "highest price first" },
  energy: { 1: "grouped by energy", "-1": "grouped by energy, reversed" },
};

// ---------- The count badge on the details card ----------

let currentDex = 0;
let currentName = "";

// Called by details.js on every render; cards belong to the species, so
// variants share the species' dex number (like the team pokeball).
export const updateCardsButton = (dexId, name) => {
  currentDex = dexId;
  currentName = name;
  button.hidden = true;
  getDexCards(dexId)
    .then((cards) => {
      // The user may have moved on to another pokemon while this loaded.
      if (dexId !== currentDex || !cards.length) return;
      badge.innerText = cards.length;
      button.hidden = false;
    })
    .catch(() => {}); // no TCG data is not an error the user needs to see
};

// ---------- The gallery overlay ----------

// Each gallery is { kind, key, title, baseNote, sort, tiles }; navigating
// from the zoom to a set or illustrator pushes the previous view so ← can
// walk back, keeping its sort. kind/key pick the sort-metadata source.
let galleryHistory = [];
let currentView = null;
let viewToken = 0;

// Background scrolling stays off while any cards layer is open.
const syncScrollLock = () => {
  document.documentElement.classList.toggle(
    "modalLock",
    !overlay.hidden || !zoom.hidden
  );
};

const closeOverlay = () => {
  overlay.hidden = true;
  syncScrollLock();
};

const tileLabel = (tile, sort) => {
  if (sort === "rarity") return `${tile.rarity || "No rarity"} · ${tile.label}`;
  if (sort === "price") return `${tile.priceLabel || "no price"} · ${tile.label}`;
  if (sort === "energy") return `${tile.types?.[0] || "Trainer/other"} · ${tile.label}`;
  return tile.label;
};

// A card with no scan on TCGdex (usually a jumbo or brand-new promo card)
// gets a card-back-styled tile: the pokemon's own sprite when the gallery
// is about one pokemon, a pokeball otherwise.
const tileMarkup = (tile, index, sort) => `<li>
  <button class="cardItem" data-index="${index}">
    ${
      tile.image
        ? `<img src="${tile.image}/low.webp" alt="${tile.name}" loading="lazy">`
        : `<span class="cardMissing">
            <img src="${tile.sprite || "./img/pokeball.png"}" alt="" loading="lazy">
            <b>${tile.name}</b><i>no scan yet</i>
          </span>`
    }
    <span class="cardLabel">${tileLabel(tile, sort)}</span>
  </button>
</li>`;

const renderGallery = (view) => {
  currentView = view;
  overlay.hidden = false;
  syncScrollLock();
  backButton.hidden = !galleryHistory.length;
  titleElement.innerText = view.title;
  note.innerText =
    view.sort === "set" && view.dir === 1
      ? view.baseNote
      : `${view.tiles.length} cards, ${SORT_NOTES[view.sort][view.dir]}`;
  sortBar.querySelectorAll(".sortBtn").forEach((chip) => {
    const active = chip.dataset.sort === view.sort;
    chip.classList.toggle("active", active);
    const label = chip.dataset.sort === "set" ? view.defaultSortLabel : chip.dataset.label;
    chip.innerText = active ? `${label} ${view.dir === 1 ? "▲" : "▼"}` : label;
  });
  grid.innerHTML = view.tiles.map((tile, index) => tileMarkup(tile, index, view.sort)).join("");
  grid.scrollTop = 0;
};

const showLoading = (title, message = "Loading cards…") => {
  overlay.hidden = false;
  syncScrollLock();
  backButton.hidden = !galleryHistory.length;
  titleElement.innerText = title;
  note.innerText = message;
};

// Builds a view asynchronously and renders it unless the user navigated
// somewhere else (or closed the overlay) in the meantime.
const openView = async (title, build) => {
  const token = ++viewToken;
  grid.innerHTML = "";
  showLoading(title);
  try {
    const view = await build();
    view.sort = "set";
    view.dir = 1;
    if (token === viewToken && !overlay.hidden) renderGallery(view);
  } catch (error) {
    if (token === viewToken && !overlay.hidden) {
      note.innerText = "Could not reach TCGdex — close this and try again.";
    }
    console.error(error);
  }
};

const openDexGallery = (dexId, name) =>
  openView(`${name} · Trading cards`, async () => {
    const cards = [...(await getDexCards(dexId))].sort(bySetOrder);
    return {
      kind: "dex",
      key: dexId,
      title: `${name} · Trading cards`,
      baseNote: `${cards.length} cards, oldest set first — click one to enlarge`,
      defaultSortLabel: "Set",
      tiles: cards.map((card) => ({ ...card, label: card.setName, sprite: spriteUrl(dexId) })),
    };
  });

const openSetGallery = (setId) =>
  openView("Set", async () => {
    const set = await getSet(setId);
    const cards = [...set.cards].sort(bySetOrder);
    return {
      kind: "set",
      key: setId,
      title: `${set.name} · Complete set`,
      baseNote: `${cards.length} cards${set.releaseDate ? ` · released ${set.releaseDate}` : ""}`,
      defaultSortLabel: "Number",
      tiles: cards.map((card) => ({ ...card, label: `${card.localId} · ${card.name}` })),
    };
  });

const openIllustratorGallery = (name) =>
  openView(`Illustrated by ${name}`, async () => {
    const cards = [...(await getIllustratorCards(name))].sort(bySetOrder);
    return {
      kind: "illustrator",
      key: name,
      title: `Illustrated by ${name}`,
      baseNote: `${cards.length} cards, oldest set first`,
      defaultSortLabel: "Set",
      tiles: cards.map((card) => ({ ...card, label: `${card.setName} · ${card.name}` })),
    };
  });

// ---------- Sort data ----------

const metaCache = new Map();

// Rarity and energy for a whole dex/illustrator gallery in one GraphQL
// query. (No set filter exists there, and the set(id) query rejects cards
// with null rarities, so set galleries use the per-card fallback below.)
const getMetaMap = (view) =>
  cached(metaCache, `${view.kind}:${view.key}`, async () => {
    const filter =
      view.kind === "dex" ? `dexId: ${view.key}` : `illustrator: ${JSON.stringify(view.key)}`;
    const data = await gql(`{ cards(filters: {${filter}}) { id rarity types } }`);
    return new Map(data.cards.map((card) => [card.id, card]));
  });

// Fetch every tile's card details, a few at a time; getCard caches, so
// this costs the network once per card and ever less as the user browses.
const bulkDetails = async (tiles, onProgress) => {
  const queue = [...tiles.filter((tile) => tile.detail === undefined)];
  const total = tiles.length;
  let done = total - queue.length;
  await Promise.all(
    Array.from({ length: 12 }, async () => {
      while (queue.length) {
        const tile = queue.shift();
        try {
          tile.detail = await getCard(tile.id);
        } catch {
          tile.detail = null;
        }
        onProgress(++done, total);
      }
    })
  );
};

const progressNote = (view, label) => (done, total) => {
  if (currentView === view && done % 5 === 0) {
    note.innerText = `${label}… ${done}/${total}`;
  }
};

const applyDetailMeta = (view) => {
  for (const tile of view.tiles) {
    tile.rarity = tile.detail?.rarity ?? null;
    tile.types = tile.detail?.types ?? null;
  }
  view.metaLoaded = true;
};

const ensureSortData = async (view, sort) => {
  if ((sort === "rarity" || sort === "energy") && !view.metaLoaded) {
    if (view.kind === "set") {
      await bulkDetails(view.tiles, progressNote(view, "Loading card data"));
      applyDetailMeta(view);
    } else {
      const meta = await getMetaMap(view);
      for (const tile of view.tiles) {
        const entry = meta.get(tile.id);
        tile.rarity = entry?.rarity && entry.rarity !== "None" ? entry.rarity : null;
        tile.types = entry?.types ?? null;
      }
      view.metaLoaded = true;
    }
  }

  if (sort === "price" && !view.pricesLoaded) {
    const [rates] = await Promise.all([
      getRates().catch(() => null),
      bulkDetails(view.tiles, progressNote(view, "Loading prices")),
    ]);
    for (const tile of view.tiles) {
      const { usd, eur } = cardPrices(tile.detail);
      tile.priceUsd = usd ?? (eur && rates ? eur * rates.eurToUsd : eur);
      tile.priceLabel =
        tile.priceUsd && rates
          ? formatBRL(tile.priceUsd * rates.usdToBrl)
          : tile.priceUsd
            ? `$${tile.priceUsd.toFixed(2)}`
            : null;
    }
    applyDetailMeta(view); // the details carry rarity/energy too
    view.pricesLoaded = true;
  }
};

const applySort = async (sort) => {
  const view = currentView;
  if (!view) return;

  // Clicking the active sort again flips the direction. If the sort's
  // data is still loading, only flip: the in-flight applySort renders
  // with the new direction when the data lands.
  if (view.sort === sort) {
    view.dir = -view.dir;
    if (sort === "price" && !view.pricesLoaded) return;
    if ((sort === "rarity" || sort === "energy") && !view.metaLoaded) return;
    sortTiles(view);
    renderGallery(view);
    return;
  }

  const previousSort = view.sort;
  view.sort = sort;
  view.dir = DEFAULT_DIR[sort];
  const token = ++viewToken;
  try {
    await ensureSortData(view, sort);
  } catch (error) {
    if (currentView === view && token === viewToken) {
      view.sort = previousSort; // let the chip be clicked again
      note.innerText = "Could not load the data for this sort — try again.";
    }
    console.error(error);
    return;
  }
  if (currentView !== view || view.sort !== sort || token !== viewToken) return;
  sortTiles(view);
  renderGallery(view);
};

// ---------- The single-card zoom ----------

// The price in dollars (TCGplayer mid) and reais; a card only Cardmarket
// tracks gets its euro trend converted to both.
const priceRows = (card, rates) => {
  const { usd, eur } = cardPrices(card);
  let line = "";
  if (usd) {
    line = `$${usd} (TCGplayer mid)${rates ? ` · ~${formatBRL(usd * rates.usdToBrl)}` : ""}`;
  } else if (eur && rates) {
    line = `~$${(eur * rates.eurToUsd).toFixed(2)} · ~${formatBRL(eur * rates.eurToBrl)} (from Cardmarket €${eur})`;
  } else if (eur) {
    line = `€${eur} (Cardmarket trend)`;
  }
  if (!line) return "";
  const rateNote = rates
    ? `<li class="rateNote">converted at the ${rates.date} ECB rate</li>`
    : "";
  return `<li><strong>Price</strong><span>${line}</span></li>${rateNote}`;
};

let zoomIndex = -1;
let zoomedCardId = null;

const syncZoomNav = () => {
  const count = currentView ? currentView.tiles.length : 0;
  zoomPrev.hidden = zoomIndex <= 0;
  zoomNext.hidden = zoomIndex < 0 || zoomIndex >= count - 1;
};

const openZoom = async (index) => {
  const tile = currentView?.tiles[index];
  if (!tile) return;
  zoomIndex = index;
  zoomedCardId = tile.id;
  zoom.hidden = false;
  syncScrollLock();
  syncZoomNav();
  zoomImage.hidden = !tile.image;
  zoomImage.src = tile.image ? `${tile.image}/high.webp` : "";
  zoomInfo.innerHTML = `<p class="flavor">Loading…</p>`;

  const [card, rates] = await Promise.all([
    getCard(tile.id).catch(() => null),
    getRates().catch(() => null),
  ]);
  if (tile.id !== zoomedCardId) return;
  if (!card) {
    zoomInfo.innerHTML = `<h4>Card details unavailable</h4>`;
    return;
  }

  const count = card.set?.cardCount?.official;
  const rows = [
    card.set?.name
      ? `<li><strong>Set</strong><span><button class="zoomLink" data-set="${card.set.id}">${card.set.name}</button>${
          count ? ` · ${card.localId}/${count}` : ""
        }</span></li>`
      : "",
    card.rarity && card.rarity !== "None"
      ? `<li><strong>Rarity</strong><span>${card.rarity}</span></li>`
      : "",
    card.illustrator
      ? `<li><strong>Illustrator</strong><span><button class="zoomLink" data-illustrator="${card.illustrator}">${card.illustrator}</button></span></li>`
      : "",
    priceRows(card, rates),
  ].join("");
  zoomInfo.innerHTML = `<h4>${card.name}</h4><ul class="zoomFacts">${rows}</ul>`;
};

const closeZoom = () => {
  zoomedCardId = null;
  zoomIndex = -1;
  zoom.hidden = true;
  zoomImage.src = "";
  syncScrollLock();
};

// Closes the topmost cards layer; true when one was open (so the caller's
// Escape doesn't also fold the pokedex shut).
export const closeCardsUI = () => {
  if (!zoom.hidden) {
    closeZoom();
    return true;
  }
  if (!overlay.hidden) {
    closeOverlay();
    return true;
  }
  return false;
};

// ---------- Events ----------

button.addEventListener("click", () => {
  if (!currentDex) return;
  galleryHistory = [];
  openDexGallery(currentDex, currentName);
});

grid.addEventListener("click", (event) => {
  const item = event.target.closest(".cardItem");
  if (item) openZoom(Number(item.dataset.index));
});

sortBar.addEventListener("click", (event) => {
  const chip = event.target.closest(".sortBtn");
  if (chip) applySort(chip.dataset.sort);
});

// The set and illustrator names in the zoom open their own galleries.
zoomInfo.addEventListener("click", (event) => {
  const link = event.target.closest(".zoomLink");
  if (!link) return;
  if (currentView) galleryHistory.push(currentView);
  closeZoom();
  if (link.dataset.set) openSetGallery(link.dataset.set);
  else openIllustratorGallery(link.dataset.illustrator);
});

backButton.addEventListener("click", () => {
  const previous = galleryHistory.pop();
  if (previous) {
    viewToken++; // abandon any in-flight view
    renderGallery(previous);
  }
});

zoomPrev.addEventListener("click", () => openZoom(zoomIndex - 1));
zoomNext.addEventListener("click", () => openZoom(zoomIndex + 1));

document.addEventListener("keydown", (event) => {
  if (zoom.hidden) return;
  if (event.key === "ArrowLeft" && !zoomPrev.hidden) openZoom(zoomIndex - 1);
  if (event.key === "ArrowRight" && !zoomNext.hidden) openZoom(zoomIndex + 1);
});

overlay.querySelector(".cardsClose").addEventListener("click", closeOverlay);

// Clicking the dimmed backdrop (not the panel) closes each layer.
overlay.addEventListener("click", (event) => {
  if (event.target === overlay) closeOverlay();
});

zoom.addEventListener("click", (event) => {
  if (event.target === zoom || event.target.closest(".zoomClose")) closeZoom();
});
