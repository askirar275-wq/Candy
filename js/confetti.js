// js/confetti.js - small confetti burst (vanilla)
const Confetti = (function(){
  function burst(opts = {}){
    const count = opts.count || 60;
    const colors = opts.colors || ['#FFC107','#FF5252','#4CAF50','#2196F3','#E91E63'];
    const duration = opts.duration || 1800;

    const c = document.createElement('canvas');
    c.style.position = 'fixed';
    c.style.left = '0';
    c.style.top = '0';
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.pointerEvents = 'none';
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    document.body.appendChild(c);
    const ctx = c.getContext('2d');

    const pieces = [];
    for(let i=0;i<count;i++){
      pieces.push({
        x: Math.random() * c.width,
        y: -20 - Math.random()*200,
        vx: (Math.random()-0.5) * 6,
        vy: 2 + Math.random()*6,
        size: 6 + Math.random()*10,
        color: colors[i % colors.length],
        rot: Math.random()*Math.PI,
        vr: (Math.random()-0.5)*0.2,
        life: duration
      });
    }

    let start = performance.now();
    function frame(now){
      const t = now - start;
      ctx.clearRect(0,0,c.width,c.height);
      for(const p of pieces){
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity
        p.rot += p.vr;
        p.life -= 16;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
      }
      if(t < duration){
        requestAnimationFrame(frame);
      } else {
        document.body.removeChild(c);
      }
    }
    requestAnimationFrame(frame);
  }

  return { burst };
})();
