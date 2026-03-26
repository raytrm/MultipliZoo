import { playSound } from './audio.js';
import { showGameResult } from './main.js';

let score = 0;
let currentCorrect = 0;
let combo = 0;
let energy = 0;
let progressStep = 0; // 0 to 100 for path
let currentBiome = 0;

const gameEls = {
  score: document.getElementById('game-score'),
  equation: document.getElementById('cloud-equation'),
  leaves: document.getElementById('leaves-container'),
  capybaraGroup: document.getElementById('capybara-group'),
  trail: document.getElementById('collectibles-trail'),
  area: document.getElementById('game-area'),
  comboText: document.getElementById('combo-text'),
  energyFill: document.getElementById('energy-bar-fill'),
  btnShop: document.getElementById('btn-shop')
};

export function startGame() {
  score = 0;
  combo = 0;
  energy = 0;
  progressStep = 0;
  currentBiome = 0;
  gameEls.trail.innerHTML = '';
  gameEls.capybaraGroup.classList.remove('celebration-mode');
  // Start at exactly the beginning of the path
  const startPos = getPathPosition(0);
  gameEls.capybaraGroup.style.transform = `translate(${startPos.x - 24}px, ${startPos.y - 36}px)`;
  gameEls.area.className = 'game-area bg-biome-0';
  updateScore();
  updateEnergy();

  // Position the finish flag exactly at the end of the path
  const endPos = getPathPosition(100);
  const flag = document.querySelector('.finish-line');
  if (flag) {
    flag.style.left = `${endPos.x}px`;
    flag.style.top = `${endPos.y - 30}px`; // Ajuste para que el asta toque la línea
  }

  nextRound();

  // Setup Shop (Amigos)
  // Re-fetch element directly from document to avoid detached DOM references
  const shopBtn = document.getElementById('btn-shop');
  shopBtn.onclick = () => {
    if (shopBtn.disabled) return;
    playSound('pop');
    openFriendSelector();
  };

  const closeFriendsBtn = document.getElementById('btn-close-friends');
  if (closeFriendsBtn) {
    closeFriendsBtn.onclick = () => {
      playSound('pop');
      document.getElementById('friend-selector-overlay').style.display = 'none';
    };
  }

  const refreshFriendsBtn = document.getElementById('btn-refresh-friends');
  if (refreshFriendsBtn) {
    refreshFriendsBtn.onclick = () => {
      playSound('pop');
      openFriendSelector();
    };
  }
}

function updateScore() {
  gameEls.score.innerText = score;
}

function updateEnergy() {
  const percent = Math.min(100, (energy / 5) * 100); // 5 aciertos para llenar
  gameEls.energyFill.style.width = `${percent}%`;

  const shopBtn = document.getElementById('btn-shop');
  if (!shopBtn) return;

  if (energy >= 5) {
    shopBtn.disabled = false;
    shopBtn.style.background = '#4CAF50';
    shopBtn.style.boxShadow = '0 6px 0 #388E3C';
    shopBtn.style.opacity = '1';
    shopBtn.style.transform = 'scale(1.05)';
    shopBtn.innerText = '🐾 ¡Elige Amigo!';
  } else {
    shopBtn.disabled = true;
    shopBtn.style.background = '#9E9E9E';
    shopBtn.style.boxShadow = '0 4px 0 #757575';
    shopBtn.style.opacity = '0.7';
    shopBtn.style.transform = 'scale(1)';
    shopBtn.innerText = '🐾 Amigos';
  }
}

const availableFriends = ['🦆', '🐸', '🐢', '🦋', '🐒', '🦜', '🦥', '🦦', '🦩'];

function openFriendSelector() {
  const friendOverlay = document.getElementById('friend-selector-overlay');
  const friendGrid = document.getElementById('friend-grid');

  if (!friendOverlay || !friendGrid) return;

  friendGrid.innerHTML = '';
  // Elegir 3 opciones aleatorias
  let options = [...availableFriends].sort(() => 0.5 - Math.random()).slice(0, 3);

  options.forEach(friend => {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.style.fontSize = '3rem';
    btn.innerText = friend;
    btn.onclick = () => {
      playSound('tada');
      friendOverlay.style.display = 'none';
      addFriendToTrail(friend);

      // Reiniciar barra de energía
      energy = 0;
      updateEnergy();
    };
    friendGrid.appendChild(btn);
  });

  friendOverlay.style.display = 'flex';
}

function createParticles(x, y, emoji, count = 8) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.innerText = emoji || '🍊';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;

    // Random trajectory
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 100;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const rot = (Math.random() - 0.5) * 360;

    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);
    p.style.setProperty('--rot', `${rot}deg`);

    gameEls.area.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

function showComboText(text) {
  gameEls.comboText.innerText = text;
  gameEls.comboText.classList.remove('hidden');
  void gameEls.comboText.offsetWidth; // Reflow
  setTimeout(() => gameEls.comboText.classList.add('hidden'), 1500);
}

function addFriendToTrail(friend) {
  const f = document.createElement('div');
  f.innerText = friend;
  f.style.position = 'absolute';
  f.style.fontSize = '3rem';
  f.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
  f.style.animation = 'popBounce 0.5s ease-out';
  gameEls.trail.appendChild(f);
  updateFriendsPositions();
}

function updateFriendsPositions() {
  const friends = Array.from(gameEls.trail.children);
  const capybaraOffsetX = -24;
  const capybaraOffsetY = -36;
  friends.forEach((f, idx) => {
    let targetStep = progressStep - ((idx + 1) * 5); // 5% de distancia focal por amigo
    if (targetStep < 0) targetStep = 0;

    const pos = getPathPosition(targetStep);
    const flip = targetStep > 25 && targetStep < 75 ? 'scaleX(-1)' : 'scaleX(1)';

    // Ocultar al amigo si todavía está completamente en el inicio y el capibara apenas arranca
    if (targetStep === 0 && progressStep < 5) {
      f.style.opacity = '0';
    } else {
      f.style.opacity = '1';
    }

    f.style.transform = `translate(${pos.x + capybaraOffsetX}px, ${pos.y + capybaraOffsetY}px) ${flip}`;
  });
}

function updateBiome() {
  const newBiome = Math.floor(combo / 5);
  if (newBiome !== currentBiome && newBiome <= 3) {
    currentBiome = newBiome;
    gameEls.area.className = `game-area bg-biome-${currentBiome}`;
    showComboText('¡Nuevo Paisaje!');
  }
}

function triggerWin() {
  playSound('tada');
  showComboText('¡Fiesta!');
  gameEls.equation.innerText = "¡Llegamos!";
  gameEls.leaves.innerHTML = ''; // Limpiar hojas

  // Confeti por todas partes
  const areaW = gameEls.area.clientWidth;
  const areaH = gameEls.area.clientHeight;

  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      createParticles(Math.random() * areaW, Math.random() * areaH, '🎉', 15);
      createParticles(Math.random() * areaW, Math.random() * areaH, '✨', 10);
      playSound('correct');
    }, i * 400);
  }

  // Añadir un pequeño salto festivo al grupo en el centro
  gameEls.capybaraGroup.classList.add('celebration-mode');
  gameEls.capybaraGroup.style.animation = 'popBounce 1s infinite alternate';

  // Amigos se reúnen en la meta
  const friends = Array.from(gameEls.trail.children);
  friends.forEach((f, idx) => {
    setTimeout(() => {
      const pos = getPathPosition(100);
      const flip = 'scaleX(1)';
      const offsetX = -24 + (Math.random() * 30 - 15);
      const offsetY = -36 + (Math.random() * 30 - 15);
      f.style.transform = `translate(${pos.x + offsetX}px, ${pos.y + offsetY}px) ${flip}`;
      f.classList.add('celebration-mode');
      f.style.animation = 'popBounce 1s infinite alternate';
    }, 300 + (idx * 250)); // Se van juntando poco a poco
  });

  // Mostrar modal de resultado después de unos segundos
  setTimeout(() => {
    gameEls.capybaraGroup.style.animation = 'none';
    showGameResult('¡Victoria!', `¡Completaste el Camino del Carpincho con ${score} puntos!`, startGame);
  }, 4500);
}

function getPathPosition(percent) {
  const svg = document.querySelector('.path-svg');
  const path = document.querySelector('.path-line');
  if (!svg || !path) return { x: 0, y: 0 };

  const length = path.getTotalLength();
  const point = path.getPointAtLength(length * (percent / 100));

  const areaW = gameEls.area.clientWidth;
  const areaH = gameEls.area.clientHeight;

  return {
    x: (point.x / 400) * areaW,
    y: (point.y / 450) * areaH
  };
}

function nextRound() {
  // Posición basada en progressStep (0 to 100%) sobre el camino SVG
  const pos = getPathPosition(progressStep);

  const capybaraOffsetX = -24;
  const capybaraOffsetY = -36;
  const flip = progressStep > 25 && progressStep < 75 ? 'scaleX(-1)' : 'scaleX(1)';

  gameEls.capybaraGroup.style.transform = `translate(${pos.x + capybaraOffsetX}px, ${pos.y + capybaraOffsetY}px) ${flip}`;
  updateFriendsPositions();

  // Win condition: Meta alcanzada
  if (progressStep >= 100) {
    triggerWin();
    return;
  }

  const a = Math.floor(Math.random() * 9) + 2;
  const b = Math.floor(Math.random() * 9) + 2;
  currentCorrect = a * b;
  gameEls.equation.innerText = `${a} × ${b}`;

  let options = [currentCorrect];
  while (options.length < 3) {
    let errA = a + (Math.floor(Math.random() * 3) - 1);
    let errB = b + (Math.floor(Math.random() * 3) - 1);
    if (errA < 1) errA = 1; if (errB < 1) errB = 1;
    let wrong = errA * errB;
    if (Math.random() > 0.5) wrong = currentCorrect + (Math.floor(Math.random() * 5) + 1);
    if (wrong !== currentCorrect && !options.includes(wrong) && wrong > 0) {
      options.push(wrong);
    }
  }
  options.sort(() => Math.random() - 0.5);

  gameEls.leaves.innerHTML = '';
  options.forEach((opt, idx) => {
    const leaf = document.createElement('div');
    leaf.className = 'leaf';
    leaf.innerText = opt;
    const posX = 15 + (idx * 30);
    leaf.style.left = `${posX}%`;
    leaf.onclick = () => checkAnswer(opt, leaf, a, b, posX);
    gameEls.leaves.appendChild(leaf);
  });
}

function checkAnswer(selected, leafEl, a, b, targetPosPercent) {
  Array.from(gameEls.leaves.children).forEach(l => l.style.pointerEvents = 'none');

  if (selected === currentCorrect) {
    playSound('correct');
    leafEl.classList.add('correct');

    const rect = leafEl.getBoundingClientRect();
    const areaRect = gameEls.area.getBoundingClientRect();
    createParticles(rect.left - areaRect.left + 35, rect.top - areaRect.top + 15, '🍊');

    combo++;
    if (energy < 5) energy++; // Cap a 5 para habilitar botón de amigos

    score += 10;
    updateScore();
    updateEnergy();

    if (combo > 1 && combo % 3 === 0) {
      const texts = ['¡Increíble!', '¡Racha!', '¡Fantástico!', '¡Genial!'];
      showComboText(texts[Math.floor(Math.random() * texts.length)]);
    }

    updateBiome();

    // Avanzamos 5% por cada acierto (20 aciertos para ganar, avanza a la mitad de velocidad)
    progressStep += 5;

    import('./main.js').then(m => m.addStars(1));
    setTimeout(nextRound, 1000);
  } else {
    playSound('wrong');
    leafEl.classList.add('wrong');
    gameEls.equation.innerText = `${a} × ${b} = ${currentCorrect}`;

    const correctLeaf = Array.from(gameEls.leaves.children).find(l => parseInt(l.innerText) === currentCorrect);
    if (correctLeaf) correctLeaf.classList.add('highlight-correct');

    score = Math.max(0, score - 10);
    updateScore();

    combo = 0;
    energy = 0;
    updateEnergy();
    updateBiome();

    // Tropezar (animación ligera en el lugar actual)
    const currentPos = getPathPosition(progressStep);
    const flip = progressStep > 25 && progressStep < 75 ? 'scaleX(-1)' : 'scaleX(1)';

    gameEls.capybaraGroup.style.transform = `translate(${currentPos.x - 24}px, ${currentPos.y - 36}px) ${flip} rotate(-10deg)`;
    setTimeout(nextRound, 2500);
  }
}
