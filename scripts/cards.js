const CARD_SUIT_POSITIONS = [
  [[0, 0]],
  [
    [0, -1],
    [0, 1, true]
  ],
  [
    [0, -1],
    [0, 0],
    [0, 1, true]
  ],
  [
    [-1, -1],
    [1, -1],
    [-1, 1, true],
    [1, 1, true]
  ],
  [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1, true],
    [1, 1, true]
  ],
  [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1, true],
    [1, 1, true]
  ],
  [
    [-1, -1],
    [1, -1],
    [0, -0.5],
    [-1, 0],
    [1, 0],
    [-1, 1, true],
    [1, 1, true]
  ],
  [
    [-1, -1],
    [1, -1],
    [0, -0.5],
    [-1, 0],
    [1, 0],
    [0, 0.5, true],
    [-1, 1, true],
    [1, 1, true]
  ],
  [
    [-1, -1],
    [1, -1],
    [-1, -1 / 3],
    [1, -1 / 3],
    [0, 0],
    [-1, 1 / 3, true],
    [1, 1 / 3, true],
    [-1, 1, true],
    [1, 1, true]
  ],
  [
    [-1, -1],
    [1, -1],
    [0, -2 / 3],
    [-1, -1 / 3],
    [1, -1 / 3],
    [-1, 1 / 3, true],
    [1, 1 / 3, true],
    [0, 2 / 3, true],
    [-1, 1, true],
    [1, 1, true]
  ]
];

const CARD_SUITS = {
  spades: { code: "s", icon: "spade.svg", iconWhite: "spade-white.svg", color: "hsl(0, 0%, 15%)" },
  hearts: { code: "h", icon: "heart.svg", iconWhite: "heart-white.svg", color: "hsl(0, 75%, 50%)" },
  clubs: { code: "c", icon: "club.svg", iconWhite: "club-white.svg", color: "hsl(0, 0%, 15%)" },
  diamonds: { code: "d", icon: "diamond.svg", iconWhite: "diamond-white.svg", color: "hsl(0, 75%, 50%)" }
};

const CARD_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createCardElement(rank, suit, options = {}) {
  const suitInfo = CARD_SUITS[suit];
  const isFaceDown = Boolean(options.faceDown);

  if (!suitInfo) {
    throw new Error(`Unknown suit: ${suit}`);
  }

  const card = document.createElement("div");
  card.className = `card card-${rank.toLowerCase()}`;

  if (isFaceDown) {
    const back = document.createElement("div");
    back.className = "card-back";
    card.appendChild(back);
    return card;
  }

  card.style.color = suitInfo.color;

  const cornerTop = document.createElement("div");
  cornerTop.className = "card-corner card-topleft";
  const cornerBottom = document.createElement("div");
  cornerBottom.className = "card-corner card-bottomright";

  const rankTop = document.createElement("div");
  rankTop.className = "card-rank";
  rankTop.textContent = rank;
  const suitTop = document.createElement("div");
  suitTop.className = "card-suit";
  suitTop.style.backgroundImage = `url(assets/cards/icons/${suitInfo.icon})`;

  const rankBottom = document.createElement("div");
  rankBottom.className = "card-rank";
  rankBottom.textContent = rank;
  const suitBottom = document.createElement("div");
  suitBottom.className = "card-suit";
  suitBottom.style.backgroundImage = `url(assets/cards/icons/${suitInfo.icon})`;

  cornerTop.appendChild(rankTop);
  cornerTop.appendChild(suitTop);
  cornerBottom.appendChild(rankBottom);
  cornerBottom.appendChild(suitBottom);

  card.appendChild(cornerTop);
  card.appendChild(cornerBottom);

  if (["J", "Q", "K"].includes(rank)) {
    const royal = document.createElement("div");
    royal.className = "card-royal";
    royal.style.backgroundImage = `url(assets/cards/graphics/${rank.toLowerCase()}${suitInfo.code}-mono.svg)`;

    const royalSuit = document.createElement("div");
    royalSuit.className = "card-royal-suit";
    royalSuit.style.backgroundImage = `url(assets/cards/icons/${suitInfo.iconWhite})`;

    card.appendChild(royal);
    card.appendChild(royalSuit);
    return card;
  }

  const middle = document.createElement("div");
  middle.className = "card-middle";

  const rankIndex = rank === "A" ? 1 : parseInt(rank, 10);
  const positions = CARD_SUIT_POSITIONS[rankIndex - 1] || [];

  positions.forEach(([x, y, flip]) => {
    const suitEl = document.createElement("div");
    suitEl.className = "card-suit";
    suitEl.style.backgroundImage = `url(assets/cards/icons/${suitInfo.icon})`;

    const left = ((x + 1) / 2) * 100;
    const top = ((y + 1) / 2) * 100;
    const rotation = flip ? 180 : 0;
    suitEl.style.left = `${left}%`;
    suitEl.style.top = `${top}%`;
    suitEl.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

    middle.appendChild(suitEl);
  });

  card.appendChild(middle);
  return card;
}

function createDeck() {
  const deck = [];
  Object.keys(CARD_SUITS).forEach(suit => {
    CARD_RANKS.forEach(rank => {
      deck.push({ rank, suit });
    });
  });
  return deck;
}

function drawCard(deck) {
  if (!deck.length) return null;
  const index = Math.floor(Math.random() * deck.length);
  return deck.splice(index, 1)[0];
}

function renderHand(container, cards) {
  if (!container) return;
  container.innerHTML = "";
  cards.forEach(card => {
    if (card && card.element) {
      container.appendChild(card.element);
      return;
    }
    if (!card) return;
    container.appendChild(createCardElement(card.rank, card.suit, card.options || {}));
  });
}

window.CardDeck = {
  createCardElement,
  createDeck,
  drawCard,
  renderHand
};
