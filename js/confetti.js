// js/confetti.js - very small confetti stub
window.Confetti = {
  fire: function(){
    // simple visual: flash body bg briefly
    const el = document.body;
    el.style.transition = 'background 0.25s';
    const prev = el.style.background;
    el.style.background = 'radial-gradient(circle at 20% 20%, #fff6a3, transparent 20%), radial-gradient(circle at 80% 80%, #a3f0ff, transparent 20%)';
    setTimeout(()=> el.style.background = prev, 350);
    console.log('[CONFETTI] fired');
  }
};
console.log('[CONFETTI] loaded');
