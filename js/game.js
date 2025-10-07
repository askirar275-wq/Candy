/* --------- Resolve chain: pop -> gravity -> refill (coins awarded here) --------- */
function resolveChain(){
  if(isLocked) return;
  isLocked = true;
  combo = 1;

  (function step(){
    const matches = findMatches();
    if(matches.length === 0){
      isLocked = false;
      updateHUD();
      return;
    }

    // 🏆 Score & Coins logic
    const gained = matches.length * 5 * combo; // हर candy के 5 points
    score += gained;

    const coinGained = Math.floor(matches.length / 3); // हर 3 match पर 1 coin
    coins += coinGained;
    persistCoins();

    // 💥 Pop animation (with null safety)
    matches.forEach(i => {
      const t = document.querySelector(`.cell[data-index="${i}"] .tile`);
      if (t && t.classList) {  // ✅ FIX: null check added
        t.classList.add('pop');
        t.style.transform = 'scale(0.2) rotate(-30deg)';
        t.style.opacity = '0';
      }
      board[i] = null;
    });

    // 💰 Coin popup animation
    if (coinGained > 0) showCoinPopup('+' + coinGained + ' 💰');

    combo++;

    // ⏱️ After pop animation → gravity + refill → next chain
    setTimeout(() => {
      applyGravityAndRefill();
      renderBoard();
      setTimeout(() => step(), 250);
    }, 400);
  })();
}
