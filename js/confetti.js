// js/confetti.js
// Lightweight confetti: create and launch confetti particles on-screen.
// Usage: Confetti.launch({count: 80, spread: 60, lifetime: 2200});

(function(){
  const Confetti = {};
  let canvas = null, ctx = null, W = 0, H = 0, particles = [], rafId = null;

  function ensureCanvas(){
    if(canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = 9999;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize(){
    if(!canvas) return;
    W = canvas.width = Math.floor(window.innerWidth * devicePixelRatio);
    H = canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx && ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  }

  function random(min, max){ return Math.random()*(max-min)+min; }
  function randInt(min,max){ return Math.floor(random(min,max+1)); }

  function createParticle(x,y, color, angle, speed, size, lifetime, gravity, drift){
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color,
      life: lifetime,
      ttl: lifetime,
      gravity,
      drift,
      tilt: random(-0.5,0.5),
      tiltSpeed: random(-0.02,0.02),
      rotation: random(0,Math.PI*2),
      spin: random(-0.15,0.15)
    };
  }

  function step(ts){
    ctx.clearRect(0,0,window.innerWidth, window.innerHeight);
    const now = Date.now();
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      const dt = 16; // approx frame
      p.life -= dt;
      if(p.life <= 0 || p.x < -50 || p.x > window.innerWidth+50){
        particles.splice(i,1);
        continue;
      }
      // physics
      p.vy += p.gravity * (dt/16);
      p.x += p.vx * (dt/16) + p.drift * (dt/180);
      p.y += p.vy * (dt/16);
      p.rotation += p.spin;
      p.tilt += p.tiltSpeed;

      // draw rectangle as small confetti
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.transform(1, p.tilt*0.6, -p.tilt*0.6, 1, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
      ctx.restore();
    }

    if(particles.length > 0) rafId = requestAnimationFrame(step);
    else {
      cancelAnimationFrame(rafId);
      rafId = null;
      // leave canvas in place (hidden) — we can remove it to free DOM if wanted
    }
  }

  Confetti.launch = function(opts){
    opts = opts || {};
    const count = opts.count || 80;
    const colors = opts.colors || ['#ff6b6b','#ffd166','#8a63ff','#6bffb2','#4dabf7','#ff97c2'];
    const spread = (opts.spread || 60) * Math.PI/180; // degrees to radians
    const centerX = (opts.x !== undefined) ? opts.x : window.innerWidth/2;
    const centerY = (opts.y !== undefined) ? opts.y : Math.max(80, window.innerHeight*0.18);
    const lifetime = opts.lifetime || 2000; // ms
    const gravity = (opts.gravity !== undefined) ? opts.gravity : 0.18;
    const drift = (opts.drift !== undefined) ? opts.drift : 0.6;
    const sizeMin = opts.sizeMin || 6;
    const sizeMax = opts.sizeMax || 12;

    ensureCanvas();

    for(let i=0;i<count;i++){
      const angle = -Math.PI/2 + random(-spread/2, spread/2) + random(-0.6,0.6);
      const speed = random(2.6, 6.2);
      const size = random(sizeMin, sizeMax);
      const color = colors[randInt(0, colors.length-1)];
      const p = createParticle(centerX + random(-60,60), centerY + random(-40,40), color, angle, speed, size, lifetime, gravity*random(0.8,1.2), drift*random(-0.8,0.8));
      particles.push(p);
    }

    if(!rafId){
      rafId = requestAnimationFrame(step);
    }

    // auto-clear after lifetime + buffer
    setTimeout(()=> {
      // slowly reduce particles by setting life to small
      particles.forEach(p=> p.life = Math.min(p.life, 120));
    }, lifetime + 100);
  };

  // expose
  window.Confetti = Confetti;
})();
