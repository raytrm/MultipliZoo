import { playSound } from './audio.js';

let distance = 0;
let hearts = 3;
let speed = 5; // pixels per frame
let gameActive = false;
let gameLoopId = null;
let obstacles = [];
let nextSpawnDistance = 500;
let baseSpeed = 5;

const game4Els = {
  score: document.getElementById('game4-score'),
  hearts: document.getElementById('game4-hearts'),
  speedIndicator: document.getElementById('game4-speed-lines'),
  area: document.getElementById('game4-area'),
  obstaclesContainer: document.getElementById('game4-obstacles'),
  capybara: document.getElementById('game4-capybara'),
  optionsContainer: document.getElementById('game4-options')
};

export function startGame4() {
  distance = 0;
  hearts = 3;
  speed = baseSpeed;
  gameActive = true;
  obstacles = [];
  nextSpawnDistance = window.innerWidth;
  
  game4Els.obstaclesContainer.innerHTML = '';
  game4Els.capybara.className = 'capybara';
  game4Els.speedIndicator.style.opacity = '0';
  
  updateUI();
  
  // Setup Quit Game
  const btnBack = document.getElementById('btn-back');
  const oldBackClick = btnBack.onclick;
  btnBack.onclick = () => {
    playSound('pop');
    cleanupGame4();
    if(oldBackClick) oldBackClick();
  };

  requestAnimationFrame(gameLoop);
}

function updateUI() {
  game4Els.score.innerText = Math.floor(distance / 10);
  
  let heartsHtml = '';
  for(let i=0; i<3; i++) {
    if(i < hearts) heartsHtml += '❤️ ';
    else heartsHtml += '🖤 ';
  }
  game4Els.hearts.innerHTML = heartsHtml.trim();
  
  if (hearts <= 0) {
    triggerGameOver(false);
  }
}

function triggerGameOver(won) {
  if (!gameActive) return;
  gameActive = false;
  cleanupGame4();
  
  if (won) {
    playSound('tada');
    // Confeti
    const areaW = game4Els.area.clientWidth;
    const areaH = game4Els.area.clientHeight;
    for(let i=0; i<5; i++) {
      setTimeout(() => {
        createParticlesDirect(Math.random() * areaW, Math.random() * areaH, '🎉', 10);
        playSound('correct');
      }, i * 300);
    }
    setTimeout(() => {
      import('./main.js').then(m => m.addStars(50)); 
      document.getElementById('btn-back').click();
    }, 4000);
  } else {
    playSound('wrong');
    setTimeout(() => {
      document.getElementById('btn-back').click();
    }, 3000);
  }
}

function cleanupGame4() {
  gameActive = false;
  cancelAnimationFrame(gameLoopId);
  game4Els.optionsContainer.innerHTML = '';
}

function spawnObstacle() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 2;
  const correct = a * b;
  
  const el = document.createElement('div');
  el.className = 'obstacle';
  el.innerText = `${a}x${b}`;
  
  const startX = game4Els.area.clientWidth + 50;
  el.style.left = `${startX}px`;
  
  game4Els.obstaclesContainer.appendChild(el);
  
  const obs = {
    el,
    x: startX,
    correct,
    isCleared: false,
    a, b
  };
  
  obstacles.push(obs);
  
  // Set options for the closest uncleared obstacle
  updateOptions();
}

function updateOptions() {
  game4Els.optionsContainer.innerHTML = '';
  const activeObs = obstacles.find(o => !o.isCleared);
  if (!activeObs) return;
  
  const correct = activeObs.correct;
  let options = [correct];
  
  while(options.length < 3) {
    let errA = activeObs.a + (Math.floor(Math.random() * 3) - 1);
    let errB = activeObs.b + (Math.floor(Math.random() * 3) - 1);
    if(errA < 1) errA = 1; if(errB < 1) errB = 1;
    let wrong = errA * errB;
    if (Math.random() > 0.5) wrong += (Math.random() > 0.5 ? 2 : -2);
    if (wrong !== correct && !options.includes(wrong) && wrong > 0) {
      options.push(wrong);
    }
  }
  options.sort(() => Math.random() - 0.5);
  
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.style.flex = '1';
    btn.style.fontSize = '2rem';
    btn.style.padding = '15px';
    btn.innerText = opt;
    btn.onclick = () => onOptionClick(opt);
    game4Els.optionsContainer.appendChild(btn);
  });
}

function onOptionClick(val) {
  if (!gameActive) return;
  
  const activeObs = obstacles.find(o => !o.isCleared);
  if (!activeObs) return;
  
  // Check if obstacle is close enough to answer (e.g., within 400px of capybara)
  const capybaraRect = game4Els.capybara.getBoundingClientRect();
  const areaRect = game4Els.area.getBoundingClientRect();
  const cX = capybaraRect.left - areaRect.left;
  
  if (val === activeObs.correct) {
    // Correct!
    playSound('pop');
    activeObs.isCleared = true;
    activeObs.el.classList.add('cleared');
    
    // Jump animation
    game4Els.capybara.classList.remove('capybara-jump', 'capybara-stumble');
    void game4Els.capybara.offsetWidth; // reflow
    game4Els.capybara.classList.add('capybara-jump', 'capybara-turbo');
    game4Els.speedIndicator.style.opacity = '1';
    
    setTimeout(() => {
      game4Els.capybara.classList.remove('capybara-turbo');
      game4Els.speedIndicator.style.opacity = '0';
    }, 600);
    
    speed = Math.min(speed + 1, 15);
    updateOptions(); // load next options
  } else {
    // Wrong!
    playSound('wrong');
    hearts--;
    speed = baseSpeed;
    updateUI();
    
    game4Els.capybara.classList.remove('capybara-jump', 'capybara-stumble', 'capybara-turbo');
    void game4Els.capybara.offsetWidth;
    game4Els.capybara.classList.add('capybara-stumble');
  }
}

function gameLoop() {
  if (!gameActive) return;
  
  distance += speed;
  updateUI();
  
  // Spawn obstacles
  if (distance > nextSpawnDistance) {
    spawnObstacle();
    // Next obstacle between 400 and 800 distance units away
    nextSpawnDistance = distance + 400 + Math.random() * 400;
  }
  
  const capybaraRect = game4Els.capybara.getBoundingClientRect();
  const areaRect = game4Els.area.getBoundingClientRect();
  // We consider the collision box center ~ cX + 50
  const cX = capybaraRect.left - areaRect.left + 50; 
  
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let o = obstacles[i];
    o.x -= speed;
    o.el.style.left = `${o.x}px`;
    
    // Check hit
    if (!o.isCleared && o.x < cX) {
      // Hit!
      playSound('wrong');
      hearts--;
      speed = baseSpeed;
      updateUI();
      
      game4Els.capybara.classList.remove('capybara-jump', 'capybara-stumble', 'capybara-turbo');
      void game4Els.capybara.offsetWidth;
      game4Els.capybara.classList.add('capybara-stumble');
      
      o.el.remove();
      obstacles.splice(i, 1);
      updateOptions();
      continue;
    }
    
    // Remove if strictly off screen
    if (o.x < -100) {
      o.el.remove();
      obstacles.splice(i, 1);
    }
  }
  
  if (distance >= 5000) { // 5000 units = win
    triggerGameOver(true);
  } else if (gameActive) {
    gameLoopId = requestAnimationFrame(gameLoop);
  }
}

function createParticlesDirect(x, y, emoji, count = 6) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.innerText = emoji || '✨';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.zIndex = '50';
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 50;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const rot = (Math.random() - 0.5) * 360;
    
    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);
    p.style.setProperty('--rot', `${rot}deg`);
    
    game4Els.area.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}
