/* ===================================================
   🍭 Candy Match — Shop Module (v1.0)
   Handles Shop UI, Coins, Inventory, Local Save
   =================================================== */

console.log("🛒 Shop Module Loaded");

/* ---------- Local State ---------- */
let coins = Number(localStorage.getItem('candy_coins') || 250);
let inv = JSON.parse(localStorage.getItem('candy_inv') || JSON.stringify({
  bomb: 0,
  shuffle: 0,
  moves: 0,
  rainbow: 0
}));

/* ---------- Elements ---------- */
const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');
const shopModal = document.getElementById('shopModal');
const shopCoins = document.getElementById('shopCoins');
const coinsBubble = document.getElementById('coins');
const scoreEl = document.getElementById('score');

/* ---------- Buttons ---------- */
document.getElementById('startBtn').addEventListener('click', () => {
  showScreen('game');
  if (typeof initGame === 'function') initGame();
  else createFallbackBoard();
  updateHUD();
});

document.getElementById('backBtn').addEventListener('click', () => showScreen('home'));
document.getElementById('shopBtn').addEventListener('click', () => openShop());
document.getElementById('openShopBtn').addEventListener('click', () => openShop());
document.getElementById('closeShop').addEventListener('click', () => closeShop());

document.getElementById('installBtn').addEventListener('click', () => alert('Install demo — आप इसे PWA में बदल सकते हैं।'));
document.getElementById('settingsBtn').addEventListener('click', () => alert('Settings — अभी demo में नहीं है।'));

/* ---------- Shop Purchase Buttons ---------- */
document.getElementById('buyBomb').addEventListener('click', () => buyItem('bomb', 200));
document.getElementById('buyShuffle').addEventListener('click', () => buyItem('shuffle', 100));
document.getElementById('buyMoves').addEventListener('click', () => buyItem('moves', 80));
document.getElementById('buyRainbow').addEventListener('click', () => buyItem('rainbow', 350));

/* ---------- Restart / Shuffle Buttons ---------- */
document.getElementById('restartBtn').addEventListener('click', () => {
  if (typeof initGame === 'function') initGame();
  else createFallbackBoard();
});
document.getElementById('shuffleBtn').addEventListener('click', () => {
  if (typeof shuffleBoard === 'function') shuffleBoard();
  else alert('Shuffle: गेम में shuffle function उपलब्ध नहीं।');
});

/* ---------- Core Functions ---------- */

// स्क्रीन बदलना
function showScreen(which) {
  if (which === 'home') {
    homeScreen.classList.add('active');
    gameScreen.classList.remove('active');
  } else if (which === 'game') {
    gameScreen.classList.add('active');
    homeScreen.classList.remove('active');
  }
}

// शॉप खोलना/बंद करना
function openShop() {
  shopModal.style.display = 'flex';
  shopModal.setAttribute('aria-hidden', 'false');
  refreshShopUI();
}
function closeShop() {
  shopModal.style.display = 'none';
  shopModal.setAttribute('aria-hidden', 'true');
}

// खरीदारी
function buyItem(id, price) {
  if (coins < price) {
    alert('कॉइन्स कम हैं — गेम खेलकर जमा करें।');
    return;
  }
  coins -= price;
  inv[id] = (inv[id] || 0) + 1;
  persistState();
  refreshShopUI();
  updateHUD();
  alert('खरीदारी सफल: ' + id + ' ×1');
}

// लोकल स्टोरेज सेव
function persistState() {
  localStorage.setItem('candy_coins', String(coins));
  localStorage.setItem('candy_inv', JSON.stringify(inv));
}

// UI रिफ्रेश
function refreshShopUI() {
  shopCoins.textContent = coins;
  coinsBubble.textContent = coins;
}

// हेडर अपडेट
function updateHUD() {
  scoreEl.textContent = (window.__score != null) ? window.__score : scoreEl.textContent;
  coinsBubble.textContent = coins;
  shopCoins.textContent = coins;
}

// बेसिक गेम बोर्ड (fallback)
function createFallbackBoard() {
  const board = document.getElementById('game-board');
  board.innerHTML = '';
  const images = [
    'images/candy1.png', 'images/candy2.png', 'images/candy3.png',
    'images/candy4.png', 'images/candy5.png'
  ];
  for (let i = 0; i < 64; i++) {
    const d = document.createElement('div');
    d.className = 'tile';
    const img = document.createElement('img');
    img.src = images[Math.floor(Math.random() * images.length)];
    img.alt = 'candy';
    d.appendChild(img);
    board.appendChild(d);
  }
}

/* ---------- Boot Init ---------- */
(function boot() {
  refreshShopUI();
  updateHUD();
  console.log('Shop module initialized — coins:', coins, 'inventory:', inv);
})();
