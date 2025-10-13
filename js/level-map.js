// js/level-map.js
(function(){
  // safety
  function $id(id){ return document.getElementById(id); }
  console.log('Loaded: js/level-map.js');

  // simple level data — आगे बढ़ाने/बदलने के लिए
  const LEVELS = [
    null,
    { id:1, title:'Level 1', x: 80,  y: 80,  unlocked:true },
    { id:2, title:'Level 2', x: 240, y: 140, unlocked:false },
    { id:3, title:'Level 3', x: 80,  y: 260, unlocked:false },
    { id:4, title:'Level 4', x: 240, y: 340, unlocked:false },
    { id:5, title:'Level 5', x: 420, y: 220, unlocked:false }
  ];

  // optionally read saved unlocked level from localStorage (simple API)
  const Storage = {
    getLevel: function(){
      try { return Number(localStorage.getItem('candy_level') || 1); } catch(e){ return 1; }
    },
    setLevel: function(n){
      try { localStorage.setItem('candy_level', String(n)); } catch(e){}
    }
  };

  // render map nodes
  function renderMap(){
    const container = $id('mapCanvas');
    if(!container) { console.warn('mapCanvas not found'); return; }
    container.innerHTML = ''; // clear

    // optional background image if exists
    const bg = document.createElement('div');
    bg.style.position = 'absolute';
    bg.style.left = '0';
    bg.style.top = '0';
    bg.style.right = '0';
    bg.style.bottom = '0';
    bg.style.pointerEvents = 'none';
    container.appendChild(bg);

    const unlockedLevel = Storage.getLevel() || 1;

    // draw lines between nodes (simple sequential path)
    for(let i=1;i<LEVELS.length;i++){
      const a = LEVELS[i];
      const b = LEVELS[i+1];
      if(!a || !b) continue;
      const line = document.createElement('div');
      line.className = 'map-line';
      // compute length & angle
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      line.style.width = (len) + 'px';
      line.style.left = (a.x + 36) + 'px'; // offset half node
      line.style.top = (a.y + 36) + 'px';
      const angle = Math.atan2(dy,dx) * (180/Math.PI);
      line.style.transform = 'rotate(' + angle + 'deg)';
      container.appendChild(line);
    }

    // create nodes
    for(let i=1;i<LEVELS.length;i++){
      const info = LEVELS[i];
      if(!info) continue;
      const el = document.createElement('button');
      el.className = 'level-node';
      el.style.left = info.x + 'px';
      el.style.top = info.y + 'px';
      el.setAttribute('data-id', info.id);
      // locked or unlocked from storage
      const locked = (info.id > unlockedLevel);
      if(locked) el.classList.add('locked');

      // content (image + label)
      const img = document.createElement('img');
      // use images/level-dot.png if present, else draw colored circle via dataURI fallback
      img.src = 'images/level-dot.png';
      img.alt = info.title;
      img.onerror = function(){ this.onerror=null; this.src = dataUriCircle(info.id); };
      el.appendChild(img);

      // click handler
      el.addEventListener('click', function(){
        const id = Number(this.getAttribute('
