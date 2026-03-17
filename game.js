import { playSound } from './audio.js';

let score = 0;
let currentCorrect = 0;
const gameEls = {
  score: document.getElementById('game-score'),
  equation: document.getElementById('cloud-equation'),
  leaves: document.getElementById('leaves-container'),
  capybara: document.getElementById('capybara-character'),
  area: document.getElementById('game-area')
};

export function startGame() {
  score = 0;
  updateScore();
  nextRound();
}

function updateScore() {
  gameEls.score.innerText = score;
}

function nextRound() {
  // Resetear posición del capibara en el CSS en main
  gameEls.capybara.style.transform = 'translate(0px, 0px)';
  
  // Matemáticas adaptadas (7 a 9 años, tablas del 2 al 10)
  const a = Math.floor(Math.random() * 9) + 2; 
  const b = Math.floor(Math.random() * 9) + 2; 
  currentCorrect = a * b;
  gameEls.equation.innerText = `${a} × ${b} = ?`;
  
  // Generar opciones con distractores comunes
  let options = [currentCorrect];
  while(options.length < 3) {
    // Variar uno de los factores ligeramente para errores creíbles
    let errA = a + (Math.floor(Math.random() * 3) - 1);
    let errB = b + (Math.floor(Math.random() * 3) - 1);
    if(errA < 1) errA = 1; if(errB < 1) errB = 1;
    let wrong = errA * errB;
    if (Math.random() > 0.5) wrong = currentCorrect + (Math.floor(Math.random() * 5) + 1);
    
    if (wrong !== currentCorrect && !options.includes(wrong) && wrong > 0) {
      options.push(wrong);
    }
  }
  options.sort(() => Math.random() - 0.5); // Barajar
  
  // Renderizar hojas
  gameEls.leaves.innerHTML = '';
  options.forEach((opt, idx) => {
    const leaf = document.createElement('div');
    leaf.className = 'leaf';
    leaf.innerText = opt;
    
    // Distribuir el espacio horizontal
    const pos = 15 + (idx * 30);
    leaf.style.left = `${pos}%`;
    
    leaf.onclick = () => checkAnswer(opt, leaf, a, b, pos);
    gameEls.leaves.appendChild(leaf);
  });
}

function checkAnswer(selected, leafEl, a, b, targetPosPercent) {
  Array.from(gameEls.leaves.children).forEach(l => l.style.pointerEvents = 'none');
  
  if (selected === currentCorrect) {
    playSound('correct');
    leafEl.classList.add('correct');
    
    // Calcular salto animado basico
    const areaW = gameEls.area.clientWidth;
    const pxMove = (targetPosPercent / 100) * areaW;
    
    gameEls.capybara.style.transform = `translate(${pxMove - 30}px, -40px) scale(1.1)`;
    
    score += 10;
    updateScore();
    
    import('./main.js').then(m => m.addStars(1)); // Regalar 1 estrella por acierto
    
    setTimeout(nextRound, 1200);
  } else {
    playSound('wrong');
    leafEl.classList.add('wrong');
    gameEls.equation.innerText = `¡Casi! ${a} × ${b} = ${currentCorrect}`;
    // Capibara retrocede asustado
    gameEls.capybara.style.transform = `translate(-10px, 10px) rotate(-10deg)`;
    setTimeout(nextRound, 2500);
  }
}
