import { getPokemon, spriteUrl } from "./api.js";
import { createPicker } from "./picker.js";

const body = document.querySelector(".compareBody");
const heads = body.querySelector(".compareHeads");
const statsList = body.querySelector(".compareStats");

const COLORS = ["#306cb3", "#dc0a2d"];
const MAX_STAT = 200;
const MAX_TOTAL = 800;

let slots = [null, null];

const renderBars = (label, a, b, max) => `
  <li class="compareRow">
    <span class="cVal ${a !== null && a > (b ?? -1) ? "win" : ""}">${a ?? "–"}</span>
    <div class="cBars">
      <span class="cLabel">${label}</span>
      <div class="cBar"><div style="width:${((a || 0) / max) * 100}%;background:${COLORS[0]}"></div></div>
      <div class="cBar"><div style="width:${((b || 0) / max) * 100}%;background:${COLORS[1]}"></div></div>
    </div>
    <span class="cVal ${b !== null && b > (a ?? -1) ? "win" : ""}">${b ?? "–"}</span>
  </li>`;

const render = () => {
  heads.innerHTML = slots
    .map((slot, i) =>
      slot
        ? `<div class="compareHead" style="border-color:${COLORS[i]}">
            <button class="compareClear" data-slot="${i}" title="Clear">✕</button>
            <img src="${spriteUrl(slot.id)}" alt="${slot.name}">
            <span class="cap">${slot.name}</span>
          </div>`
        : `<div class="compareHead empty"><span>?</span></div>`
    )
    .join('<span class="vs">VS</span>');

  if (!slots[0] && !slots[1]) {
    statsList.innerHTML = "";
    return;
  }

  const reference = slots[0] || slots[1];
  const rows = reference.stats.map((_, i) =>
    renderBars(
      reference.stats[i].label,
      slots[0] ? slots[0].stats[i].value : null,
      slots[1] ? slots[1].stats[i].value : null,
      MAX_STAT
    )
  );
  rows.push(
    renderBars(
      "TOTAL",
      slots[0] ? slots[0].statsTotal : null,
      slots[1] ? slots[1].statsTotal : null,
      MAX_TOTAL
    )
  );
  statsList.innerHTML = rows.join("");
};

export const addToCompare = async (id) => {
  try {
    const pokemon = await getPokemon(id);
    if (slots.some((slot) => slot && slot.id === pokemon.id)) return;

    if (!slots[0]) slots[0] = pokemon;
    else if (!slots[1]) slots[1] = pokemon;
    else slots[1] = pokemon;

    render();
  } catch (error) {
    console.error(error);
  }
};

heads.addEventListener("click", (event) => {
  const button = event.target.closest(".compareClear");
  if (!button) return;
  slots[Number(button.dataset.slot)] = null;
  render();
});

createPicker(body.querySelector(".picker"), addToCompare);

render();
