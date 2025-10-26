// Safe UI helpers
const UI = {
  $(sel, root=document) { return root.querySelector(sel); },
  $all(sel, root=document) { return Array.from(root.querySelectorAll(sel)); },
  showPage(id){
    UI.$all('.page').forEach(p => p.classList.add('hidden'));
    const el = UI.$(`#${id}`);
    if(el) el.classList.remove('hidden');
  },
  log(msg, level='info'){ 
    if(window.console) console.log(msg);
  }
};

// basic navigation bind
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if(b){ e.preventDefault(); UI.showPage(b.dataset.go); }
});
