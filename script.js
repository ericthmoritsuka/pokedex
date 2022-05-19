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

const clickHandler = (event) => {
  event.preventDefault();

  //pokemon selecionado e procurando na lista
  const escolha = event.target.alt;
  const pokemon = pokedex.find((entry) => entry.name === escolha);

  // ajustando o tipo do pokemon
  tipo.removeAttribute("class");
  tipo.classList.add("type");
  tipo.innerText = pokemon.type;
  tipo.classList.add(pokemon.type);

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

  imagem.removeAttribute("class");
  imagem.classList.add("image");

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
