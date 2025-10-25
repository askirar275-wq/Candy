// js/bootstrap-safe.js (updated) — बेहतर error-logging और safe startup
(function(){
  const log = (...a)=> console.log('[BOOT]', ...a);
  const warn = (...a)=> console.warn('[BOOT]', ...a);
  const err = (...a)=> console.error('[BOOT]', ...a);

  function ensureDOM(){
    const needs = [
      { id:'boardCard', tag:'section', className:'card board-card' },
      { id:'gameGrid', tag:'div', className:'game-grid', attrs:{ role:'application', 'aria-label':'Candy board' } }
    ];
    needs.forEach(item=>{
      let el = document.getElementById(item.id);
      if(!el){
        log(`DOM '${item.id}' missing — creating fallback`);
        el = document.createElement(item.tag||'div');
        el.id = item.id;
        el.className = item.className || '';
        if(item.attrs) Object.keys(item.attrs).forEach(k=> el.setAttribute(k,item.attrs[k]));
        const container = document.querySelector('main') || document.body;
        container.appendChild(el);
      } else log(`DOM '${item.id}' found`);
    });
  }

  function waitForLibs(timeout = 4000){
    return new Promise((resolve, reject) => {
      const start = Date.now();
      function check(){
        const state = {
          hasDOM: !!document.getElementById('gameGrid'),
          GameReady: typeof window.Game !== 'undefined' && typeof window.Game.start === 'function',
          UIReady: typeof window.UI !== 'undefined' && typeof window.UI.init === 'function'
        };
        // If Game ready OR UI ready we resolve (we can init in order below)
        if(state.hasDOM && (state.GameReady || state.UIReady)){
          return resolve(state);
        }
        if(Date.now() - start > timeout) return reject(state);
        setTimeout(check, 80);
      }
      check();
    });
  }

  async function safeStart(){
    log('bootstrap safeStart');
    try {
      ensureDOM();
    } catch(e){
      warn('ensureDOM failed', e);
    }

    try {
      const info = await waitForLibs(5000).catch(x=> x);
      log('waitForLibs result', info);

      // If Game exists, start it first so state is available for UI
      if(window.Game && typeof window.Game.start === 'function'){
        try {
          const lvlParam = (new URLSearchParams(location.search)).get('level') || 1;
          log('Game.start =>', lvlParam);
          window.Game.start(lvlParam);
        } catch(e){
          err('[BOOT] Game.start error', e);
        }
      } else {
        log('Game not available yet; will try UI.init and Game later.');
      }

      // Now initialize UI if available
      if(window.UI && typeof window.UI.init === 'function'){
        try {
          log('UI.init calling');
          window.UI.init();
        } catch(e){
          err('[BOOT] UI.init error', e);
        }
      } else {
        log('UI.init not available (will wait).');
      }

      // If Game exists but UI wasn't ready earlier, try to init UI again after small delay
      if(window.Game && window.UI && typeof window.UI.init === 'function'){
        try { window.UI.init(); } catch(e) { /* ignore */ }
      }

    } catch(e){
      err('[BOOT] safeStart main error', e);
    }
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(safeStart, 40);
  } else {
    window.addEventListener('DOMContentLoaded', ()=> setTimeout(safeStart, 40));
  }
})();
