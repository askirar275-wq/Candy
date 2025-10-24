/* game-core.js */
const GameCore = (function(){
  const types = [1,2,3,4,5]; // candy types -> map to images candy1..5.png
  function randType(){ return types[Math.floor(Math.random()*types.length)]; }

  function createGrid(rows,cols){
    const grid = Array.from({length:rows},()=>Array(cols).fill(0));
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) grid[r][c]=randType();
    return grid;
  }

  // find matches (>=3 in row or col)
  function findMatches(grid){
    const rows = grid.length, cols = grid[0].length;
    const toClear = Array.from({length:rows},()=>Array(cols,false));
    // rows
    for(let r=0;r<rows;r++){
      let start=0;
      for(let c=1;c<=cols;c++){
        if(c<cols && grid[r][c]===grid[r][start]) continue;
        const len = c - start;
        if(len>=3 && grid[r][start] !== 0){
          for(let k=start;k<c;k++) toClear[r][k]=true;
        }
        start = c;
      }
    }
    // cols
    for(let c=0;c<cols;c++){
      let start=0;
      for(let r=1;r<=rows;r++){
        if(r<rows && grid[r][c]===grid[start][c]) continue;
        const len = r - start;
        if(len>=3 && grid[start][c] !== 0){
          for(let k=start;k<r;k++) toClear[k][c]=true;
        }
        start = r;
      }
    }
    // collect positions
    const matches = [];
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(toClear[r][c]) matches.push([r,c]);
    return matches;
  }

  // clear and gravity (drop and refill)
  function applyClearAndGravity(grid){
    const rows = grid.length, cols = grid[0].length;
    // set cleared to 0 then drop
    for(let c=0;c<cols;c++){
      let write = rows-1;
      for(let r=rows-1;r>=0;r--){
        if(grid[r][c]!==0){
          grid[write][c] = grid[r][c];
          write--;
        }
      }
      // fill remaining
      for(let r=write;r>=0;r--) grid[r][c] = randType();
    }
  }

  return {
    createGrid, findMatches, applyClearAndGravity
  };
})();
