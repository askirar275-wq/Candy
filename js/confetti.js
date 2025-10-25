// confetti.js
// हल्का canvas confetti — छोटा, dependency-free.
// Usage:
//   Confetti.fire();           // fullscreen burst
//   Confetti.shoot(x,y);       // shoot from page (x,y in client coords)
//   Confetti.stop();           // immediately stop & remove canvas

(function(global){
  const Confetti = {};

  // internal
  let canvas = null, ctx = null, raf = null, particles = [], running = false;
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  function createCanvas(){
    if(canvas) return;
    canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize(){
    if(!canvas) return;
    canvas.width = Math.floor(window.innerWidth * DPR);
    canvas.height = Math.floor(window.innerHeight * DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }

  // particle factory
  function makeParticle(x,y,spread=120,force=400,colors=null){
    colors = colors || ['#ff3b3b','#ffb54d','#ffd86b','#6ee7b7','#6ec8ff','#c388ff'];
    const angle = (Math.random()*spread - spread/2) * (Math.PI/180);
    const speed = (Math.random()*0.6 + 0.6) * (force/800);
    const vx = Math.sin(angle) * speed * 700 * (Math.random()*0.7 + 0.6);
    const vy = -Math.cos(angle) * speed * 700 * (Math.random()*0.7 + 0.6);
    const size = (Math.random()*0.9 + 0.9) * (Math.random()*10 + 7);
    const life = 2.0 + Math.random()*1.6;
    const tilt = (Math.random()*30 - 15);
    const color = colors[Math.floor(Math.random()*colors.length)];
    return {
      x, y, vx, vy, size, life, age:0, tilt, color, rot:Math.random()*360,
      shape: Math.random()<0.5 ? 'rect' : 'circle'
    };
  }

  // make a burst in area
  function burst(count, x,y, spread, force){
    for(let i=0;i<count;i++){
      particles.push(makeParticle(x,y,spread,force));
    }
    if(!running) start();
  }

  // main loop
  function step(t){
    raf = requestAnimationFrame(step);
    const dt = 1/60;
    // clear a bit (use alpha to create trails if you like)
    ctx.clearRect(0,0,canvas.width/DPR,canvas.height/DPR);

    // physics
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.age += dt;
      if(p.age >= p.life){
        particles.splice(i,1); continue;
      }
      // gravity + air drag
      p.vy += 980 * dt * 0.7; // gravity px/s^2 (scaled)
      p.vx *= 0.995;
      p.vy *= 0.995;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += (p.vx * 0.02);

      // draw
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI/180);
      const fade = 1 - (p.age / p.life);
      ctx.globalAlpha = Math.max(0, Math.min(1, fade));
      if(p.shape === 'rect'){
        ctx.fillStyle = p.color;
        const w = p.size, h = p.size * 0.6;
        ctx.fillRect(-w/2, -h/2, w, h);
      } else {
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.arc(0,0,p.size*0.6,0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }

    // stop if none
    if(particles.length===0){
      stop(); // auto cleanup
    }
  }

  function start(){
    if(running) return;
    createCanvas();
    running = true;
    raf = requestAnimationFrame(step);
    // auto-remove canvas a bit after finish (safety)
    setTimeout(()=>{ if(!running && canvas){ removeCanvas(); } }, 2600);
  }
  function stop(){
    running = false;
    if(raf){ cancelAnimationFrame(raf); raf = null; }
    // keep canvas for a short while then remove
    setTimeout(()=>{ if(!running) removeCanvas(); }, 200);
  }
  function removeCanvas(){
    try{
      window.removeEventListener('resize', resize);
      if(canvas){ canvas.parentNode.removeChild(canvas); canvas=null; ctx=null; }
    }catch(e){}
  }

  // public API
  Confetti.fire = function(opts){
    opts = opts || {};
    createCanvas();
    const count = opts.count || 80;
    const centerX = opts.x != null ? opts.x : window.innerWidth / 2;
    const centerY = opts.y != null ? opts.y : Math.min(220, window.innerHeight * 0.25);
    const spread = opts.spread || 120;
    const force = opts.force || 500;
    // burst in a few waves
    for(let w=0; w<3; w++){
      setTimeout(()=> burst(Math.floor(count/3), centerX + (Math.random()*160-80), centerY + (Math.random()*40-20), spread, force), w*80);
    }
  };

  Confetti.shoot = function(x,y,opts){
    opts = opts || {};
    createCanvas();
    burst(opts.count || 24, x, y, opts.spread || 80, opts.force || 420);
  };

  Confetti.stop = function(){ stop(); };

  // auto attach so you can call Confetti.fire() globally
  global.Confetti = Confetti;

})(window);
