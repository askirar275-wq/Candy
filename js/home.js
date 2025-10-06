document.getElementById('playBtn').onclick = () => {
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('gameScreen').classList.remove('hidden');
};

document.getElementById('shopBtn').onclick = () => {
  alert('🛒 Candy Shop Coming Soon!');
};

document.getElementById('settingsBtn').onclick = () => {
  alert('⚙ Settings Coming Soon!');
};
