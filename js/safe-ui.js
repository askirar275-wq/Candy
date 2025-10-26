// Eruda mobile console (optional)
// if you included eruda script separately, you can init here.
if (window.eruda && !window.erudaInitialized) {
  eruda.init();
  window.erudaInitialized = true;
  console.log('Eruda console चालू हो गया');
}

// small DOM navigation helper
document.addEventListener('click', function(e){
  const go = e.target.closest('[data-go]');
  if(go){
    const tgt = go.getAttribute('data-go');
    if(tgt){
      document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
      const el = document.getElementById(tgt);
      if(el) el.classList.remove('hidden');
    }
  }
});
