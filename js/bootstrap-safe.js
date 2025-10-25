// js/bootstrap-safe.js
(function(){
  const log = (...a)=> console.log('[BOOT]', ...a);
  const warn = (...a)=> console.warn('[BOOT]', ...a);
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
  function waitForReady({timeout=4000,poll=80} = {}){
    return new Promise((res,rej)=>{
      const start = Date.now();
      function check(){
        const hasDom = !!document.getElementById('gameGrid');
        const GameReady = typeof window.Game !== 'undefined';
        const UIReady = typeof window.UI !== 'undefined';
        if(hasDom && GameReady && UIReady) return res({Game:window.Game,UI:window.UI});
        if(Date.now()-start > timeout) return rej({hasDom,GameReady,UIReady});
        setTimeout(check,poll);
      }
      check();
    });
  }
  async function safeStart(){
    log('bootstrap safeStart');
    ensureDOM();
    try {
      await waitForReady({timeout:5000});
    } catch(info){
      warn('waitForReady timeout', info);
    }
    try {
      if(window.UI && typeof window.UI.init === 'function'){ log('UI.init'); window.UI.init(); }
      if(window.Game && typeof window.Game.start === 'function'){
        const lvl = (new URLSearchParams(location.search)).get('level') || 1;
        log('Game.start', lvl);
        window.Game.start(lvl);
      }
    } catch(e){
      console.error('[BOOT] init error', e);
    }
  }
  if(document.readyState==='complete' || document.readyState==='interactive'){ setTimeout(safeStart,40); }
  else window.addEventListener('DOMContentLoaded', ()=> setTimeout(safeStart,40));
})();
