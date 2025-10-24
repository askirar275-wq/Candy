(function setupResponsiveGrid(){
  const gridEl = document.getElementById('gameGrid');
  if(!gridEl) return;

  function computeCols(){
    const minCell = 56;
    const gap = 12;
    const maxCols = 8;
    const minCols = 5;
    const container = Math.min(window.innerWidth*0.92,720);
    let cols = Math.floor((container + gap) / (minCell + gap));
    cols = Math.max(minCols, Math.min(maxCols, cols));
    gridEl.style.setProperty('--cols', cols);
    // also set --cell-size so grid fits
    const width = Math.min(container, window.innerWidth - 24);
    const cellSize = Math.floor((width - (cols-1)*gap) / cols);
    gridEl.style.setProperty('--cell-size', `${cellSize}px`);
  }

  let t;
  window.addEventListener('resize', ()=> { clearTimeout(t); t = setTimeout(computeCols, 120); });
  document.addEventListener('DOMContentLoaded', computeCols);
  computeCols();
})();
