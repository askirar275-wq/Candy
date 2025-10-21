// js/level-map.js
(function(){
  const LEVELS = {
    1: null,
    2: [
      [0,1,2,3,4,0,1,2],
      [1,2,3,4,0,1,2,3],
      [2,3,4,0,1,2,3,4],
      [3,4,0,1,2,3,4,0],
      [4,0,1,2,3,4,0,1],
      [0,1,2,3,4,0,1,2],
      [1,2,3,4,0,1,2,3],
      [2,3,4,0,1,2,3,4]
    ],
    3: null
  };

  function getInitial(level){
    const L = LEVELS[level];
    if(!L) return null;
    return L.map(r=> r.slice());
  }

  function onUpdate(state){
    // optional callback for future hooks
  }

  window.LevelMap = { getInitial, onUpdate };
})();
