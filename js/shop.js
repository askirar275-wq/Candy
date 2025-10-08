// ===== Shop Logic =====
document.addEventListener('DOMContentLoaded', () => {
  const coinEl = document.getElementById('coins-count');
  updateCoinDisplay(coinEl);
});

function buyItem(item, price) {
  if (spendCoins(price)) {
    addItem(item);
    alert(`✅ आपने ${item} खरीदा!`);
    updateCoinDisplay(document.getElementById('coins-count'));
  } else {
    alert('❌ आपके पास पर्याप्त coins नहीं हैं!');
  }
}
