// js/game.js
(function(){
  console.log('Loaded: js/game.js (engine starting)');

  var rows = 8, cols = 8;
  var candyCount = 6;
  var candyPrefix = 'images/candy';
  var boardEl = document.getElementById('board');
  var scoreEl = document.getElementById('score');
  var coinsEl = document.getElementById('coins');
  var levelEl = document.getElementById('levelNum');

  var grid = [];
  var score = 0;
  var coins = 0;
  var currentLevel = 1;
  var animating = false;

  function $(id){ return document.getElementById(id); }

  // API for level map
  window.CandyGame = {
    startLevel: function(lvl){
      currentLevel = lvl || 1;
      if(levelEl) levelEl.textContent = currentLevel;
      initBoard();
      console.log('CandyEngine startLevel', currentLevel);
    }
  };

  function randomCandy(){ return Math.floor(Math.random()*candyCount)+1; }

  function createBoardLayout(){
    if(!boardEl) return;
    boardEl.innerHTML = '';
    for(var r=0;r<rows;r++){
      var rowDiv = document.createElement('div'); rowDiv.className='row';
      for(var c=0;c<cols;c++){
        var cell = document.createElement('div'); cell.className='cell';
        cell.dataset.r = r; cell.dataset.c = c;
        var img = document.createElement('img'); img.draggable=false;
        img.src = candyPrefix + '1.png'; img.style.visibility='hidden';
        cell.appendChild(img);
        rowDiv.appendChild(cell);
      }
      boardEl.appendChild(rowDiv);
    }
  }

  function initBoard(){
    animating = false;
    score = 0; updateHUD();
    grid = [];
    boardEl.innerHTML = '';
    for(var r=0;r<rows;r++){
      var row = [];
      for(var c=0;c<cols;c++){
        var id = randomCandy();
        var cellEl = document.createElement('div'); cellEl.className='cell'; cellEl.dataset.r=r; cellEl.dataset.c=c;
        var img = document.createElement('img'); img.draggable=false; img.src = candyPrefix + id + '.png';
        cellEl.appendChild(img);
        row.push({id:id, el:cellEl});
      }
      grid.push(row);
    }
    // render
    for(var rr=0; rr<rows; rr++){
      var rd = document.createElement('div'); rd.className='row';
      for(var cc=0; cc<cols; cc++) rd.appendChild(grid[rr][cc].el);
      boardEl.appendChild(rd);
    }

    attachEvents();

    // remove accidental initial matches
    setTimeout(function(){
      var m = findAllMatches();
      if(m.length) {
        removeMatches(m).then(function(){ collapseColumns(); refillBoard(); });
      }
    }, 80);
  }

  function updateHUD(){ if(scoreEl) scoreEl.textContent = score; if(coinsEl) coinsEl.textContent = coins; }

  // find matches
  function findAllMatches(){
    var map = {};
    // rows
    for(var r=0;r<rows;r++){
      var run = grid[r][0].id, start = 0;
      for(var c=1;c<=cols;c++){
        var now = (c<cols)?grid[r][c].id:null;
        if(now === run){} else {
          var len = c - start;
          if(run && len>=3){
            for(var k=start;k<c;k++) map[r+','+k]=true;
          }
          start = c; run = now;
        }
      }
    }
    // cols
    for(var c2=0;c2<cols;c2++){
      var run2 = grid[0][c2].id, s2=0;
      for(var r2=1;r2<=rows;r2++){
        var now2 = (r2<rows)?grid[r2][c2].id:null;
        if(now2 === run2){} else {
          var len2 = r2 - s2;
          if(run2 && len2>=3){
            for(var k2=s2;k2<r2;k2++) map[k2+','+c2]=true;
          }
          s2 = r2; run2 = now2;
        }
      }
    }
    var out=[]; for(var k in map){ var p=k.split(','); out.push({r:parseInt(p[0],10),c:parseInt(p[1],10), id:grid[parseInt(p[0],10)][parseInt(p[1],10)].id}); }
    return out;
  }

  function removeMatches(matches){
    if(!matches || matches.length===0) return Promise.resolve();
    animating = true;
    for(var i=0;i<matches.length;i++){
      var m = matches[i];
      var el = grid[m.r][m.c].el;
      el.classList.add('fade');
    }
    return new Promise(function(resolve){
      setTimeout(function(){
        for(var j=0;j<matches.length;j++){
          var mm=matches[j];
          grid[mm.r][mm.c].id = 0;
          var im = grid[mm.r][mm.c].el.querySelector('img'); if(im) im.style.visibility='hidden';
          grid[mm.r][mm.c].el.classList.remove('fade');
        }
        score += matches.length*10;
        updateHUD();
        animating = false;
        resolve();
      },250);
    });
  }

  function collapseColumns(){
    for(var c=0;c<cols;c++){
      var write = rows-1;
      for(var r=rows-1;r>=0;r--){
        if(grid[r][c].id !== 0){
          if(write !== r){
            grid[write][c].id = grid[r][c].id;
            var src = grid[r][c].el.querySelector('img');
            var dst = grid[write][c].el.querySelector('img');
            if(dst && src){ dst.src = src.src; dst.style.visibility='visible'; }
            grid[r][c].id = 0;
            var h = grid[r][c].el.querySelector('img'); if(h) h.style.visibility='hidden';
          }
          write--;
        }
      }
      for(var rf = write; rf>=0; rf--){
        var nid = randomCandy();
        grid[rf][c].id = nid;
        var imf = grid[rf][c].el.querySelector('img'); if(imf){ imf.src = candyPrefix + nid + '.png'; imf.style.visibility='visible'; }
      }
    }
  }

  function refillBoard(){
    if(animating) return;
    var tries = 0;
    (function step(){
      var m = findAllMatches();
      if(m.length && tries<12){
        tries++;
        removeMatches(m).then(function(){ collapseColumns(); setTimeout(step,120); });
      } else {
        // level check
        var goal = currentLevel * 500;
        if(score >= goal){
          var prog = window.Storage.get('candy_progress', {unlocked:[1],coins:0});
          if(prog.unlocked.indexOf(currentLevel+1) === -1){ prog.unlocked.push(currentLevel+1); window.Storage.set('candy_progress', prog); }
          setTimeout(function(){ alert('Level cleared! Next unlocked.'); }, 60);
        }
      }
    })();
  }

  // swap
  function trySwap(r1,c1,r2,c2){
    if(animating) return;
    var t = grid[r1][c1].id;
    grid[r1][c1].id = grid[r2][c2].id; grid[r2][c2].id = t;
    var im1 = grid[r1][c1].el.querySelector('img'); var im2 = grid[r2][c2].el.querySelector('img');
    var s1=im1.src, s2=im2.src; im1.src=s2; im2.src=s1;
    var m = findAllMatches();
    if(m.length){
      removeMatches(m).then(function(){ collapseColumns(); setTimeout(refillBoard,120); });
    } else {
      animating = true;
      setTimeout(function(){ // revert
        var tmp = grid[r1][c1].id; grid[r1][c1].id = grid[r2][c2].id; grid[r2][c2].id = tmp;
        im1.src=s1; im2.src=s2;
        animating = false;
      },150);
    }
  }

  // pointer attach
  var startR = null, startC = null;
  function attachEvents(){
    if(!boardEl) return;
    var cells = boardEl.querySelectorAll('.cell');
    for(var i=0;i<cells.length;i++){
      (function(cell){
        cell.onpointerdown = function(e){
          if(animating) return;
          startR = Number(cell.dataset.r); startC = Number(cell.dataset.c);
          cell.classList.add('moving');
          try{ e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); }catch(ex){}
        };
        cell.onpointerup = function(e){
          if(animating) return;
          var r = Number(cell.dataset.r); var c = Number(cell.dataset.c);
          var dr = r - startR, dc = c - startC;
          var absr = Math.abs(dr), absc = Math.abs(dc);
          if(absr + absc === 1){
            trySwap(startR, startC, r, c);
          }
          var all = boardEl.querySelectorAll('.cell'); for(var j=0;j<all.length;j++) all[j].classList.remove('moving');
          startR = startC = null;
        };
        cell.onpointercancel = function(){ var all = boardEl.querySelectorAll('.cell'); for(var j=0;j<all.length;j++) all[j].classList.remove('moving'); startR=startC=null; };
        cell.ondragstart = function(){ return false; };
      }(cells[i]));
    }
    var restart = document.getElementById('restartBtn'); var shuffle = document.getElementById('shuffleBtn');
    if(restart) restart.onclick = function(){ initBoard(); };
    if(shuffle) shuffle.onclick = function(){ safeShuffle(); };
  }

  function safeShuffle(){
    var arr=[];
    for(var r=0;r<rows;r++) for(var c=0;c<cols;c++) arr.push(grid[r][c].id);
    for(var i=arr.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=arr[i]; arr[i]=arr[j]; arr[j]=tmp; }
    var idx=0; for(var rr=0;rr<rows;rr++) for(var cc=0;cc<cols;cc++){ grid[rr][cc].id = arr[idx++]; var im = grid[rr][cc].el.querySelector('img'); if(im){ im.src=candyPrefix+grid[rr][cc].id+'.png'; im.style.visibility='visible'; } }
    // ensure no immediate matches
    var tries=0;
    while(findAllMatches().length && tries<12){ tries++; for(var k=arr.length-1;k>0;k--){ var kk=Math.floor(Math.random()*(k+1)); var t=arr[k]; arr[k]=arr[kk]; arr[kk]=t; } idx=0; for(var rr2=0;rr2<rows;rr2++) for(var cc2=0;cc2<cols;cc2++){ grid[rr2][cc2].id = arr[idx++]; var im2 = grid[rr2][cc2].el.querySelector('img'); if(im2){ im2.src = candyPrefix + grid[rr2][cc2].id + '.png'; im2.style.visibility='visible'; } } }
    console.log('shuffled tries=',tries);
  }

  // init on dom
  document.addEventListener('DOMContentLoaded', function(){
    if(!boardEl) { console.warn('board not found'); return; }
    // prepare small blank layout first
    createBoardLayout();
    console.log('CandyEngine ready');
  });

})();
