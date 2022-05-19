const pokedex = [
  {
    name: "Bulbasaur",
    type: "grass",
    type2: "poison",
    number: 1,
    hp: 45,
    attack: 49,
    defense: 49,
    spattack: 65,
    spdefense: 65,
    speed: 45,
    total: 318,
    moves: ["growl", "tackle"],
  },
  {
    name: "Ivysaur",
    type: "grass",
    type2: "poison",
    number: 2,
    hp: 60,
    attack: 62,
    defense: 63,
    spattack: 80,
    spdefense: 80,
    speed: 60,
    total: 405,
    moves: ["vine whip", "razor leaf", "seed bomb", "take down"],
  },
  {
    name: "Venusaur",
    type: "grass",
    type2: "poison",
    number: 3,
    hp: 80,
    attack: 82,
    defense: 83,
    spattack: 100,
    spdefense: 100,
    speed: 80,
    total: 525,
    moves: ["solar beam", "worry seed", "synthesis", "double-edge"],
  },
  {
    name: "Charmander",
    type: "fire",
    number: 4,
    hp: 39,
    attack: 52,
    defense: 43,
    spattack: 60,
    spdefense: 50,
    speed: 65,
    total: 309,
    moves: ["growl", "scratch"],
  },
  {
    name: "Charmeleon",
    type: "fire",
    number: 5,
    hp: 58,
    attack: 64,
    defense: 58,
    spattack: 80,
    spdefense: 65,
    speed: 80,
    total: 405,
    moves: ["ember", "slash", "fire fang", "dragon breath"],
  },
  {
    name: "Charizard",
    type: "fire",
    number: 6,
    hp: 78,
    attack: 84,
    defense: 78,
    spattack: 109,
    spdefense: 85,
    speed: 100,
    total: 534,
    moves: ["flare blitz", "inferno", "fire spin", "scary face"],
  },
  {
    name: "Squirtle",
    type: "water",
    number: 7,
    hp: 44,
    attack: 48,
    defense: 65,
    spattack: 50,
    spdefense: 64,
    speed: 43,
    total: 314,
    moves: ["tackle", "tail whip"],
  },
  {
    name: "Caterpie",
    type: "bug",
    number: 10,
    hp: 45,
    attack: 30,
    defense: 35,
    spattack: 20,
    spdefense: 20,
    speed: 45,
    total: 195,
    moves: ["string shot", "tackle"],
  },
  {
    name: "Pidgey",
    type: "normal",
    type2: "flying",
    number: 16,
    hp: 40,
    attack: 45,
    defense: 40,
    spattack: 35,
    spdefense: 35,
    speed: 56,
    total: 251,
    moves: ["tackle", "sand attack"],
  },
  {
    name: "Rattata",
    type: "normal",
    number: 19,
    hp: 30,
    attack: 56,
    defense: 35,
    spattack: 25,
    spdefense: 35,
    speed: 72,
    total: 253,
    moves: ["tackle", "tail whip"],
  },
  {
    name: "Pikachu",
    type: "eletric",
    number: 25,
    hp: 35,
    attack: 55,
    defense: 40,
    spattack: 50,
    spdefense: 50,
    speed: 90,
    total: 320,
    moves: ["growl", "quick attack"],
  },
];

const listMenu = Array.from(document.querySelectorAll(".thumb"));

const nome = document.querySelector(".name");
const numero = document.querySelector(".number");
const tipo = document.querySelector(".type");
const card = document.querySelector(".card");
const imagem = document.querySelector(".image");
const hp = document.querySelector(".hp");
const attack = document.querySelector(".attack");
const defense = document.querySelector(".defense");
const spattack = document.querySelector(".spattack");
const spdefense = document.querySelector(".spdefense");
const speed = document.querySelector(".speed");
const total = document.querySelector(".total");
const moves = document.querySelector(".moves");

const thumbList = Array.from(document.querySelectorAll(".thumb img"));

const clickHandler = (event) => {
  event.preventDefault();

  thumbList.forEach((thumb) => {
    thumb.removeAttribute("class");
  });
  event.target.classList.add("ativo");

  //pokemon selecionado e procurando na lista
  const escolha = event.target.alt;
  const pokemon = pokedex.find((entry) => entry.name === escolha);

  // ajustando o tipo do pokemon
  tipo.removeAttribute("class");
  tipo.classList.add("type");
  tipo.innerText = pokemon.type;
  tipo.classList.add(pokemon.type);

  // if(pokemon.type2) {
  //   let tipo2 = document.createElement('p')
  //   tipo.parentNode.insertBefore(tipo2, tipo)
  //   tipo2.innerHTML = `<p class="${pokemon.type2}">${pokemon.type2}<p>`
  // }

  //ajustando o card baseado no tipo
  card.removeAttribute("class");
  card.classList.add("card");
  card.classList.add(pokemon.type);

  //ajustando o numero baseado no tipo
  numero.removeAttribute("class");
  numero.classList.add("number");
  numero.classList.add(pokemon.type);

  nome.innerText = pokemon.name;
  numero.innerText = `#${pokemon.number}`;

  imagem.classList.remove("animation");
  void imagem.offsetWidth;
  imagem.classList.add("animation");

  imagem.src = `./img/${pokemon.name}.png`;

  hp.innerText = `HP ${pokemon.hp}`;
  attack.innerText = `ATTACK ${pokemon.attack}`;
  defense.innerText = `DEFENSE ${pokemon.defense}`;
  spattack.innerText = `SP. ATTACK ${pokemon.spattack}`;
  spdefense.innerText = `SP. DEFENSE ${pokemon.spdefense}`;
  speed.innerText = `SPEED ${pokemon.speed}`;
  total.innerText = `TOTAL ${pokemon.total}`;

  moves.innerHTML = "";
  pokemon.moves.map((move) => {
    moves.innerHTML += `<li>${move}</li>`;
  });
};

//adicionando eventos

listMenu.forEach((item) => {
  item.addEventListener("click", clickHandler);
});
