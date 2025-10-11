// js/eruda-loader.js
(function () {
  try {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/eruda';
    s.onload = function () {
      try { eruda.init(); console.log('🐞 Eruda console loaded'); } catch (e) { console.warn('Eruda load failed', e); }
    };
    document.body.appendChild(s);
  } catch (e) { console.warn(e); }
})();
