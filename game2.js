import { playSound } from './audio.js';
import { showGameResult } from './main.js';

let score = 0;
let hearts = 3;
let currentCorrect = 0;
let currentA = 0;
let currentB = 0;
let oranges = [];
let gameLoopId = null;
let lastSpawnTime = 0;
let isDragging = false;
let gameActive = false;
let spawnInterval = 1500;
let fallSpeed = 2; // px per frame
let playTimeTimer = null;
let timeLeft = 60; // 60 seconds arcade mode

const game2Els = {
  score: document.getElementById('game2-score'),
  hearts: document.getElementById('game2-hearts'),
  equation: document.getElementById('game2-equation'),
  area: document.getElementById('game2-area'),
  fallingItems: document.getElementById('game2-falling-items'),
  capybara: document.getElementById('game2-capybara')
};

export function startGame2() {
  score = 0;
  hearts = 3;
  timeLeft = 60;
  oranges = [];
  gameActive = true;
  spawnInterval = 1500;
  fallSpeed = 2;
  
  game2Els.fallingItems.innerHTML = '';
  updateScore();
  updateHearts();
  
  // Center capybara
  game2Els.capybara.style.left = '50%';
  
  generateEquation();
  
  // Setup Quit Game (btn-back is handled in main.js, we just need to stop the loop)
  const btnBack = document.getElementById('btn-back');
  const oldBackClick = btnBack.onclick;
  btnBack.onclick = () => {
    playSound('pop');
    cleanupGame2();
    if(oldBackClick) oldBackClick();
  };

  setupControls();
  
  lastSpawnTime = Date.now();
  requestAnimationFrame(gameLoop);
  
  playTimeTimer = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      triggerGameOver(true);
    } else if (timeLeft % 10 === 0) {
      // Increase difficulty every 10 seconds
      fallSpeed += 0.5;
      spawnInterval = Math.max(800, spawnInterval - 200);
    }
  }, 1000);
}

function generateEquation() {
  currentA = Math.floor(Math.random() * 9) + 2;
  currentB = Math.floor(Math.random() * 9) + 2;
  currentCorrect = currentA * currentB;
  game2Els.equation.innerText = `${currentA} × ${currentB}`;
  
  // Also clear any existing falling oranges to focus on the new equation
  game2Els.fallingItems.innerHTML = '';
  oranges = [];
}

function updateScore() {
  game2Els.score.innerText = score;
}

function updateHearts() {
  let heartsHtml = '';
  for(let i=0; i<3; i++) {
    if(i < hearts) heartsHtml += '❤️ ';
    else heartsHtml += '🖤 ';
  }
  game2Els.hearts.innerHTML = heartsHtml.trim();
  
  if (hearts <= 0) {
    triggerGameOver(false);
  }
}

function triggerGameOver(wonByTime) {
  if (!gameActive) return;
  gameActive = false;
  cleanupGame2();
  
  if (wonByTime) {
    playSound('tada');
    game2Els.equation.innerText = "¡Tiempo al límite!";
    // Confeti
    const areaW = game2Els.area.clientWidth;
    const areaH = game2Els.area.clientHeight;
    for(let i=0; i<5; i++) {
      setTimeout(() => {
        createParticles(Math.random() * areaW, Math.random() * areaH, '🎉', 10);
        playSound('correct');
      }, i * 300);
    }
    setTimeout(() => {
      import('./main.js').then(m => m.addStars(Math.floor(score / 20))); 
      showGameResult('¡Tiempo Dominado!', `¡Atrapaste increíbles naranjas por valor de ${score} puntos!`, startGame2);
    }, 3000);
  } else {
    playSound('wrong');
    game2Els.equation.innerText = "¡Oh no, te quedaste sin corazones!";
    setTimeout(() => {
      showGameResult('¡Oh no!', `Atrapaste naranjas por valor de ${score} puntos. ¡Inténtalo de nuevo!`, startGame2);
    }, 2000);
  }
}

function cleanupGame2() {
  gameActive = false;
  cancelAnimationFrame(gameLoopId);
  clearInterval(playTimeTimer);
  
  // Remove event listeners by cloning
  const newCapybara = game2Els.capybara.cloneNode(true);
  game2Els.capybara.parentNode.replaceChild(newCapybara, game2Els.capybara);
  game2Els.capybara = newCapybara;
  
  const newArea = game2Els.area.cloneNode(true);
  game2Els.area.parentNode.replaceChild(newArea, game2Els.area);
  game2Els.area = newArea;
}

function setupControls() {
  // Desktop Mouse
  game2Els.area.addEventListener('mousedown', (e) => {
    isDragging = true;
    moveCapybara(e.clientX);
  });
  window.addEventListener('mousemove', (e) => {
    if (isDragging) moveCapybara(e.clientX);
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Mobile Touch
  game2Els.area.addEventListener('touchstart', (e) => {
    isDragging = true;
    moveCapybara(e.touches[0].clientX);
  });
  window.addEventListener('touchmove', (e) => {
    if (isDragging) {
      e.preventDefault(); // prevent scrolling
      moveCapybara(e.touches[0].clientX);
    }
  }, { passive: false });
  window.addEventListener('touchend', () => {
    isDragging = false;
  });
}

function moveCapybara(clientX) {
  if (!gameActive) return;
  const rect = game2Els.area.getBoundingClientRect();
  let x = clientX - rect.left;
  // Bounds
  if (x < 40) x = 40;
  if (x > rect.width - 40) x = rect.width - 40;
  
  game2Els.capybara.style.left = `${x}px`;
}

function spawnOrange() {
  const isCorrect = Math.random() > 0.6; // 40% correct
  let value = currentCorrect;
  
  if (!isCorrect) {
    let errA = currentA + (Math.floor(Math.random() * 3) - 1);
    let errB = currentB + (Math.floor(Math.random() * 3) - 1);
    if(errA < 1) errA = 1; if(errB < 1) errB = 1;
    value = errA * errB;
    if (value === currentCorrect) value += (Math.random() > 0.5 ? 2 : -2);
    if (value < 0) value = Math.abs(value);
  }
  
  const orange = document.createElement('div');
  orange.className = 'falling-orange';
  orange.innerText = value;
  
  const rect = game2Els.area.getBoundingClientRect();
  const startX = 25 + Math.random() * (rect.width - 50); // Avoid edges
  
  orange.style.left = `${startX}px`;
  orange.style.top = `-50px`;
  
  game2Els.fallingItems.appendChild(orange);
  
  oranges.push({
    el: orange,
    x: startX,
    y: -50,
    isCorrect: isCorrect,
    value: value
  });
}

function gameLoop() {
  if (!gameActive) return;
  
  const now = Date.now();
  if (now - lastSpawnTime > spawnInterval) {
    spawnOrange();
    lastSpawnTime = now;
  }
  
  const capybaraRect = game2Els.capybara.getBoundingClientRect();
  const areaRect = game2Els.area.getBoundingClientRect();
  
  // Capybara relative to area
  const cX = capybaraRect.left - areaRect.left + (capybaraRect.width / 2);
  const cY = capybaraRect.top - areaRect.top + (capybaraRect.height / 2);
  const hitRadius = 40; // hit box size
  
  for (let i = oranges.length - 1; i >= 0; i--) {
    let o = oranges[i];
    o.y += fallSpeed;
    o.el.style.top = `${o.y}px`;
    
    // Check collision
    const dx = (o.x + 25) - cX;
    const dy = (o.y + 25) - cY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < hitRadius) {
      // Caught!
      if (o.value === currentCorrect) {
        playSound('correct');
        score += 10;
        updateScore();
        createParticles(o.x, o.y, '✨', 5);
        generateEquation(); // Next round
      } else {
        playSound('wrong');
        hearts--;
        updateHearts();
        game2Els.capybara.innerText = '😵';
        setTimeout(() => { if(gameActive) game2Els.capybara.innerText = '🐹'; }, 500);
      }
      
      o.el.remove();
      oranges.splice(i, 1);
      continue;
    }
    
    // Check out of bounds (hit ground)
    if (o.y > areaRect.height) {
      if (o.value === currentCorrect) {
        // Punish dropping the correct answer
        playSound('wrong');
        hearts--;
        updateHearts();
        game2Els.capybara.innerText = '😭';
        setTimeout(() => { if(gameActive) game2Els.capybara.innerText = '🐹'; }, 500);
        // Force new equation to prevent soft-lock if they miss it
        generateEquation();
      }
      o.el.remove();
      oranges.splice(i, 1);
    }
  }
  
  if (gameActive) {
    gameLoopId = requestAnimationFrame(gameLoop);
  }
}

function createParticles(x, y, emoji, count = 5) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.innerText = emoji || '🍊';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 60;
    const tx = x + Math.cos(angle) * distance;
    const ty = y + Math.sin(angle) * distance;
    const rot = (Math.random() - 0.5) * 360;
    
    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);
    p.style.setProperty('--rot', `${rot}deg`);
    
    game2Els.area.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}
