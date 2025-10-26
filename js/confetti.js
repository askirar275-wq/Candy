// confetti.js - बहुत छोटा confetti effect (canvas पर)
(function(global){
  function fire(){
    // create canvas overlay
    const cvs = document.createElement('canvas');
    cvs.style.position='fixed'; cvs.style.left=0; cvs.style.top=0; cvs.style.width='100%'; cvs.style.height='100%';
    cvs.style.zIndex=9998; cvs.width = innerWidth; cvs.height = innerHeight;
    document.body.appendChild(cvs);
    const ctx = cvs.getContext('2d');
    const particles=[];
    const colors=['#ff6b6b','#ffd93b','#6bffb3','#66b0ff','#c58cff'];
    for(let i=0;i<80;i++){
      particles.push({
        x: innerWidth/2 + (Math.random()-0.5)*200,
        y: innerHeight/3 + (Math.random()-0.5)*80,
        vx: (Math.random()-0.5)*6,
        vy: (Math.random()-1.5)*8,
        r: 6+Math.random()*6,
        c: colors[Math.floor(Math.random()*colors.length)]
      });
    }
    let t=0;
    function draw(){
      t++;
      ctx.clearRect(0,0,cvs.width,cvs.height);
      particles.forEach(p=>{
        p.vy += 0.25; p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.ellipse(p.x,p.y,p.r,p.r,0,0,2*Math.PI); ctx.fill();
      });
      if(t<120) requestAnimationFrame(draw);
      else { document.body.removeChild(cvs); }
    }
    draw();
  }
  global.Confetti = { fire };
})(window);
