// add Eruda (mobile console) so you can see errors
(function initEruda(){
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/eruda';
  s.onload = ()=>{ eruda.init(); console.info('Eruda console ready'); };
  document.head.appendChild(s);
})();
