/* ===== config.js =====
   Image pack & level definitions
*/
const IMAGE_PACKS = {
  classic: {
    name: 'Classic',
    bg: 'images/pack-classic/bg.png',
    candies: [
      'images/pack-classic/candy1.png',
      'images/pack-classic/candy2.png',
      'images/pack-classic/candy3.png',
      'images/pack-classic/candy4.png',
      'images/pack-classic/candy5.png',
      'images/pack-classic/candy6.png'
    ]
  },
  neon: {
    name: 'Neon',
    bg: 'images/pack-neon/bg.png',
    candies: [
      'images/pack-neon/candy1.png',
      'images/pack-neon/candy2.png',
      'images/pack-neon/candy3.png',
      'images/pack-neon/candy4.png',
      'images/pack-neon/candy5.png',
      'images/pack-neon/candy6.png'
    ]
  }
};

const LEVELS = [
  { level:1, goalScore:500, rows:8, cols:7, moves:40 },
  { level:2, goalScore:1000, rows:8, cols:7, moves:38 },
  { level:3, goalScore:1500, rows:9, cols:7, moves:36 },
  { level:4, goalScore:2000, rows:9, cols:8, moves:40 },
  { level:5, goalScore:2500, rows:9, cols:8, moves:42 },
  // add more if needed
];
