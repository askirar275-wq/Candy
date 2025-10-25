// js/responsive-grid.js
(function setupResponsiveGrid(){
  const gridEl = document.getElementById('gameGrid');
  if(!gridEl) return;
  function computeGridVars(){
    const minCell = 48;
    const maxCell = 72;
    const gap = 12;
    const minCols = 5;
    const maxCols = 8;
    const parent = gridEl.parentElement || document.body;
    const avail = Math.min(parent.getBoundingClientRect().width || window.innerWidth, window.innerWidth - 32);
    let chosen = minCols, chosenSize = minCell;
    for(let cols = maxCols; cols >= minCols; cols--){
      const requiredMin = cols * minCell + (cols - 1) * gap;
      if(requiredMin <= avail){
        const size = Math.min(maxCell, Math.floor((avail - (cols - 1) * gap) / cols));
        chosen = cols; chosenSize = Math.max(minCell, size);
        break;
      }
    }
    document.documentElement.style.setProperty('--cols', chosen);
    document.documentElement.style.setProperty('--cell-size', chosenSize + 'px');
    document.documentElement.style.setProperty('--gap', gap + 'px');
    if(gridEl) gridEl.style.setProperty('--cols', chosen);
  }
  computeGridVars();
  let t;
  window.addEventListener('resize', ()=>{ clearTimeout(t); t = setTimeout(computeGridVars, 120); });
  window.addEventListener('load', computeGridVars);
})();
