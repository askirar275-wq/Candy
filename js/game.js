function fitTiles(){
  // compute tile size to fit available width inside .board
  const cols = COLS || 8;
  const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 8;
  const boardEl = document.querySelector('.board') || document.querySelector('.board-area') || document.body;
  const wrap = boardEl.getBoundingClientRect();
  const availW = Math.min(wrap.width - 24, window.innerWidth - 40); // margins
  const candidate = Math.floor((availW - gap * (cols - 1)) / cols);
  const size = Math.max(36, Math.min(candidate, 84)); // clamp tile size
  document.documentElement.style.setProperty('--tile', size + 'px');
}
