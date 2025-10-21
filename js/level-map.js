// js/level-map.js
// define level initial layouts (8x8 arrays with values 0..4 or null for random)

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
    // add more levels as needed
  };

  function getInitial(level){
    const L = LEVELS[level];
    if(!L) return null;
    return L.map(r=> r.slice());
  }

  function onUpdate(state){
    // optional hook called by game-core (not required)
    // state = {score, moves, level, event}
    // console.log('LevelMap.onUpdate', state);
  }

  window.LevelMap = { getInitial, onUpdate };
})();
