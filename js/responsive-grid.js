// grid responsive variables compute — include before UI render
(function setupResponsiveGrid(){
  const gridEl = document.getElementById('gameGrid');
  function computeGridVars(){
    if(!gridEl) return;
    const minCell = 48, maxCell = 72, gap=12, minCols=5, maxCols=8;
    const parent = gridEl.parentElement || document.body;
    const avail = Math.min(parent.getBoundingClientRect().width || window.innerWidth, window.innerWidth - 32);
    let chosen=minCols, chosenSize=minCell;
    for(let cols=maxCols; cols>=minCols; cols--){
      const requiredMin = cols*minCell + (cols-1)*gap;
      if(requiredMin <= avail){
        const size = Math.min(maxCell, Math.floor((avail - (cols-1)*gap)/cols));
        chosen = cols; chosenSize = Math.max(minCell, size);
        break;
      }
    }
    document.documentElement.style.setProperty('--cols', chosen);
    document.documentElement.style.setProperty('--cell-size', chosenSize+'px');
    document.documentElement.style.setProperty('--gap', gap+'px');
    console.log('[GRID] --cols', chosen, '--cell-size', chosenSize);
  }
  window.addEventListener('resize', ()=> setTimeout(computeGridVars,100));
  window.addEventListener('load', computeGridVars);
  document.addEventListener('DOMContentLoaded', computeGridVars);
  computeGridVars();
})();
