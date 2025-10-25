// js/eruda-init.js  (optional)
// small loader for Eruda mobile console. If you do not want dev console on mobile, remove this file include.
(function(){
  try {
    if(window.eruda) return;
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/eruda'; // CDN
    s.onload = function(){ eruda.init(); console.log('[ERUDA] initialized'); };
    document.head.appendChild(s);
  } catch(e){ console.warn('eruda init failed', e); }
})();
