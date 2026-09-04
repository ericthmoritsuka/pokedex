import { getPokemon, spriteUrl } from "./api.js";
import { createPicker } from "./picker.js";

const body = document.querySelector(".teamBody");
const slotsList = body.querySelector(".teamSlots");
const totalBox = body.querySelector(".teamTotal");

const STORAGE_KEY = "pokedex.team";
const MAX_MEMBERS = 6;

let team = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(team));

export const isInTeam = (id) => team.includes(id);

export const renderTeam = async () => {
  const members = (
    await Promise.all(team.map((id) => getPokemon(id).catch(() => null)))
  ).filter(Boolean);

  const slots = [];
  for (let i = 0; i < MAX_MEMBERS; i++) {
    const member = members[i];
    slots.push(
      member
        ? `<li class="teamSlot filled">
            <button class="teamRemove" data-id="${member.id}" title="Remove">✕</button>
            <img src="${spriteUrl(member.id)}" alt="${member.name}">
            <span class="cap">${member.name}</span>
          </li>`
        : `<li class="teamSlot empty">
            <img src="./img/pokeball.png" alt="">
            <span>empty</span>
          </li>`
    );
  }
  slotsList.innerHTML = slots.join("");

  totalBox.innerText = members.length
    ? `Combined base stats: ${members.reduce((sum, m) => sum + m.statsTotal, 0)}`
    : "";
};

// Adds when absent, removes when present; returns whether the pokemon
// ends up on the team.
export const toggleTeamMember = async (id) => {
  if (team.includes(id)) {
    team = team.filter((memberId) => memberId !== id);
  } else if (team.length < MAX_MEMBERS) {
    team.push(id);
  } else {
    totalBox.innerText = "Your team is full! Remove someone first.";
    return false;
  }
  save();
  await renderTeam();
  return team.includes(id);
};

slotsList.addEventListener("click", (event) => {
  const button = event.target.closest(".teamRemove");
  if (button) toggleTeamMember(Number(button.dataset.id));
});

createPicker(body.querySelector(".picker"), toggleTeamMember);
