// enable Eruda (mobile console) if available — optional
(function(){
  try{
    if(window.eruda){ console.log('Eruda available'); eruda.init(); }
    else console.log('Eruda console ready');
  }catch(e){ console.warn('safe-ui init failed',e); }
})();
