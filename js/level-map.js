// js/level-map.js
(function(){
  const LEVELS = {
    1: {layout:null, target:1200, moves:30},
    2: {layout:null, target:1800, moves:28},
    3: {layout:null, target:2500, moves:25}
  };
  function getInitial(level){ const L = LEVELS[level]; return L? L.layout : null; }
  function getMeta(level){ return LEVELS[level] || {layout:null,target:1000,moves:30}; }
  window.LevelMap = { getInitial, getMeta, onUpdate: ()=>{} };
})();
