// js/safe-ui.js
// small ui helpers, and optional eruda init (debug logger)

const SafeUI = {
  log(...args){ console.log(...args); },
  warn(...args){ console.warn(...args); },
  error(...args){ console.error(...args); },
  // small visual toast (optional)
  toast(msg, ms = 1500){
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position:'fixed',left:'50%',transform:'translateX(-50%)',bottom:'12px',
      background:'rgba(0,0,0,0.7)',color:'#fff',padding:'8px 12px',borderRadius:'10px',zIndex:99999
    });
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), ms);
  }
};

// optional: eruda (uncomment if you host eruda or want CDN - development only)
// (function(){ const enableEruda = false; if(enableEruda && typeof eruda === 'undefined'){ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/eruda'; s.onload=()=>eruda.init(); document.head.appendChild(s); } })();

document.addEventListener('DOMContentLoaded', ()=> SafeUI.log('Safe UI loaded'));
