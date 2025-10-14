const Inventory = {
  buyShuffle() {
    if (StorageAPI.getCoins() >= 100) {
      StorageAPI.addCoins(-100);
      alert("✅ Shuffle खरीदी गई!");
    } else alert("❌ Coins कम हैं!");
  }
};

document.getElementById("buyShuffle").onclick = Inventory.buyShuffle;
document.getElementById("closeShop").onclick = () => {
  document.getElementById("shopModal").classList.remove("show");
};
