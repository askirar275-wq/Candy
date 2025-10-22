// js/game-core.js
const GameCore = (function(){
  const W = 5, H = 6, SIZE = W * H, COLORS = 5;

  function randColor(){ return Math.floor(Math.random() * COLORS); }
  function idx(r,c){ return r*W + c; }
  function rc(i){ return [Math.floor(i / W), i % W]; }

  function generateGrid(){
    const grid = new Array(SIZE).fill(0).map(()=>randColor());
    for(let i=0;i<SIZE;i++){
      let guard = 0;
      while(hasMatchAt(grid,i) && guard<10){ grid[i]=randColor(); guard++; }
    }
    return grid;
  }

  function swap(g,a,b){ const t=g[a]; g[a]=g[b]; g[b]=t; }

  function areAdjacent(a,b){
    const [ra,ca]=rc(a),[rb,cb]=rc(b);
    return (ra===rb && Math.abs(ca-cb)===1)||(ca===cb && Math.abs(ra-rb)===1);
  }

  function findMatches(g){
    const rem=new Set();
    for(let r=0;r<H;r++){
      let s=0;
      for(let c=1;c<=W;c++){
        const prev=g[idx(r,c-1)],cur=(c<W)?g[idx(r,c)]:null;
        if(c===W||cur!==prev){
          const len=c-s; if(len>=3) for(let cc=s;cc<c;cc++) rem.add(idx(r,cc));
          s=c;
        }
      }
    }
    for(let c=0;c<W;c++){
      let s=0;
      for(let r=1;r<=H;r++){
        const prev=g[idx(r-1,c)],cur=(r<H)?g[idx(r,c)]:null;
        if(r===H||cur!==prev){
          const len=r-s; if(len>=3) for(let rr=s;rr<r;rr++) rem.add(idx(rr,c));
          s=r;
        }
      }
    }
    return Array.from(rem);
  }

  function hasMatchAt(g,i){
    const [r,c]=rc(i),col=g[i];
    let ct=1;
    for(let cc=c-1;cc>=0&&g[idx(r,cc)]===col;cc--) ct++;
    for(let cc=c+1;cc<W&&g[idx(r,cc)]===col;cc++) ct++;
    if(ct>=3) return true;
    ct=1;
    for(let rr=r-1;rr>=0&&g[idx(rr,c)]===col;rr--) ct++;
    for(let rr=r+1;rr<H&&g[idx(rr,c)]===col;rr++) ct++;
    return ct>=3;
  }

  function collapseAndRefill(g,remI){
    const rem=new Set(remI);
    const ng=new Array(SIZE).fill(-1);
    for(let c=0;c<W;c++){
      const col=[];
      for(let r=H-1;r>=0;r--){ const i=idx(r,c); if(!rem.has(i)) col.push(g[i]); }
      let wr=H-1;
      for(const v of col){ ng[idx(wr,c)]=v; wr--; }
      while(wr>=0){ ng[idx(wr,c)]=randColor(); wr--; }
    }
    return {grid:ng, removedCount:remI.length};
  }

  function trySwapAndFindMatches(g,a,b){
    if(!areAdjacent(a,b)) return [];
    const x=g.slice(); swap(x,a,b); return findMatches(x);
  }

  return {W,H,SIZE,COLORS,generateGrid,swap,areAdjacent,findMatches,collapseAndRefill,trySwapAndFindMatches};
})();
