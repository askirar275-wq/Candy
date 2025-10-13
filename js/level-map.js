// simple level map UI
(function(){
  const levels = [ {id:1,title:'Beginner'}, {id:2,title:'Explorer'}, {id:3,title:'Challenger'} ];
  function render(){
    const el=document.getElementById('levelList'); if(!el) return;
    el.innerHTML='';
    const unlocked = StorageAPI.getLevel();
    levels.forEach(l=>{
      const d=document.createElement('div'); d.className='level-item';
      d.innerHTML=`<strong>Level ${l.id}</strong><div>${l.title}</div>`;
      if(l.id<=unlocked){ d.style.cursor='pointer'; d.addEventListener('click', ()=>{ window.setGameLevel(l.id); document.getElementById('map-screen').classList.remove('active'); document.getElementById('game-screen').classList.add('active'); if(typeof initGame==='function') initGame(); }); }
      else{ d.style.opacity=.5; }
      el.appendChild(d);
    });
  }
  document.addEventListener('DOMContentLoaded', ()=>{ render(); });
  window.renderLevelMap = render;
  console.log('Loaded: js/level-map.js');
})();
