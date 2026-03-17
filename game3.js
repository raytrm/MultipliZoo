import { playSound } from './audio.js';

let score = 0;
let currentTable = 0;
let sequenceIndex = 0;
let targetSequence = [];
let allLilypads = [];
let capybaraPos = { x: 50, y: 90 }; // Percentages relative to container area

const game3Els = {
  score: document.getElementById('game3-score'),
  tableIndicator: document.getElementById('game3-table-indicator'),
  instruction: document.getElementById('game3-instruction'),
  area: document.getElementById('game3-area'),
  lilypadsContainer: document.getElementById('game3-lilypads'),
  capybara: document.getElementById('game3-capybara')
};

export function startGame3() {
  score = 0;
  sequenceIndex = 0;
  allLilypads = [];
  capybaraPos = { x: 50, y: 90 };
  
  updateScore();
  game3Els.lilypadsContainer.innerHTML = '';
  
  // Pick random table (2-9)
  currentTable = Math.floor(Math.random() * 8) + 2;
  game3Els.tableIndicator.innerText = `Tabla del ${currentTable}`;
  
  // Generate sequence 1x to 6x
  targetSequence = [
    currentTable * 1,
    currentTable * 2,
    currentTable * 3,
    currentTable * 4,
    currentTable * 5,
    currentTable * 6
  ];
  
  game3Els.instruction.innerText = `¿Dónde está ${targetSequence[sequenceIndex]}?`;
  
  // Generate level
  generateLevel();
  positionCapybara(capybaraPos.x, capybaraPos.y);
  
  // Setup Quit Game
  const btnBack = document.getElementById('btn-back');
  const oldBackClick = btnBack.onclick;
  btnBack.onclick = () => {
    playSound('pop');
    if(oldBackClick) oldBackClick();
  };
}

function updateScore() {
  game3Els.score.innerText = score;
}

function positionCapybara(pctX, pctY) {
  capybaraPos.x = pctX;
  capybaraPos.y = pctY;
  // Account for capybara center width/height visually (56px approx size)
  game3Els.capybara.style.left = `calc(${pctX}% - 28px)`;
  game3Els.capybara.style.top = `calc(${pctY}% - 60px)`;
  // Important to reset bottom/transform since index HTML used them initially
  game3Els.capybara.style.bottom = 'auto';
  game3Els.capybara.style.transform = 'none';
}

function generateLevel() {
  // We need the 6 correct ones + 4 fakes
  let items = [...targetSequence];
  
  while(items.length < 10) {
    let wrong = (Math.floor(Math.random() * 9) + 1) * currentTable;
    if (Math.random() > 0.5) wrong += 2; // Offset it
    if (!items.includes(wrong) && wrong > 0) items.push(wrong);
  }
  
  // Shuffle items except we want a somewhat vertical progression towards the top.
  // We will assign them random grid cells to avoid overlap.
  items.sort(() => Math.random() - 0.5);
  
  // Create a grid 3x4
  let cells = [];
  for(let row=0; row<4; row++) {
    for(let col=0; col<3; col++) {
      if (row === 3 && col === 1) continue; // Skip bottom center where capybara starts
      cells.push({ row, col });
    }
  }
  cells.sort(() => Math.random() - 0.5);
  
  items.forEach((num, i) => {
    const cell = cells[i];
    // Convert cell grid to percentage with some randomness
    const basePctX = 15 + (cell.col * 35);
    const basePctY = 15 + (cell.row * 22);
    
    // Add noise
    const pctX = basePctX + (Math.random() * 10 - 5);
    const pctY = basePctY + (Math.random() * 10 - 5);
    
    createLilypad(num, pctX, pctY);
  });
}

function createLilypad(num, pctX, pctY) {
  const pad = document.createElement('div');
  pad.className = 'lilypad';
  pad.innerText = num;
  pad.style.left = `${pctX}%`;
  pad.style.top = `${pctY}%`;
  
  pad.onclick = () => onLilypadClick(pad, num, pctX, pctY);
  
  game3Els.lilypadsContainer.appendChild(pad);
  allLilypads.push(pad);
}

function onLilypadClick(pad, num, pctX, pctY) {
  if (pad.classList.contains('visited') || pad.classList.contains('sinking')) return;
  
  const expected = targetSequence[sequenceIndex];
  
  if (num === expected) {
    // Correct Jump!
    playSound('pop');
    pad.classList.add('visited');
    positionCapybara(pctX, pctY);
    
    score += 15;
    updateScore();
    
    sequenceIndex++;
    if (sequenceIndex < targetSequence.length) {
      game3Els.instruction.innerText = `¡Bien! Ahora... ${targetSequence[sequenceIndex]}`;
      createParticles(pad, '✨');
    } else {
      game3Els.instruction.innerText = `¡Cruzaste el río!`;
      triggerWin();
    }
    
  } else {
    // Wrong Jump! 
    playSound('wrong');
    score = Math.max(0, score - 5);
    updateScore();
    const oldPos = { ...capybaraPos };
    
    // Capybara jumps to it, but it sinks
    positionCapybara(pctX, pctY);
    pad.classList.add('sinking');
    createParticles(pad, '💧', 10);
    
    setTimeout(() => {
      // jump back
      if (oldPos.x === 50 && oldPos.y === 90) {
        positionCapybara(50, 90); 
      } else {
        positionCapybara(oldPos.x, oldPos.y);
      }
    }, 600);
  }
}

function triggerWin() {
  playSound('tada');
  game3Els.instruction.innerText = "¡Prueba superada!";
  
  const areaW = game3Els.area.clientWidth;
  const areaH = game3Els.area.clientHeight;
  
  for(let i=0; i<4; i++) {
    setTimeout(() => {
      const rect = game3Els.capybara.getBoundingClientRect();
      const pX = rect.left - game3Els.area.getBoundingClientRect().left + 20;
      const pY = rect.top - game3Els.area.getBoundingClientRect().top + 20;
      createParticlesDirect(pX, pY, '🎉', 10);
      playSound('correct');
    }, i * 400);
  }
  
  setTimeout(() => {
    import('./main.js').then(m => m.addStars(Math.floor(score / 10))); 
    document.getElementById('btn-back').click();
  }, 4000);
}

function createParticles(element, emoji, count = 6) {
  const rect = element.getBoundingClientRect();
  const aRect = game3Els.area.getBoundingClientRect();
  const cX = rect.left - aRect.left + (rect.width/2);
  const cY = rect.top - aRect.top + (rect.height/2);
  createParticlesDirect(cX, cY, emoji, count);
}

function createParticlesDirect(x, y, emoji, count = 6) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.innerText = emoji || '✨';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 50;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const rot = (Math.random() - 0.5) * 360;
    
    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);
    p.style.setProperty('--rot', `${rot}deg`);
    
    game3Els.area.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}
