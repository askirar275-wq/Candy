// grid-size.js
(function(){
  const grid = document.querySelector('.game-grid');
  const card = document.querySelector('.card');
  if(!grid || !card) return;

  function recompute(){
    // card inner width for grid to fit
    const style = getComputedStyle(card);
    const padLeft = parseFloat(style.paddingLeft) || 20;
    const padRight = parseFloat(style.paddingRight) || 20;
    const usable = Math.min(card.clientWidth - (padLeft + padRight), window.innerWidth - 32);

    // choose cell size based on usable width; try sizes 64,58,52,46
    const possibleSizes = [64,58,52,46,40];
    let chosen = 46;
    let cols = 6;
    for(let s of possibleSizes){
      // how many columns can fit?
      const maxCols = Math.floor((usable + 12) / (s + 12)); // gap 12
      if(maxCols >= 5){ chosen = s; cols = Math.min(maxCols, 8); break; }
    }
    // fallback minimum
    if(cols < 4){ cols = Math.max(4, Math.floor(usable / 44)); }

    // apply CSS variable and template
    grid.style.setProperty('--cell-size', chosen + 'px');
    grid.style.gridTemplateColumns = `repeat(${cols}, ${chosen}px)`;
    // constrain max-width so nothing overflows
    grid.style.maxWidth = `calc(${chosen}px * ${cols} + ${12 * (cols - 1)}px)`;
  }

  // run initially and on resize/orientation
  recompute();
  window.addEventListener('resize', throttle(recompute, 120));
  window.addEventListener('orientationchange', recompute);

  // tiny throttle
  function throttle(fn, wait){
    let t = null;
    return function(...args){
      if(t) return;
      t = setTimeout(()=>{ t = null; fn.apply(this,args); }, wait);
    }
  }
})();
