// हल्का confetti — console log करके emoji fall दिखाता है
window.Confetti = (function(){
  return {
    fire: function(){
      try{
        console.log('[CONFETTI] loaded');
        const root = document.createElement('div');
        root.style.position='fixed'; root.style.left=0; root.style.top=0; root.style.width='100%'; root.style.height='100%'; root.style.pointerEvents='none'; root.style.zIndex=99999;
        document.body.appendChild(root);
        const symbols = ['🎉','✨','🍬','💫','🌟'];
        for(let i=0;i<24;i++){
          const d = document.createElement('div'); d.textContent = symbols[i%symbols.length];
          d.style.position='absolute'; d.style.left = (Math.random()*90 + 5)+'%'; d.style.top='-10%';
          d.style.fontSize = (12+Math.random()*24)+'px'; d.style.opacity = 0.95; d.style.transform = `rotate(${Math.random()*360}deg)`;
          root.appendChild(d);
          const dur = 1100 + Math.random()*900;
          d.animate([{transform:d.style.transform, top:'-10%'},{transform:d.style.transform, top:'100%'}], {duration:dur, easing:'linear'});
          setTimeout(()=> d.remove(), dur+50);
        }
        setTimeout(()=> root.remove(), 2200);
      }catch(e){ console.warn('confetti error', e); }
    }
  };
})();
