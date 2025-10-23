(function setupResponsiveGrid(){
  const gridEl = document.getElementById('gameGrid');
  if(!gridEl) return;
  function computeCols(){
    const minCell = 56;
    const gap = 12;
    const maxCols = 7;
    const minCols = 5;
    const container = Math.min(window.innerWidth-48, 760);
    let cols = Math.floor((container + gap) / (minCell + gap));
    cols = Math.max(minCols, Math.min(maxCols, cols));
    document.documentElement.style.setProperty('--cols', cols);
  }
  let t;
  window.addEventListener('resize', ()=>{ clearTimeout(t); t=setTimeout(computeCols,120); });
  document.addEventListener('DOMContentLoaded', computeCols);
  computeCols();
})();
