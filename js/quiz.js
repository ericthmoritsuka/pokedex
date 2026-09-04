import { getPokemon } from "./api.js";
import { randomAllowedId } from "./gens.js";

const body = document.querySelector(".quizBody");
const image = body.querySelector(".quizImage");
const playButton = body.querySelector(".quizPlay");
const form = body.querySelector(".quizForm");
const input = body.querySelector(".quizInput");
const feedback = body.querySelector(".quizFeedback");
const revealButton = body.querySelector(".quizReveal");
const nextButton = body.querySelector(".quizNext");
const scoreBox = body.querySelector(".quizScore");

const STORAGE_KEY = "pokedex.quizScore";
const score = JSON.parse(
  localStorage.getItem(STORAGE_KEY) ||
    '{"correct":0,"played":0,"streak":0,"best":0}'
);

let mode = "sight"; // "sight" (silhouette) or "sound" (cry)
let target = null;
let revealed = false;

const saveScore = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(score));

const renderScore = () => {
  scoreBox.innerText = `Score ${score.correct}/${score.played} · Streak ${score.streak} · Best ${score.best}`;
};

// "Mr. Mime", "mr-mime" and "mr mime" should all count.
const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

// "nidoran" is a fair answer for either gender.
const ALIASES = { nidoran: ["nidoranf", "nidoranm"] };

const guessMatches = (guess, targetName) => {
  const target = normalize(targetName);
  if (guess === target) return true;
  return (ALIASES[guess] || []).includes(target);
};

const playCry = () => {
  if (!target || !target.cry) return;
  const audio = new Audio(target.cry);
  audio.volume = 0.4;
  audio.play().catch(() => {});
};

const randomPokemon = async () => {
  // In sound mode the pokemon must have a cry to guess from.
  for (let attempt = 0; attempt < 5; attempt++) {
    const pokemon = await getPokemon(randomAllowedId());
    if (mode !== "sound" || pokemon.cry) return pokemon;
  }
  throw new Error("Could not find a pokemon with a cry");
};

const newRound = async () => {
  revealed = false;
  target = null;
  feedback.innerText = "";
  input.value = "";
  nextButton.hidden = true;
  revealButton.hidden = false;
  image.classList.add("mystery");
  image.removeAttribute("src");
  image.hidden = mode === "sound";
  playButton.hidden = mode !== "sound";

  try {
    target = await randomPokemon();
    image.src = target.image;
    if (mode === "sound") playCry();
    input.focus();
  } catch (error) {
    feedback.innerText = "Could not load a Pokémon. Try again!";
    console.error(error);
  }
};

const finishRound = (won) => {
  revealed = true;
  image.classList.remove("mystery");
  image.hidden = false;
  playButton.hidden = true;
  nextButton.hidden = false;
  revealButton.hidden = true;

  score.played++;
  if (won) {
    score.correct++;
    score.streak++;
    score.best = Math.max(score.best, score.streak);
    feedback.innerText = `Correct! It's ${target.name.toUpperCase()}!`;
  } else {
    score.streak = 0;
    feedback.innerText = `It's ${target.name.toUpperCase()}!`;
  }
  saveScore();
  renderScore();
  playCry();
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!target || revealed || !input.value.trim()) return;

  if (guessMatches(normalize(input.value), target.name)) {
    finishRound(true);
  } else {
    feedback.innerText = "Not this one, try again!";
  }
});

revealButton.addEventListener("click", () => {
  if (target && !revealed) finishRound(false);
});

nextButton.addEventListener("click", newRound);

playButton.addEventListener("click", playCry);

body.querySelector(".quizModes").addEventListener("click", (event) => {
  const button = event.target.closest(".quizMode");
  if (!button || button.dataset.mode === mode) return;

  mode = button.dataset.mode;
  body.querySelectorAll(".quizMode").forEach((modeButton) => {
    modeButton.classList.toggle("active", modeButton === button);
  });
  newRound();
});

export const enterQuiz = () => {
  renderScore();
  if (!target) newRound();
};
