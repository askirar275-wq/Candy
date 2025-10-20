// shop.js
console.log('Loaded: js/shop.js');
const openShop = $('#openShop');
const shopModal = $('#shopModal');
const closeShop = $('#closeShop');

if (openShop) openShop.addEventListener('click', ()=> shopModal.classList.remove('hidden'));
if (closeShop) closeShop.addEventListener('click', ()=> shopModal.classList.add('hidden'));
