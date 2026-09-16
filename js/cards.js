// Trading cards for the selected pokemon, from the TCGdex API
// (https://tcgdex.dev — free, no key). The pokeball-area card button shows
// how many cards exist; clicking it opens a gallery, and clicking a card
// enlarges it with set / rarity / illustrator / price details. The set and
// illustrator are links to their own galleries, and prices convert to BRL
// at the day's ECB rate (https://frankfurter.dev).

import { spriteUrl } from "./api.js";

const API = "https://api.tcgdex.net/v2/en";
const RATES_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL,EUR";

const button = document.querySelector(".cardsBtn");
const badge = button.querySelector(".cardCount");
const overlay = document.querySelector(".cardsOverlay");
const backButton = overlay.querySelector(".cardsBack");
const titleElement = overlay.querySelector(".cardsTitle");
const note = overlay.querySelector(".cardsNote");
const grid = overlay.querySelector(".cardsGrid");
const zoom = document.querySelector(".cardZoom");
const zoomImage = zoom.querySelector(".zoomImage");
const zoomInfo = zoom.querySelector(".zoomInfo");

const fetchJSON = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status} (${url})`);
  return response.json();
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

// Chronological by set, then by number inside the set.
const bySetThenNumber = (a, b) =>
  a.setIndex - b.setIndex ||
  numericLocalId(a.localId) - numericLocalId(b.localId) ||
  a.id.localeCompare(b.id);

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
    fetchJSON(`${API}/cards?dexId=eq:${dexId}`)
      .then(withSetNames)
      .then((cards) => cards.sort(bySetThenNumber))
  );

const setCache = new Map();

const getSet = (setId) => cached(setCache, setId, () => fetchJSON(`${API}/sets/${setId}`));

const illustratorCache = new Map();

const getIllustratorCards = (name) =>
  cached(illustratorCache, name, () =>
    fetchJSON(`${API}/cards?illustrator=eq:${encodeURIComponent(name)}`)
      .then(withSetNames)
      .then((cards) => cards.sort(bySetThenNumber))
  );

const cardCache = new Map();

const getCard = (cardId) => cached(cardCache, cardId, () => fetchJSON(`${API}/cards/${cardId}`));

const ratesCache = new Map();

// The day's ECB rates: dollars and euros into reais.
const getRates = () =>
  cached(ratesCache, "brl", () =>
    fetchJSON(RATES_URL).then((data) => ({
      usdToBrl: data.rates.BRL,
      eurToBrl: data.rates.BRL / data.rates.EUR,
      date: data.date,
    }))
  );

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

// Each gallery view is { title, note, tiles }; navigating from the zoom to
// a set or illustrator pushes the previous view so ← can walk back.
let galleryHistory = [];
let currentView = null;
let viewToken = 0;

// A card with no scan on TCGdex (usually a jumbo or brand-new promo card)
// gets a card-back-styled tile: the pokemon's own sprite when the gallery
// is about one pokemon, a pokeball otherwise.
const tileMarkup = (tile) => `<li>
  <button class="cardItem" data-id="${tile.id}" data-image="${tile.image || ""}">
    ${
      tile.image
        ? `<img src="${tile.image}/low.webp" alt="${tile.name}" loading="lazy">`
        : `<span class="cardMissing">
            <img src="${tile.sprite || "./img/pokeball.png"}" alt="" loading="lazy">
            <b>${tile.name}</b><i>no scan yet</i>
          </span>`
    }
    <span class="cardLabel">${tile.label}</span>
  </button>
</li>`;

const renderGallery = (view) => {
  currentView = view;
  overlay.hidden = false;
  backButton.hidden = !galleryHistory.length;
  titleElement.innerText = view.title;
  note.innerText = view.note;
  grid.innerHTML = view.tiles.map(tileMarkup).join("");
  grid.scrollTop = 0;
};

const showLoading = (title) => {
  overlay.hidden = false;
  backButton.hidden = !galleryHistory.length;
  titleElement.innerText = title;
  note.innerText = "Loading cards…";
  grid.innerHTML = "";
};

// Builds a view asynchronously and renders it unless the user navigated
// somewhere else (or closed the overlay) in the meantime.
const openView = async (title, build) => {
  const token = ++viewToken;
  showLoading(title);
  try {
    const view = await build();
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
    const cards = await getDexCards(dexId);
    return {
      title: `${name} · Trading cards`,
      note: `${cards.length} cards, oldest set first — click one to enlarge`,
      tiles: cards.map((card) => ({ ...card, label: card.setName, sprite: spriteUrl(dexId) })),
    };
  });

const openSetGallery = (setId) =>
  openView("Set", async () => {
    const set = await getSet(setId);
    const cards = [...set.cards].sort(
      (a, b) => numericLocalId(a.localId) - numericLocalId(b.localId) || a.id.localeCompare(b.id)
    );
    return {
      title: `${set.name} · Complete set`,
      note: `${cards.length} cards${set.releaseDate ? ` · released ${set.releaseDate}` : ""}`,
      tiles: cards.map((card) => ({ ...card, label: `${card.localId} · ${card.name}` })),
    };
  });

const openIllustratorGallery = (name) =>
  openView(`Illustrated by ${name}`, async () => {
    const cards = await getIllustratorCards(name);
    return {
      title: `Illustrated by ${name}`,
      note: `${cards.length} cards, oldest set first`,
      tiles: cards.map((card) => ({ ...card, label: `${card.setName} · ${card.name}` })),
    };
  });

// ---------- The single-card zoom ----------

const formatBRL = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// One row per price source, each converted to reais at the day's rate.
const priceRows = (card, rates) => {
  let usd = null;
  let eur = null;
  for (const variant of card.variants_detailed || []) {
    const tcgplayer = variant.pricing?.tcgplayer || {};
    for (const finish of Object.values(tcgplayer)) {
      if (!usd && finish && typeof finish === "object" && finish.midPrice) {
        usd = finish.midPrice;
      }
    }
    const cardmarket = variant.pricing?.cardmarket;
    if (!eur && cardmarket?.trend) eur = cardmarket.trend;
  }

  const rows = [
    usd
      ? `<li><strong>Price (US)</strong><span>$${usd} (TCGplayer mid)${
          rates ? ` · ~${formatBRL(usd * rates.usdToBrl)}` : ""
        }</span></li>`
      : "",
    eur
      ? `<li><strong>Price (EU)</strong><span>€${eur} (Cardmarket trend)${
          rates ? ` · ~${formatBRL(eur * rates.eurToBrl)}` : ""
        }</span></li>`
      : "",
  ].join("");

  return rows && rates
    ? rows +
        `<li class="rateNote">R$ at the ${rates.date} ECB rate (US$1 = ${formatBRL(rates.usdToBrl)})</li>`
    : rows;
};

let zoomedCardId = null;

const openZoom = async (cardId, image) => {
  zoomedCardId = cardId;
  zoom.hidden = true; // restart the pop-in when reopening
  zoom.hidden = false;
  zoomImage.hidden = !image;
  if (image) zoomImage.src = `${image}/high.webp`;
  zoomInfo.innerHTML = `<p class="flavor">Loading…</p>`;

  // Prices are useless without the card, but the card is fine without rates.
  const [card, rates] = await Promise.all([
    getCard(cardId).catch(() => null),
    getRates().catch(() => null),
  ]);
  if (cardId !== zoomedCardId) return;
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
    card.rarity ? `<li><strong>Rarity</strong><span>${card.rarity}</span></li>` : "",
    card.illustrator
      ? `<li><strong>Illustrator</strong><span><button class="zoomLink" data-illustrator="${card.illustrator}">${card.illustrator}</button></span></li>`
      : "",
    priceRows(card, rates),
  ].join("");
  zoomInfo.innerHTML = `<h4>${card.name}</h4><ul class="zoomFacts">${rows}</ul>`;
};

const closeZoom = () => {
  zoomedCardId = null;
  zoom.hidden = true;
  zoomImage.src = "";
};

// Closes the topmost cards layer; true when one was open (so the caller's
// Escape doesn't also fold the pokedex shut).
export const closeCardsUI = () => {
  if (!zoom.hidden) {
    closeZoom();
    return true;
  }
  if (!overlay.hidden) {
    overlay.hidden = true;
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
  if (item) openZoom(item.dataset.id, item.dataset.image);
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

overlay.querySelector(".cardsClose").addEventListener("click", () => {
  overlay.hidden = true;
});

// Clicking the dimmed backdrop (not the panel) closes each layer.
overlay.addEventListener("click", (event) => {
  if (event.target === overlay) overlay.hidden = true;
});

zoom.addEventListener("click", (event) => {
  if (event.target === zoom || event.target.closest(".zoomClose")) closeZoom();
});
