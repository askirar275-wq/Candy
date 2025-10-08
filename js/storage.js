// ===== Shared Storage System for Game + Shop =====

// LocalStorage keys
const STORAGE_KEYS = {
  coins: 'candy_coins',
  inventory: 'candy_inventory'
};

// Get coins
function getCoins() {
  return parseInt(localStorage.getItem(STORAGE_KEYS.coins) || '0', 10);
}

// Add coins
function addCoins(amount) {
  const total = getCoins() + amount;
  localStorage.setItem(STORAGE_KEYS.coins, total);
  return total;
}

// Deduct coins
function spendCoins(amount) {
  const total = getCoins();
  if (total >= amount) {
    localStorage.setItem(STORAGE_KEYS.coins, total - amount);
    return true;
  }
  return false;
}

// Get inventory
function getInventory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.inventory)) || {};
  } catch {
    return {};
  }
}

// Add an item (like bomb, shuffle, etc.)
function addItem(item) {
  const inv = getInventory();
  inv[item] = (inv[item] || 0) + 1;
  localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(inv));
}

// Utility for updating UI text
function updateCoinDisplay(el) {
  if (el) el.textContent = getCoins();
}
