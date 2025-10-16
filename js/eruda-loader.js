// eruda-loader.js — mobile console (dev only)
// In production you can remove this file or set ERUDA=false
(function(){
  const ERUDA = true;
  if(!ERUDA) return;
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/eruda';
  s.onload = function(){
    try{ eruda.init(); console.log('Eruda initialized'); }catch(e){ console.warn('Eruda init failed', e); }
  };
  document.body.appendChild(s);
})();
