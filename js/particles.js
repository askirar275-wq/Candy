// js/particles.js
// small particle burst at DOM element center
const Particles = (function(){
  function burstAt(el, opts = {}) {
    if(!el) return;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width/2;
    const y = rect.top + rect.height/2;
    const count = opts.count || 14;
    const colors = opts.colors || ['#FFC107','#FF5252','#4CAF50','#2196F3','#E91E63'];
    const duration = opts.duration || 700;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const pieces = [];
    for(let i=0;i<count;i++){
      const a = Math.random()*Math.PI*2;
      const speed = 1 + Math.random()*5;
      pieces.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 2,
        size: 4 + Math.random()*6,
        color: colors[i % colors.length],
        life: duration
      });
    }

    const start = performance.now();
    function frame(now){
      const t = now - start;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(const p of pieces){
        p.vy += 0.12; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 16;
        ctx.globalAlpha = Math.max(0, p.life / duration);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size*0.8, 0, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if(t < duration){
        requestAnimationFrame(frame);
      } else {
        document.body.removeChild(canvas);
      }
    }
    requestAnimationFrame(frame);
  }

  return { burstAt };
})();
