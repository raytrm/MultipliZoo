import { playSound } from './audio.js';
import { addStars } from './main.js';

const els = {
  view: document.getElementById('view-quiz-play'),
  progress: document.getElementById('quiz-progress'),
  timer: document.getElementById('quiz-timer'),
  equation: document.getElementById('quiz-equation'),
  options: document.getElementById('quiz-options-container'),
  numpad: document.getElementById('quiz-numpad'),
  input: document.getElementById('quiz-input-answer'),
  numpadGrid: document.querySelector('.numpad-grid'),
  btnContinueContainer: document.getElementById('quiz-continue-container'),
  btnContinue: document.getElementById('btn-quiz-continue'),
  // Results
  viewResults: document.getElementById('view-results'),
  resTitle: document.getElementById('results-title'),
  resStars: document.getElementById('results-stars'),
  resText: document.getElementById('results-score-text'),
  btnResFinish: document.getElementById('btn-finish-results')
};

let cfg = null;
let currentQ = 0;
let totalQ = 10;
let score = 0;
let currentAns = 0;
let currentA = 0;
let currentB = 0;
let retryQueue = [];
let usedQuestions = new Set();
let timerInt = null;
let transitionTimeout = null;
let timeLeft = 0;
let waitingTransition = false;

export function startQuiz(config) {
  cfg = config;
  currentQ = 0;
  score = 0;
  retryQueue = [];
  usedQuestions.clear();
  // Número de preguntas adaptativo (10 por cada tabla elegida)
  totalQ = cfg.mode === 'contest' ? Infinity : cfg.tables.length * 10;

  if (!els.numpadGrid.children.length) buildNumpad();

  // Ocultar view-quiz si veníamos de ahí y mostrar play
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active-view');
    v.style.display = ''; // Limpiar inline styles si quedaron
    v.style.flexDirection = '';
  });
  els.view.classList.add('active-view');

  document.getElementById('header-title').innerText = cfg.mode === 'contest' ? 'Concurso (5 Minutos)' : 'Entrenar';

  // Make sure global top bar back button is visible
  document.getElementById('btn-back').classList.remove('hidden');

  if (cfg.mode === 'contest') {
    startContestTimer();
  }

  nextQuestion();
}

function startContestTimer() {
  const pBar = document.getElementById('quiz-progress-bar');
  els.timer.classList.remove('hidden');
  timeLeft = 300; // 5 minutos = 300 segundos
  els.timer.innerText = `⏱ 5:00`;

  pBar.classList.remove('hidden');
  pBar.style.transition = 'none';
  pBar.style.transform = 'scaleX(1)';
  void pBar.offsetWidth; // Forzar reflow
  pBar.style.transition = `transform 300s linear`;
  pBar.style.transform = 'scaleX(0)';

  clearInterval(timerInt);
  timerInt = setInterval(() => {
    // En concurso no pausamos por animaciones (waitingTransition),
    // el tiempo sigue corriendo como reto real
    timeLeft--;
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    els.timer.innerText = `⏱ ${m}:${s.toString().padStart(2, '0')}`;
    if (timeLeft <= 0) {
      clearInterval(timerInt);
      endQuiz();
    }
  }, 1000);
}

export function stopTimer() {
  if (timerInt) clearInterval(timerInt);
  if (transitionTimeout) clearTimeout(transitionTimeout);
  waitingTransition = false;
  els.btnContinueContainer.style.display = 'none';

  const pBar = document.getElementById('quiz-progress-bar');
  if (pBar) {
    pBar.style.transition = 'none';
    pBar.classList.add('hidden');
  }
}

function nextQuestion() {
  els.btnContinueContainer.style.display = 'none';
  if (currentQ >= totalQ) {
    endQuiz();
    return;
  }

  // Generar ecuación o sacar de la cola de reintentos
  let a, b;
  let qIndex = retryQueue.findIndex(q => q.wait <= 0);

  // Forzar si nos quedan menos/igual huecos que preguntas pendientes
  if (qIndex === -1 && retryQueue.length > 0 && (totalQ - currentQ) <= retryQueue.length) {
    qIndex = 0;
  }

  if (qIndex !== -1) {
    const qObj = retryQueue[qIndex];
    a = qObj.a;
    b = qObj.b;
    retryQueue.splice(qIndex, 1);
  } else {
    // Buscar combinación disponible
    let attempts = 0;
    let found = false;
    while (!found && attempts < 200) {
      a = cfg.tables[Math.floor(Math.random() * cfg.tables.length)];
      // Normalmente las tablas llegan hasta 10 (con 10 preguntas), pero generaremos del 1 al 10.
      b = Math.floor(Math.random() * 10) + 1;
      if (!usedQuestions.has(`${a}x${b}`)) {
        found = true;
      }
      attempts++;
    }

    // Fallback por seguridad, en caso de superar intentos por alguna tabla reducida
    if (!found) {
      a = cfg.tables[0];
      b = 1;
    }

    usedQuestions.add(`${a}x${b}`); // Añadimos la pregunta al historial nada más salir
  }

  retryQueue.forEach(q => q.wait--);

  currentA = a;
  currentB = b;
  currentAns = a * b;

  waitingTransition = false;
  currentQ++;

  if (cfg.mode === 'contest') {
    els.progress.innerText = `Aciertos: ${score}`;
  } else {
    els.progress.innerText = `Pregunta ${currentQ}/${totalQ}`;
  }

  els.equation.innerText = `${a} × ${b}`;
  els.equation.classList.remove('wrong-anim', 'correct-anim');
  els.input.value = '';

  // Configurar Timer (Solo si no es concurso)
  const pBar = document.getElementById('quiz-progress-bar');
  if (cfg.mode !== 'contest') {
    if (cfg.time) {
      // Calcular tiempo según la tabla base (a)
      let dynamicTime = 20; // Default
      if ([0, 1, 10, 11].includes(a)) {
        dynamicTime = 8;
      } else if ([2, 3, 5].includes(a)) {
        dynamicTime = 12;
      } else if ([4, 6, 9].includes(a)) {
        dynamicTime = 16;
      } else if ([7, 8].includes(a)) {
        dynamicTime = 20;
      }

      els.timer.classList.remove('hidden');
      timeLeft = dynamicTime;
      els.timer.innerText = `⏱ ${timeLeft}s`;

      // Configurar barra de progreso visual
      pBar.classList.remove('hidden');
      pBar.style.transition = 'none';
      pBar.style.transform = 'scaleX(1)';
      // Forzar reflow para reiniciar la animación
      void pBar.offsetWidth;
      pBar.style.transition = `transform ${dynamicTime}s linear`;
      pBar.style.transform = 'scaleX(0)';

      clearInterval(timerInt);
      timerInt = setInterval(() => {
        if (waitingTransition) {
          // Pausar animacion de barra
          const currentTransform = window.getComputedStyle(pBar).transform;
          pBar.style.transition = 'none';
          pBar.style.transform = currentTransform;
          return;
        }
        timeLeft--;
        els.timer.innerText = `⏱ ${timeLeft}s`;
        if (timeLeft <= 0) {
          clearInterval(timerInt);
          processAnswer(-1); // Tiempo agotado = incorrecto
        }
      }, 1000);
    } else {
      els.timer.classList.add('hidden');
      pBar.classList.add('hidden');
    }
  }

  // Renderizar métodos de respuesta
  if (cfg.hints) {
    els.numpad.classList.add('hidden');
    els.options.classList.remove('hidden');
    renderOptions(a, b);
  } else {
    els.options.classList.add('hidden');
    els.numpad.classList.remove('hidden');
  }
}

function processAnswer(givenStr) {
  if (waitingTransition) return;
  waitingTransition = true;

  // En concurso, el tiempo es global y no se pausa
  if (cfg.mode !== 'contest') {
    clearInterval(timerInt);
    // Detener barra visual de tiempo
    const pBar = document.getElementById('quiz-progress-bar');
    if (pBar && !pBar.classList.contains('hidden')) {
      const computedStyle = window.getComputedStyle(pBar);
      const transform = computedStyle.getPropertyValue('transform');
      pBar.style.transition = 'none';
      pBar.style.transform = transform;
    }
  }

  const given = parseInt(givenStr);

  // Desactivar botones de opciones inmediatamente
  const optionButtons = els.options.querySelectorAll('.quiz-opt-btn');
  optionButtons.forEach(btn => btn.disabled = true);

  if (given === currentAns) {
    playSound('correct');
    els.equation.classList.add('correct-anim');
    els.equation.innerText = `${els.equation.innerText} = ${currentAns} ✅`;
    score++;
    if (cfg.mode === 'contest') {
      els.progress.innerText = `Aciertos: ${score}`;
    }
  } else {
    playSound('wrong');
    els.equation.classList.add('wrong-anim');

    if (given === -1) {
      // Caso: Tiempo agotado
      els.equation.innerText = `${currentA} × ${currentB} = ${currentAns}`;
    } else {
      els.equation.innerText = `${els.equation.innerText} = ${currentAns}`;
    }

    // Resaltar siempre la respuesta correcta en los botones si hay opciones habilitadas
    if (cfg.hints) {
      optionButtons.forEach(btn => {
        if (parseInt(btn.innerText) === currentAns) {
          btn.classList.add('correct');
        } else if (parseInt(btn.innerText) === given) {
          btn.classList.add('wrong');
        }
      });
    }

    // Si fallamos en Quiz, repetir la pregunta más adelante
    if (cfg.mode === 'quiz') {
      retryQueue.push({ a: currentA, b: currentB, wait: 1 });
      totalQ++;
    }
  }

  if (transitionTimeout) clearTimeout(transitionTimeout);

  if (given !== currentAns) {
    // Si fue error o timeout, esperamos acción manual
    els.btnContinueContainer.style.display = 'flex';
    // No ocultamos las opciones de las pistas, pero sí el teclado si estamos en modo sin pistas
    if (!cfg.hints) {
      els.numpad.classList.add('hidden');
    }
  } else {
    // Si la respuesta fue correcta, pasamos automático en 1.5s
    transitionTimeout = setTimeout(nextQuestion, 1500);
  }
}

// ------ MODO PISTAS (OPCIONES) ------
function renderOptions(a, b) {
  els.options.innerHTML = '';
  let opts = [currentAns];
  let tries = 0;
  while (opts.length < 4) {
    tries++;
    let wrong = (a + (Math.floor(Math.random() * 3) - 1)) * (b + (Math.floor(Math.random() * 3) - 1));
    if (wrong < 0 || tries > 10) wrong = Math.floor(Math.random() * 100);
    if (!opts.includes(wrong)) opts.push(wrong);
  }
  opts.sort(() => Math.random() - 0.5);

  opts.forEach(val => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt-btn';
    btn.innerText = val;
    btn.onclick = () => {
      playSound('pop');
      if (val === currentAns) btn.classList.add('correct');
      else btn.classList.add('wrong');
      processAnswer(val);
    };
    els.options.appendChild(btn);
  });
}

// ------ MODO SIN PISTAS (NUMPAD) ------
function buildNumpad() {
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].forEach(k => {
    const btn = document.createElement('button');
    btn.innerText = k;
    btn.className = 'num-btn';
    if (k === 'OK') {
      btn.style.background = '#66BB6A';
      btn.style.color = 'white';
    }
    if (k === 'C') {
      btn.style.background = '#EF5350';
      btn.style.color = 'white';
    }
    btn.onclick = () => {
      playSound('pop');
      if (k === 'C') els.input.value = '';
      else if (k === 'OK') {
        if (!waitingTransition) processAnswer(els.input.value || -1);
      }
      else els.input.value += k;
    };
    els.numpadGrid.appendChild(btn);
  });

  els.btnContinue.onclick = () => {
    playSound('pop');
    nextQuestion();
  };
}

// ------ FIN DEL JUEGO ------
function endQuiz() {
  els.view.classList.remove('active-view');
  els.viewResults.classList.add('active-view');

  let starsGained = 0;

  if (cfg.mode === 'contest') {
    if (score >= 50) {
      playSound('tada');
      els.resTitle.innerText = "¡Leyenda!";
      els.resStars.innerText = "🌟🌟🌟🌟🌟";
      starsGained = 20;
    } else if (score >= 30) {
      playSound('tada');
      els.resTitle.innerText = "¡Experto!";
      els.resStars.innerText = "🌟🌟🌟";
      starsGained = 10;
    } else if (score >= 15) {
      playSound('correct');
      els.resTitle.innerText = "¡Muy Bien!";
      els.resStars.innerText = "⭐⭐";
      starsGained = 5;
    } else {
      playSound('wrong');
      els.resTitle.innerText = "¡Sigue practicando!";
      els.resStars.innerText = "⭐";
      starsGained = 2;
    }
    els.resText.innerText = `Resolviste ${score} operaciones en 5 minutos`;
  } else {
    // Modo Quiz normal
    const percent = score / totalQ;
    if (percent === 1) {
      playSound('tada');
      els.resTitle.innerText = "¡Perfecto!";
      els.resStars.innerText = "🌟🌟🌟";
      starsGained = 5;
    } else if (percent >= 0.7) {
      playSound('correct');
      els.resTitle.innerText = "¡Muy Bien!";
      els.resStars.innerText = "⭐⭐";
      starsGained = 2;
    } else {
      playSound('wrong');
      els.resTitle.innerText = "¡Sigue practicando!";
      els.resStars.innerText = "⭐";
      starsGained = 1;
    }
    els.resText.innerText = `Acertaste ${score} de ${totalQ}`;
  }

  addStars(starsGained);

  els.btnResFinish.onclick = () => {
    playSound('pop');
    document.getElementById('btn-back').click(); // trigger return to menu
  };
}
