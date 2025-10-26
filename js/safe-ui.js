// small UI helpers & logger (Eruda-friendly)
const UI = (function(){
  function showPage(id){
    document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
    const el = document.getElementById(id);
    if(el) el.classList.remove('hidden');
  }

  function log(msg){
    if(window.eruda) eruda.get('console').log(msg);
    else console.log(msg);
  }

  // bind back buttons
  document.addEventListener('click', e=>{
    const t = e.target.closest('[data-go]');
    if(t){
      const to = t.getAttribute('data-go');
      showPage(to);
    }
  });

  return { showPage, log };
})();
