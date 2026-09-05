import { getPokemon, spriteUrl } from "./api.js";
import { createPicker } from "./picker.js";

const body = document.querySelector(".teamBody");
const slotsList = body.querySelector(".teamSlots");
const totalBox = body.querySelector(".teamTotal");

const STORAGE_KEY = "pokedex.team";
const MAX_MEMBERS = 6;

// Corrupted storage must never brick the app: keep only plausible ids.
const loadTeam = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((id) => Number.isInteger(id) && id > 0);
  } catch {
    return [];
  }
};

let team = loadTeam();

const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(team));

export const isInTeam = (id) => team.includes(id);

export const renderTeam = async () => {
  // A member whose fetch fails still occupies its slot (and can be removed).
  const members = await Promise.all(
    team.map((id) =>
      getPokemon(id).catch(() => ({ id, name: `#${id}`, statsTotal: 0 }))
    )
  );

  const slots = [];
  for (let i = 0; i < MAX_MEMBERS; i++) {
    const member = members[i];
    slots.push(
      member
        ? `<li class="teamSlot filled">
            <button class="teamRemove" data-id="${member.id}" title="Remove" aria-label="Remove ${member.name} from the team">✕</button>
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
