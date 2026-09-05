import { getPokemonList, spriteUrl } from "./api.js";
import { isAllowed, selectionLabel, onGenChange } from "./gens.js";

const body = document.querySelector(".nameallBody");
const setup = body.querySelector(".naSetup");
const game = body.querySelector(".naGame");
const summary = body.querySelector(".naSummary");
const timesBox = body.querySelector(".naTimes");
const silhouettesInput = body.querySelector(".naSilhouettes");
const startButton = body.querySelector(".naStart");
const input = body.querySelector(".naInput");
const timerBox = body.querySelector(".naTimer");
const countBox = body.querySelector(".naCount");
const giveUpButton = body.querySelector(".naGiveUp");
const result = body.querySelector(".naResult");
const slotsList = body.querySelector(".naSlots");

const TIME_OPTIONS = [5, 10, 15, 20, 30, 60];
let minutes = 15;

let pool = []; // [{ id, name, normalized }]
let found = new Set();
let timeLeft = 0;
let timer = null;
let playing = false;

const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

// One guess that legitimately means several pokemon.
const ALIASES = { nidoran: ["nidoranf", "nidoranm"] };

const renderSetup = async () => {
  try {
    const list = await getPokemonList();
    const count = list.filter((pokemon) => isAllowed(pokemon.id)).length;
    summary.innerText = `Can you name all ${count} Pokémon of ${selectionLabel()}? Pick generations or a game in the bars above.`;
  } catch (error) {
    summary.innerText = "Could not reach PokéAPI.";
    console.error(error);
  }

  timesBox.innerHTML = TIME_OPTIONS.map(
    (option) =>
      `<button type="button" class="naTime ${option === minutes ? "active" : ""}" data-minutes="${option}">${option} min</button>`
  ).join("");
};

const formatTime = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const updateHud = () => {
  timerBox.innerText = formatTime(timeLeft);
  countBox.innerText = `${found.size}/${pool.length}`;
};

const stopTimer = () => {
  clearInterval(timer);
  timer = null;
};

const finish = (message) => {
  playing = false;
  stopTimer();
  input.disabled = true;

  // Reveal what was missed.
  for (const pokemon of pool) {
    if (found.has(pokemon.id)) continue;
    const slot = slotsList.querySelector(`[data-id="${pokemon.id}"]`);
    slot.classList.add("missed");
    slot.querySelector(".naName").innerText = pokemon.name.replaceAll("-", " ");
    const sprite = slot.querySelector("img");
    if (sprite) sprite.classList.remove("mystery");
  }

  result.innerText = `${message} You named ${found.size} of ${pool.length}!`;
  result.hidden = false;
  giveUpButton.innerText = "New game";
};

const start = async () => {
  const list = await getPokemonList();
  pool = list
    .filter((pokemon) => isAllowed(pokemon.id))
    .map((pokemon) => ({
      id: pokemon.id,
      name: pokemon.name,
      normalized: normalize(pokemon.name),
    }));

  // A zero-pokemon pool would be an unwinnable 0/0 game.
  if (!pool.length) {
    summary.innerText =
      "No Pokémon in this selection — change the filters above and try again.";
    return;
  }

  found = new Set();
  playing = true;
  timeLeft = minutes * 60;
  const useSilhouettes = silhouettesInput.checked;

  slotsList.innerHTML = pool
    .map(
      (pokemon) => `<li class="naSlot" data-id="${pokemon.id}">
        <span class="naNum">#${pokemon.id}</span>
        ${useSilhouettes ? `<img class="mystery" loading="lazy" width="40" height="40" src="${spriteUrl(pokemon.id)}" alt="">` : ""}
        <span class="naName"></span>
      </li>`
    )
    .join("");

  setup.hidden = true;
  game.hidden = false;
  result.hidden = true;
  input.disabled = false;
  input.value = "";
  giveUpButton.innerText = "Give up";
  updateHud();
  input.focus();

  stopTimer();
  timer = setInterval(() => {
    timeLeft--;
    updateHud();
    if (timeLeft <= 0) finish("Time's up!");
  }, 1000);
};

const accept = (match) => {
  found.add(match.id);
  input.value = "";

  const slot = slotsList.querySelector(`[data-id="${match.id}"]`);
  slot.classList.add("found");
  slot.querySelector(".naName").innerText = match.name.replaceAll("-", " ");
  const sprite = slot.querySelector("img");
  if (sprite) sprite.classList.remove("mystery");

  updateHud();
  if (found.size === pool.length) finish("You got them all! 🎉");
};

const exactMatches = () => {
  const guess = normalize(input.value);
  if (!guess) return [];
  const names = ALIASES[guess] || [guess];
  return pool.filter(
    (pokemon) => names.includes(pokemon.normalized) && !found.has(pokemon.id)
  );
};

// Exact names are accepted the moment they're typed: "paras" fills Paras
// right away even if you were heading for "parasect" — just type the
// longer name again for the other one.
input.addEventListener("input", () => {
  if (!playing) return;
  exactMatches().forEach(accept);
});

input.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !playing) return;
  event.preventDefault();
  exactMatches().forEach(accept);
});

timesBox.addEventListener("click", (event) => {
  const button = event.target.closest(".naTime");
  if (!button) return;
  minutes = Number(button.dataset.minutes);
  timesBox.querySelectorAll(".naTime").forEach((timeButton) => {
    timeButton.classList.toggle("active", timeButton === button);
  });
});

startButton.addEventListener("click", start);

giveUpButton.addEventListener("click", () => {
  if (playing) {
    finish("Gave up!");
  } else {
    // Back to the setup screen for a new game.
    stopTimer();
    game.hidden = true;
    setup.hidden = false;
    renderSetup();
  }
});

onGenChange(() => {
  if (!playing && game.hidden) renderSetup();
});

export const enterNameAll = () => {
  if (game.hidden) renderSetup();
};
