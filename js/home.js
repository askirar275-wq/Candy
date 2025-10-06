function startGame(){
  // hide/show
  document.getElementById('home-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'block';
  // force re-layout and tile fit
  setTimeout(()=>{
    fitTiles();
    render && render();
    window.scrollTo({top:0,behavior:'smooth'});
  }, 60);
}
