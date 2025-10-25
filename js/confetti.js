// 🎉 Confetti.js - visual celebration
(function(global){
  console.log('[CONFETTI] लोड हो गया ✅');

  const Confetti = {
    fire() {
      console.log('[CONFETTI] 🎊 Fire called!');
      const duration = 1200;
      const end = Date.now() + duration;

      (function frame() {
        const colors = ['#ff0', '#f0f', '#0ff', '#f66', '#6f6'];
        const particle = document.createElement('div');
        particle.className = 'confetti';
        particle.style.position = 'fixed';
        particle.style.width = '8px';
        particle.style.height = '8px';
        particle.style.borderRadius = '50%';
        particle.style.background = colors[Math.floor(Math.random()*colors.length)];
        particle.style.left = Math.random()*100 + '%';
        particle.style.top = '-10px';
        particle.style.zIndex = 9999;
        document.body.appendChild(particle);

        const fall = particle.animate([
          { transform: 'translateY(0px)', opacity: 1 },
          { transform: 'translateY(100vh)', opacity: 0 }
        ], { duration: 1500 + Math.random()*1000, easing: 'ease-out' });

        fall.onfinish = ()=> particle.remove();
        if(Date.now() < end) requestAnimationFrame(frame);
      })();
    }
  };
  global.Confetti = Confetti;
})(window);
