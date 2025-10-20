// safe-ui.js
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

document.addEventListener('click', (e)=>{
  // debug hook
});

console.log('Loaded: js/safe-ui.js');
