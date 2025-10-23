// tiny confetti: create random colored squares falling for short time
window.CMConfetti = {
  burst(x,y, count=20){
    const container = document.createElement('div');
    container.style.position='fixed';
    container.style.left=0; container.style.top=0;
    container.style.pointerEvents='none'; container.style.zIndex=9999;
    document.body.appendChild(container);
    for(let i=0;i<count;i++){
      const d = document.createElement('div');
      d.style.position='absolute';
      d.style.left=(x + (Math.random()*120-60))+'px';
      d.style.top=(y + (Math.random()*40-20))+'px';
      d.style.width='10px'; d.style.height='14px';
      d.style.background=['#ffd966','#ff7aa2','#79d2ff','#a3ff9b'][i%4];
      d.style.opacity = '0.95';
      d.style.transform = `translateY(${-(Math.random()*20)}px) rotate(${Math.random()*360}deg)`;
      d.style.transition = `transform ${0.9+Math.random()*0.6}s ease-in, opacity 0.9s linear`;
      container.appendChild(d);
      setTimeout(()=> d.style.transform = `translateY(${300+Math.random()*200}px) rotate(${Math.random()*720}deg)`,10);
      setTimeout(()=> d.style.opacity='0', 900+Math.random()*300);
    }
    setTimeout(()=> container.remove(), 1400);
  }
};
