/* js/level-map.js — Candyland Level Map Screen */

(function(){
  console.log("Loaded: level-map.js ✅");

  const LEVELS = 10; // कितने levels दिखाने हैं
  const unlocked = Number(localStorage.getItem('level') || 1);

  const map = document.getElementById('mapCanvas');

  const positions = [
    {top:'820px', left:'60px'},
    {top:'720px', left:'280px'},
    {top:'610px', left:'150px'},
    {top:'500px', left:'300px'},
    {top:'400px', left:'80px'},
    {top:'300px', left:'260px'},
    {top:'200px', left:'120px'},
    {top:'100px', left:'310px'},
    {top:'30px',  left:'180px'},
    {top:'-40px', left:'70px'}
  ];

  // अगर bg image नहीं है तो warning
  const bg = map.querySelector('.map-bg');
  if(!bg) console.warn('⚠️ map-bg not found — add map image!');

  // Nodes बनाना
  for(let i=1;i<=LEVELS;i++){
    const node = document.createElement('div');
    node.className = 'level-node' + (i > unlocked ? ' locked' : '');
    node.textContent = i;
    node.style.top = positions[i-1].top;
    node.style.left = positions[i-1].left;

    node.addEventListener('click',()=>{
      if(i > unlocked){
        alert('🔒 यह level अभी locked है!');
        return;
      }
      // level select — index.html पर भेजो
      localStorage.setItem('level', i);
      window.location.href = 'index.html';
    });

    map.appendChild(node);
  }

  // Back home (optional)
  const back = document.getElementById('backHome');
  if(back){
    back.addEventListener('click', ()=> window.location.href='index.html');
  }

})();
