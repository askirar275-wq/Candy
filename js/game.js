// js/game.js  (ES5-compatible, no arrow, no const/let)
(function () {
  try {
    console.log('Loaded: js/game.js (safe ES5 build)');
  } catch (e) {}

  // small helpers
  function $(sel) { return document.querySelector(sel); }
  function id(n) { return document.getElementById(n); }

  var rows = 8, cols = 8;
  var candyCount = 6;
  var candyPrefix = 'images/candy';
  var boardEl = id('board');
  var scoreEl = id('score');
  var coinsEl = id('coins');
  var levelEl = id('levelNum');

  var grid = [];
  var score = 0;
  var coins = 0;
  var currentLevel = 1;
  var isAnimating = false;

  // Expose API for level-map
  window.CandyGame = {
    startLevel: function (lvl) {
      currentLevel = lvl || 1;
      if (levelEl) levelEl.textContent = currentLevel;
      initBoard();
      console.log('CandyGame.startLevel ->', currentLevel);
    },
    safeShuffle: function () {
      safeShuffleBoard();
    }
  };

  // create empty board layout (cells) so CSS layout exists even before start
  function ensureBoardLayout() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    for (var r = 0; r < rows; r++) {
      var rowDiv = document.createElement('div');
      rowDiv.className = 'row';
      for (var c = 0; c < cols; c++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        var img = document.createElement('img');
        img.draggable = false;
        img.src = candyPrefix + '1.png';
        img.style.visibility = 'hidden';
        cell.appendChild(img);
        rowDiv.appendChild(cell);
      }
      boardEl.appendChild(rowDiv);
    }
  }

  function randomCandy() {
    return Math.floor(Math.random() * candyCount) + 1;
  }

  function createCell(r, c, idVal) {
    var div = document.createElement('div');
    div.className = 'cell';
    div.dataset.r = r;
    div.dataset.c = c;
    var img = document.createElement('img');
    img.draggable = false;
    img.src = candyPrefix + idVal + '.png';
    div.appendChild(img);
    return { id: idVal, el: div };
  }

  function initBoard() {
    if (!boardEl) {
      console.warn('Board element not found');
      return;
    }
    score = 0;
    updateHUD();
    grid = [];
    boardEl.innerHTML = '';

    // fill grid with random but try avoid immediate matches
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) {
        var idVal = randomCandy();
        var tries = 0;
        while (tries < 20) {
          var bad = false;
          // horizontal check
          if (c >= 2 && row[c - 1] && row[c - 2] && idVal === row[c - 1].id && idVal === row[c - 2].id) bad = true;
          // vertical check
          if (r >= 2 && grid[r - 1] && grid[r - 2] && idVal === grid[r - 1][c].id && idVal === grid[r - 2][c].id) bad = true;
          if (!bad) break;
          idVal = randomCandy();
          tries++;
        }
        var cellObj = createCell(r, c, idVal);
        row.push(cellObj);
      }
      grid.push(row);
    }

    // render
    for (var rr = 0; rr < rows; rr++) {
      var rowDiv2 = document.createElement('div');
      rowDiv2.className = 'row';
      for (var cc = 0; cc < cols; cc++) {
        rowDiv2.appendChild(grid[rr][cc].el);
      }
      boardEl.appendChild(rowDiv2);
    }

    attachEvents();
    // small defer to remove accidental initial matches
    setTimeout(function () {
      var m = findAllMatches();
      if (m.length) {
        removeMatches(m).then(function () {
          collapseColumns();
          refillBoard();
        });
      }
    }, 120);
  }

  function updateHUD() {
    if (scoreEl) scoreEl.textContent = score;
    if (coinsEl) coinsEl.textContent = coins;
  }

  // find matches (returns unique coordinates)
  function findAllMatches() {
    var coords = {};
    // rows
    for (var r = 0; r < rows; r++) {
      var runId = grid[r][0].id;
      var runStart = 0;
      for (var c = 1; c <= cols; c++) {
        var idNow = (c < cols) ? grid[r][c].id : null;
        if (idNow === runId) {
          // continue run
        } else {
          var runLength = c - runStart;
          if (runId !== 0 && runLength >= 3) {
            for (var k = runStart; k < c; k++) coords[r + ',' + k] = true;
          }
          runStart = c;
          runId = idNow;
        }
      }
    }
    // cols
    for (var c2 = 0; c2 < cols; c2++) {
      var runId2 = grid[0][c2].id;
      var runStart2 = 0;
      for (var r2 = 1; r2 <= rows; r2++) {
        var idNow2 = (r2 < rows) ? grid[r2][c2].id : null;
        if (idNow2 === runId2) {
          // continue
        } else {
          var runLen = r2 - runStart2;
          if (runId2 !== 0 && runLen >= 3) {
            for (var k2 = runStart2; k2 < r2; k2++) coords[k2 + ',' + c2] = true;
          }
          runStart2 = r2;
          runId2 = idNow2;
        }
      }
    }
    // convert to array
    var out = [];
    for (var key in coords) {
      var parts = key.split(',');
      out.push({ r: parseInt(parts[0], 10), c: parseInt(parts[1], 10), id: grid[parseInt(parts[0], 10)][parseInt(parts[1], 10)].id });
    }
    return out;
  }

  function removeMatches(matches) {
    if (!matches || !matches.length) return Promise.resolve();
    isAnimating = true;
    try { console.log('removeMatches count=', matches.length); } catch (e) {}
    for (var i = 0; i < matches.length; i++) {
      var m = matches[i];
      var el = grid[m.r][m.c].el;
      if (el) el.classList.add('fade');
    }
    return new Promise(function (resolve) {
      setTimeout(function () {
        for (var j = 0; j < matches.length; j++) {
          var mm = matches[j];
          grid[mm.r][mm.c].id = 0;
          var im = grid[mm.r][mm.c].el.querySelector('img');
          if (im) im.style.visibility = 'hidden';
          grid[mm.r][mm.c].el.classList.remove('fade');
        }
        score += matches.length * 10;
        updateHUD();
        isAnimating = false;
        resolve();
      }, 300);
    });
  }

  function collapseColumns() {
    for (var c3 = 0; c3 < cols; c3++) {
      var write = rows - 1;
      for (var r3 = rows - 1; r3 >= 0; r3--) {
        if (grid[r3][c3].id !== 0) {
          if (write !== r3) {
            grid[write][c3].id = grid[r3][c3].id;
            var srcImg = grid[r3][c3].el.querySelector('img');
            var dstImg = grid[write][c3].el.querySelector('img');
            if (dstImg && srcImg) {
              dstImg.src = srcImg.src;
              dstImg.style.visibility = 'visible';
            }
            grid[r3][c3].id = 0;
            var hideImg = grid[r3][c3].el.querySelector('img');
            if (hideImg) hideImg.style.visibility = 'hidden';
          }
          write--;
        }
      }
      for (var rFill = write; rFill >= 0; rFill--) {
        var nid = randomCandy();
        grid[rFill][c3].id = nid;
        var imf = grid[rFill][c3].el.querySelector('img');
        if (imf) { imf.src = candyPrefix + nid + '.png'; imf.style.visibility = 'visible'; }
      }
    }
  }

  function refillBoard() {
    if (isAnimating) return;
    var attempts = 0;
    function step() {
      var matches = findAllMatches();
      if (matches.length && attempts < 12) {
        attempts++;
        removeMatches(matches).then(function () {
          collapseColumns();
          setTimeout(step, 140);
        });
      } else {
        // done
        checkLevelComplete();
      }
    }
    step();
  }

  function checkLevelComplete() {
    var goal = currentLevel * 500;
    if (score >= goal) {
      var prog = (window.Storage && window.Storage.get) ? window.Storage.get('candy_progress', { unlocked: [1], coins: 0 }) : null;
      if (prog) {
        if (prog.unlocked.indexOf(currentLevel + 1) === -1) {
          prog.unlocked.push(currentLevel + 1);
          window.Storage.set && window.Storage.set('candy_progress', prog);
        }
      }
      setTimeout(function () {
        try { alert('Level cleared! Next level unlocked.'); } catch (e) {}
      }, 60);
    }
  }

  // swap logic
  function trySwap(r1, c1, r2, c2) {
    if (isAnimating) return;
    // swap ids
    var t = grid[r1][c1].id;
    grid[r1][c1].id = grid[r2][c2].id;
    grid[r2][c2].id = t;
    // swap images
    var im1 = grid[r1][c1].el.querySelector('img');
    var im2 = grid[r2][c2].el.querySelector('img');
    var s1 = im1.src, s2 = im2.src;
    im1.src = s2; im2.src = s1;
    var matches = findAllMatches();
    if (matches.length) {
      removeMatches(matches).then(function () {
        collapseColumns();
        setTimeout(refillBoard, 120);
      });
    } else {
      // revert
      isAnimating = true;
      setTimeout(function () {
        var tmpx = grid[r1][c1].id;
        grid[r1][c1].id = grid[r2][c2].id;
        grid[r2][c2].id = tmpx;
        im1.src = s1; im2.src = s2;
        isAnimating = false;
      }, 160);
    }
  }

  var startR = null, startC = null;

  function attachEvents() {
    if (!boardEl) return;
    // pointer events
    var cells = boardEl.querySelectorAll('.cell');
    for (var i = 0; i < cells.length; i++) {
      (function (cell) {
        cell.onpointerdown = function (e) {
          if (isAnimating) return;
          startR = Number(cell.dataset.r);
          startC = Number(cell.dataset.c);
          cell.classList.add('moving');
          try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (ex) {}
        };
        cell.onpointerup = function (e) {
          if (isAnimating) return;
          var r = Number(cell.dataset.r);
          var c = Number(cell.dataset.c);
          var dr = r - startR, dc = c - startC;
          var absr = Math.abs(dr), absc = Math.abs(dc);
          if ((absr + absc) === 1) {
            trySwap(startR, startC, r, c);
          }
          var all = boardEl.querySelectorAll('.cell');
          for (var j = 0; j < all.length; j++) all[j].classList.remove('moving');
          startR = startC = null;
        };
        cell.onpointercancel = function () {
          var all2 = boardEl.querySelectorAll('.cell');
          for (var j2 = 0; j2 < all2.length; j2++) all2[j2].classList.remove('moving');
          startR = startC = null;
        };
        cell.ondragstart = function () { return false; };
      }(cells[i]));
    }

    var restartBtn = id('restartBtn');
    var shuffleBtn = id('shuffleBtn');
    if (restartBtn) restartBtn.onclick = function () { initBoard(); };
    if (shuffleBtn) shuffleBtn.onclick = function () { safeShuffleBoard(); };
  }

  // simple shuffle try
  function safeShuffleBoard() {
    var all = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) all.push(grid[r][c].id);
    for (var i = all.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = all[i]; all[i] = all[j]; all[j] = tmp;
    }
    var tries = 0, ok = false;
    while (tries < 12 && !ok) {
      var idx = 0;
      for (var rr2 = 0; rr2 < rows; rr2++) for (var cc2 = 0; cc2 < cols; cc2++) {
        grid[rr2][cc2].id = all[idx++];
        var im = grid[rr2][cc2].el.querySelector('img');
        if (im) { im.src = candyPrefix + grid[rr2][cc2].id + '.png'; im.style.visibility = 'visible'; }
      }
      if (findAllMatches().length === 0) ok = true;
      else {
        for (var k = all.length - 1; k > 0; k--) {
          var kk = Math.floor(Math.random() * (k + 1));
          var ttmp = all[k]; all[k] = all[kk]; all[kk] = ttmp;
        }
      }
      tries++;
    }
    console.log('safeShuffleBoard finished tries=', tries, 'ok=', ok);
  }

  // initial layout
  document.addEventListener('DOMContentLoaded', function () {
    try { ensureBoardLayout(); } catch (e) {}
    console.log('game.js DOM ready (placeholder layout created)');
  });

}());
