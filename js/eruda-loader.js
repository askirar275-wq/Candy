// optional mobile console
(function(){
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/eruda';
  s.onload=function(){ try{ eruda.init(); console.log('🧠 Eruda Console चालू हो गया'); }catch(e){console.warn('eruda fail',e);} };
  document.head.appendChild(s);
})();
