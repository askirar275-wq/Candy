/* js/shop.js
   Shop module for Candy Match
   - LocalStorage में coins और inventory रखेंगा
   - Buy buttons, Open/Close modal, HUD update
   - सुरक्षित रूप से गेम-फ़ंक्शन (initGame, shuffleBoard) कॉल करेगा यदि उपलब्ध हों
*/

/* ====== CONFIG ====== */
const SHOP_KEYS = {
  COINS: 'candy_coins',
  INV: 'candy_inv' // object { bomb:0, shuffle:0, moves:0, rainbow:0 }
};

const SHOP_PRICES = {
  bomb: 200,
  shuffle: 100,
  moves: 80,
  rainbow: 350
};

/* ====== INITIAL STATE (localStorage से लोड) ====== */
let shopState = {
  coins: Number(localStorage.getItem(SHOP_KEYS.COINS) || 250), // डेमो शुरूआती coins
  inv: JSON.parse(localStorage.getItem(SHOP_KEYS.INV) || JSON.stringify({ bomb:0, shuffle:0, moves:0, rainbow:0 }))
};

/* ====== DOM REFERENCES (assume HTML IDs मौजूद हैं जैसा आपने भेजा) ====== */
const shopModal = document.getElementById('shopModal');
const shopCoinsEl = document.getElementById('shopCoins');
const coinsBubbleEl = document.querySelector('.coins-bubble') || document.getElementById('coins'); // fallback
const startBtn = document.getElementById('startBtn');
const shopBtn = document.getElementById('shopBtn');
const openShopBtn = document.getElementById('openShopBtn');
const closeShopBtn = document.getElementById('closeShop');
const buyBombBtn = document.getElementById('buyBomb');
const buyShuffleBtn = document.getElementById('buyShuffle');
const buyMovesBtn = document.getElementById('buyMoves');
const buyRainbowBtn = document.getElementById('buyRainbow');
const restartBtn = document.getElementById('restartBtn');
const shuffleBtn = document.getElementById('shuffleBtn');

/* safety checks for missing elements */
function elWarn(name, el) {
  if (!el) console.warn(`shop.js: DOM element "${name}" missing.`);
}

/* warn for important elements */
elWarn('shopModal', shopModal);
elWarn('shopCoins', shopCoinsEl);
elWarn('coinsBubble', coinsBubbleEl);
elWarn('buyBomb', buyBombBtn);
elWarn('buyShuffle', buyShuffleBtn);
elWarn('buyMoves', buyMovesBtn);
elWarn('buyRainbow', buyRainbowBtn);
elWarn('openShopBtn', openShopBtn);
elWarn('closeShop', closeShopBtn);

/* ====== helper: persist state ====== */
function persistShopState() {
  try {
    localStorage.setItem(SHOP_KEYS.COINS, String(shopState.coins));
    localStorage.setItem(SHOP_KEYS.INV, JSON.stringify(shopState.inv));
  } catch (e) {
    console.warn('shop.js: persist failed', e);
  }
}

/* ====== UI refresh ====== */
function refreshShopUI() {
  if (shopCoinsEl) shopCoinsEl.textContent = shopState.coins;
  if (coinsBubbleEl) coinsBubbleEl.textContent = shopState.coins;
  // आप चाहें तो inventory counts को भी HTML में दिखा सकते हैं:
  // उदाहरण: document.getElementById('invBomb').textContent = shopState.inv.bomb || 0;
}

/* ====== Open / Close shop modal ====== */
function openShop() {
  if (!shopModal) return;
  shopModal.style.display = 'flex';
  shopModal.setAttribute('aria-hidden', 'false');
  refreshShopUI();
}
function closeShop() {
  if (!shopModal) return;
  shopModal.style.display = 'none';
  shopModal.setAttribute('aria-hidden', 'true');
}

/* ====== Buy logic ====== */
function canAfford(price) {
  return shopState.coins >= price;
}
function buyItem(id, price) {
  if (!canAfford(price)) {
    alert('कॉइन्स कम हैं — गेम खेलकर जमा करें।');
    return false;
  }
  shopState.coins -= price;
  shopState.inv[id] = (shopState.inv[id] || 0) + 1;
  persistShopState();
  refreshShopUI();
  alert('खरीदारी सफल: ' + id + ' ×1');
  return true;
}

/* ====== Use inventory actions (demo behaviors) ====== */
function useBombFromInventory() {
  if ((shopState.inv.bomb || 0) <= 0) { alert('कोई Bomb नहीं है'); return; }
  shopState.inv.bomb--;
  persistShopState();
  refreshShopUI();
  // गेम में bomb का प्रभाव: यदि game.js में useBombInGame(index) जैसी function हो तो कॉल करें।
  // सरल fallback: game में उपलब्ध किसी फ़ंक्शन को कॉल करें या alert दिखाएँ
  if (typeof placeBombOnRandom === 'function') {
    placeBombOnRandom(); // developer-provided helper (optional)
  } else if (typeof window.placeBombOnRandom === 'function') {
    window.placeBombOnRandom();
  } else if (typeof window.resolveChain === 'function') {
    // fallback: trigger resolveChain to re-evaluate board
    window.resolveChain();
  } else {
    alert('Bomb इस्तेमाल हुआ (demo) — खेल में प्रभाव लागू करें (game.js में function जोड़ें)।');
  }
}

/* ====== Public functions used by other modules (optional) ====== */
window.ShopModule = {
  open: openShop,
  close: closeShop,
  buy: buyItem,
  state: shopState,
  refresh: refreshShopUI
};

/* ====== Event Listeners 연결 ====== */
if (shopBtn) shopBtn.addEventListener('click', openShop);
if (openShopBtn) openShopBtn.addEventListener('click', openShop);
if (closeShopBtn) closeShopBtn.addEventListener('click', closeShop);
if (buyBombBtn) buyBombBtn.addEventListener('click', () => buyItem('bomb', SHOP_PRICES.bomb));
if (buyShuffleBtn) buyShuffleBtn.addEventListener('click', () => buyItem('shuffle', SHOP_PRICES.shuffle));
if (buyMovesBtn) buyMovesBtn.addEventListener('click', () => {
  const ok = buyItem('moves', SHOP_PRICES.moves);
  if (ok) {
    // demo: extra moves add करें
    if (typeof window.addMoves === 'function') window.addMoves(5); // addMoves defined in game.js -> add moves
    else if (typeof window._game !== 'undefined' && typeof window._game.addMoves === 'function') window._game.addMoves(5);
    else alert('Extra moves दी गयीं (demo). गेम में addMoves फ़ंक्शन जोड़ें ताकि इसका प्रभाव दिखे।');
  }
});
if (buyRainbowBtn) buyRainbowBtn.addEventListener('click', () => buyItem('rainbow', SHOP_PRICES.rainbow));

/* Restart / Shuffle linking — यदि गेम में उपयुक्त functions हैं तो कॉल करें */
if (restartBtn) restartBtn.addEventListener('click', () => {
  if (typeof initGame === 'function') initGame();
  else if (window._game && typeof window._game.initGame === 'function') window._game.initGame();
  else alert('Restart: गेम init function उपलब्ध नहीं है।');
});
if (shuffleBtn) shuffleBtn.addEventListener('click', () => {
  if (typeof shuffleBoard === 'function') shuffleBoard();
  else if (window._game && typeof window._game.shuffle === 'function') window._game.shuffle();
  else alert('Shuffle: गेम में shuffle function उपलब्ध नहीं।');
});

/* Quick: Home / Start 버튼 handling (यदि home.js द्वारा न संभाला गया हो) */
const startBtnEl = document.getElementById('startBtn');
if (startBtnEl) {
  startBtnEl.addEventListener('click', () => {
    // hide home screen और गेम शुरू करें
    const home = document.getElementById('home-screen');
    const game = document.getElementById('game-screen');
    if (home) home.classList.remove('active');
    if (game) game.classList.add('active');
    if (typeof initGame === 'function') initGame();
    else if (window._game && typeof window._game.initGame === 'function') window._game.initGame();
  });
}

/* ====== Initialization ====== */
(function shopBoot(){
  refreshShopUI();
  persistShopState(); // ensure saved
  if (window.DEBUG_MODE) console.log('shop.js loaded, shopState:', shopState);
})();
