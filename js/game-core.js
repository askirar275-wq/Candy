const GameCore = {
  generateGrid: (size = 25) => {
    const grid = [];
    for (let i = 0; i < size; i++) {
      grid.push(Math.floor(Math.random() * 5)); // random candy color index
    }
    return grid;
  }
};
