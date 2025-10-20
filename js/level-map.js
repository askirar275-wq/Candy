// level-map.js
console.log('Loaded: js/level-map.js');

const homeScreen = $('#homeScreen');
const mapScreen = $('#mapScreen');
const gameScreen = $('#gameScreen');

const btnStart = $('#btnStart');
const backToHome = $('#backToHome');
const backToMap = $('#backToMap');
const levelList = $('#levelList');
const levelNumSpan = $('#levelNum');

let currentLevel = 1;
const MAX_LEVELS = 100;

// load progress
const progress = Storage.get('candy_progress', {unlocked:[1], coins:0});

function showHome(){ homeScreen.style.display='flex'; mapScreen.style.display='none'; gameScreen.style.display='none'; }
function showMap(){ homeScreen.style.display='none'; mapScreen.style.display='block'; gameScreen.style.display='none'; }
function showGame(){ homeScreen.style.display='none'; mapScreen.style.display='none'; gameScreen.style.display='block'; }

btnStart.addEventListener('click', ()=>{
  showMap();
});

backToHome.addEventListener('click', ()=>{
  showHome();
});

backToMap.addEventListener('click', ()=>{
  showMap();
});

function renderLevels(){
  levelList.innerHTML = '';
  for (let i=1;i<=30;i++){
    const unlocked = progress.unlocked.includes(i);
    const div = document.createElement('div');
    div.className = 'level-card';
    div.innerHTML = `<div>Level ${i}</div>
      <div>
        <button data-level="${i}" class="pill level-btn" ${unlocked?'':'disabled'}>${unlocked? 'Play':'🔒'}</button>
      </div>`;
    levelList.appendChild(div);
  }
  // attach events
  levelList.querySelectorAll('.level-btn').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const l = Number(btn.dataset.level);
      currentLevel = l;
      levelNumSpan.textContent = currentLevel;
      showGame();
      // init game start event
      if (window.CandyGame && typeof window.CandyGame.startLevel === 'function'){
        window.CandyGame.startLevel(currentLevel);
      } else {
        console.warn('CandyGame.startLevel not available yet');
      }
    });
  });
}

renderLevels();
showHome();

console.log('Loaded: level-map initialized');
