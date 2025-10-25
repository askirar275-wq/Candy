// confetti.js — छोटी confetti burst implementation
(function(global){
  console.log('[CONFETTI] loaded');
  function fire(){
    const duration = 900;
    const colors = ['#ffcc00','#ff77aa','#77ffdd','#66ccff','#aaff66'];
    const count = 30;
    for(let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.background = colors[Math.floor(Math.random()*colors.length)];
      el.style.width = el.style.height = (6 + Math.random()*10) + 'px';
      el.style.left = (10 + Math.random()*80) + '%';
      el.style.top = '-10px';
      el.style.position = 'fixed';
      el.style.zIndex = 9999;
      document.body.appendChild(el);
      const dur = 900 + Math.random()*700;
      el.animate([
        { transform:'translateY(0) rotate(0deg)', opacity:1 },
        { transform:`translateY(${window.innerHeight + 200}px) rotate(${360*Math.random()}deg)`, opacity:0 }
      ], { duration: dur, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = ()=> el.remove();
    }
  }
  global.Confetti = { fire };
})(window);
