// js/grid-responsive.js
// runs early, sets --cols CSS var on #gameGrid so Game can read it later
(function setupResponsiveGrid(){
  const gridEl = document.getElementById('gameGrid');
  if(!gridEl){
    // try again when DOM ready (in case this runs before DOM)
    document.addEventListener('DOMContentLoaded', () => {
      const g = document.getElementById('gameGrid');
      if(g) computeColsFor(g);
    });
    return;
  }

  function computeColsFor(gridEl){
    // target cell size (desired) — tweak if you want bigger/smaller cells
    const minCell = 56; // px (desired cell size)
    const gap = 12; // must match CSS gap in .game-grid
    const maxCols = 8;
    const minCols = 5;

    // container available width (use max-width cap)
    const container = Math.min(gridEl.getBoundingClientRect().width || window.innerWidth * 0.92, 680);
    // compute how many columns fit with gap spacing
    let cols = Math.floor((container + gap) / (minCell + gap));
    cols = Math.max(minCols, Math.min(maxCols, cols));
    // set CSS var on element
    gridEl.style.setProperty('--cols', cols);
    // also store as dataset for JS read
    gridEl.dataset.cols = cols;
    return cols;
  }

  function computeCols(){
    const el = document.getElementById('gameGrid');
    if(el) computeColsFor(el);
  }

  // run on load and resize (debounced)
  let t;
  window.addEventListener('resize', ()=> { clearTimeout(t); t = setTimeout(computeCols, 120); });
  document.addEventListener('DOMContentLoaded', computeCols);
  // immediate run in case DOM already ready
  computeCols();
})();
