import { getPokemon, TOTAL_POKEMON } from "./api.js";

const body = document.querySelector(".quizBody");
const image = body.querySelector(".quizImage");
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

let target = null;
let revealed = false;

const saveScore = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(score));

const renderScore = () => {
  scoreBox.innerText = `Score ${score.correct}/${score.played} · Streak ${score.streak} · Best ${score.best}`;
};

// "Mr. Mime", "mr-mime" and "mr mime" should all count.
const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

const newRound = async () => {
  revealed = false;
  target = null;
  feedback.innerText = "";
  input.value = "";
  nextButton.hidden = true;
  revealButton.hidden = false;
  image.classList.add("mystery");
  image.removeAttribute("src");

  try {
    target = await getPokemon(1 + Math.floor(Math.random() * TOTAL_POKEMON));
    image.src = target.image;
    input.focus();
  } catch (error) {
    feedback.innerText = "Could not load a Pokémon. Try again!";
    console.error(error);
  }
};

const finishRound = (won) => {
  revealed = true;
  image.classList.remove("mystery");
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

  if (target.cry) {
    const audio = new Audio(target.cry);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  }
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!target || revealed || !input.value.trim()) return;

  if (normalize(input.value) === normalize(target.name)) {
    finishRound(true);
  } else {
    feedback.innerText = "Not this one, try again!";
  }
});

revealButton.addEventListener("click", () => {
  if (target && !revealed) finishRound(false);
});

nextButton.addEventListener("click", newRound);

export const enterQuiz = () => {
  renderScore();
  if (!target) newRound();
};
