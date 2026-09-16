// Trading cards for the selected pokemon, from the TCGdex API
// (https://tcgdex.dev — free, no key). The pokeball-area card button shows
// how many cards exist; clicking it opens a gallery, and clicking a card
// enlarges it with set / rarity / price details.

const API = "https://api.tcgdex.net/v2/en";

const button = document.querySelector(".cardsBtn");
const badge = button.querySelector(".cardCount");
const overlay = document.querySelector(".cardsOverlay");
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

// ---------- Data ----------

let setsPromise = null;

// Set id -> { name, index }; the /sets list order roughly follows release
// order, so the index doubles as a chronological sort key for the gallery.
const getSets = () => {
  if (!setsPromise) {
    setsPromise = fetchJSON(`${API}/sets`).then(
      (sets) => new Map(sets.map((set, index) => [set.id, { name: set.name, index }]))
    );
    // A failed fetch must not poison the cache: allow a retry.
    setsPromise.catch(() => {
      setsPromise = null;
    });
  }
  return setsPromise;
};

// "cel25-5" -> "cel25"; the set id is everything before the last dash.
const setIdOf = (cardId) => cardId.slice(0, cardId.lastIndexOf("-"));

// "SWSH039" and "5a" still sort sensibly by their digits.
const numericLocalId = (localId) => Number((localId.match(/\d+/) || [Infinity])[0]);

const cardsCache = new Map();

const getCards = (dexId) => {
  if (!cardsCache.has(dexId)) {
    const promise = Promise.all([
      fetchJSON(`${API}/cards?dexId=eq:${dexId}`),
      getSets(),
    ]).then(([cards, sets]) =>
      cards
        .map((card) => {
          const set = sets.get(setIdOf(card.id));
          return {
            ...card,
            setName: set ? set.name : setIdOf(card.id),
            setIndex: set ? set.index : -1,
          };
        })
        .sort(
          (a, b) =>
            a.setIndex - b.setIndex ||
            numericLocalId(a.localId) - numericLocalId(b.localId) ||
            a.id.localeCompare(b.id)
        )
    );
    promise.catch(() => cardsCache.delete(dexId));
    cardsCache.set(dexId, promise);
  }
  return cardsCache.get(dexId);
};

const cardCache = new Map();

const getCard = (cardId) => {
  if (!cardCache.has(cardId)) {
    const promise = fetchJSON(`${API}/cards/${cardId}`);
    promise.catch(() => cardCache.delete(cardId));
    cardCache.set(cardId, promise);
  }
  return cardCache.get(cardId);
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
  getCards(dexId)
    .then((cards) => {
      // The user may have moved on to another pokemon while this loaded.
      if (dexId !== currentDex || !cards.length) return;
      badge.innerText = cards.length;
      button.hidden = false;
    })
    .catch(() => {}); // no TCG data is not an error the user needs to see
};

// ---------- The gallery overlay ----------

const openGallery = async () => {
  overlay.hidden = false;
  overlay.scrollTop = 0;
  titleElement.innerText = `${currentName} · Trading cards`;
  note.innerText = "Loading cards…";
  grid.innerHTML = "";

  const dexId = currentDex;
  try {
    const cards = await getCards(dexId);
    if (dexId !== currentDex || overlay.hidden) return;
    note.innerText = `${cards.length} cards, oldest set first — click one to enlarge`;
    grid.innerHTML = cards
      .map(
        (card) => `<li>
          <button class="cardItem" data-id="${card.id}" data-image="${card.image || ""}">
            ${
              card.image
                ? `<img src="${card.image}/low.webp" alt="${card.name}" loading="lazy">`
                : `<span class="cardMissing">${card.name}<i>no image</i></span>`
            }
            <span class="cardLabel">${card.setName}</span>
          </button>
        </li>`
      )
      .join("");
  } catch (error) {
    note.innerText = "Could not reach TCGdex — close this and try again.";
    console.error(error);
  }
};

// ---------- The single-card zoom ----------

// Cardmarket's trend price, or TCGplayer's mid price, from whichever
// variant of the card reports one first.
const priceLine = (card) => {
  for (const variant of card.variants_detailed || []) {
    const cardmarket = variant.pricing?.cardmarket;
    if (cardmarket?.trend) {
      return `<li><strong>Price</strong><span>~€${cardmarket.trend} (Cardmarket trend)</span></li>`;
    }
    const tcgplayer = variant.pricing?.tcgplayer || {};
    for (const finish of Object.values(tcgplayer)) {
      if (finish?.midPrice) {
        return `<li><strong>Price</strong><span>~$${finish.midPrice} (TCGplayer mid)</span></li>`;
      }
    }
  }
  return "";
};

let zoomedCardId = null;

const openZoom = async (cardId, image) => {
  zoomedCardId = cardId;
  zoom.hidden = false;
  zoomImage.hidden = !image;
  if (image) zoomImage.src = `${image}/high.webp`;
  zoomInfo.innerHTML = `<p class="flavor">Loading…</p>`;

  try {
    const card = await getCard(cardId);
    if (cardId !== zoomedCardId) return;
    const count = card.set?.cardCount?.official;
    const rows = [
      card.set?.name
        ? `<li><strong>Set</strong><span>${card.set.name}${count ? ` · ${card.localId}/${count}` : ""}</span></li>`
        : "",
      card.rarity ? `<li><strong>Rarity</strong><span>${card.rarity}</span></li>` : "",
      card.illustrator
        ? `<li><strong>Illustrator</strong><span>${card.illustrator}</span></li>`
        : "",
      priceLine(card),
    ].join("");
    zoomInfo.innerHTML = `<h4>${card.name}</h4><ul class="infoList">${rows}</ul>`;
  } catch (error) {
    if (cardId === zoomedCardId) zoomInfo.innerHTML = `<h4>Card details unavailable</h4>`;
    console.error(error);
  }
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
  if (currentDex) openGallery();
});

grid.addEventListener("click", (event) => {
  const item = event.target.closest(".cardItem");
  if (item) openZoom(item.dataset.id, item.dataset.image);
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
