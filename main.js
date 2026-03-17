// MultipliZoo - Scripts Principales
import './style.css';
import { playSound } from './audio.js';

// Estado global de la aplicación
const AppState = {
  stars: parseInt(localStorage.getItem('multiplizoo_stars')) || 0,
  currentView: 'view-menu',
  history: []
};

// UI Elements Elementos clave
const els = {
  starCount: document.getElementById('star-count'),
  btnBack: document.getElementById('btn-back'),
  headerTitle: document.getElementById('header-title'),
  views: document.querySelectorAll('.view'),
  menuCards: document.querySelectorAll('.menu-card')
};

// Inicialización
function initApp() {
  updateStarsDisplay();
  setupNavigation();
  setupLearnGrid();
  setupQuizConfig();
}

// ------ Navegación (SPA Logic) ------
function navigateTo(viewId, title = 'MultipliZoo', addToHistory = true) {
  // Ocultar todas las vistas
  els.views.forEach(v => {
    v.classList.remove('active-view');
    v.style.display = '';
    v.style.flexDirection = '';
  });
  
  // Mostrar la solicitada
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active-view');
  }

  if (addToHistory && AppState.currentView !== viewId) {
    AppState.history.push({ view: AppState.currentView, title: els.headerTitle.innerText });
  }

  // Update Header
  els.headerTitle.innerText = title;
  
  AppState.currentView = viewId;

  // Toggle back button
  if (viewId === 'view-menu') {
    els.btnBack.classList.add('hidden');
    AppState.history = []; // Reset history at menu
  } else {
    els.btnBack.classList.remove('hidden');
  }
}

function processGoBack() {
  playSound('pop');
  
  // Stop any active quiz timer if leaving quiz view
  if (AppState.currentView === 'view-quiz-play') {
    import('./quiz.js').then(m => m.stopTimer());
  }

  if (AppState.history.length > 0) {
    const prev = AppState.history.pop();
    navigateTo(prev.view, prev.title, false);
  } else {
    navigateTo('view-menu', 'MultipliZoo', false);
  }
}

function setupNavigation() {
  els.btnBack.addEventListener('click', processGoBack);

  // Usar querySelectorAll localmente para atrapar todas las tarjetas, incluidas las de submenús
  const allCards = document.querySelectorAll('.menu-card');
  allCards.forEach(card => {
    card.addEventListener('click', () => {
      playSound('pop');
      const targetId = card.getAttribute('data-target');
      const titleEl = card.querySelector('h3');
      const text = titleEl ? titleEl.innerText : 'MultipliZoo';
      
      if (targetId === 'view-game') {
        import('./game.js').then(module => module.startGame());
      } else if (targetId === 'view-contest') {
        import('./quiz.js').then(m => m.startQuiz({ mode: 'contest', tables: [2,3,4,5,6,7,8,9], hints: false, time: null }));
        return; // Evitar el navigateTo default para que quiz.js controle la vista
      } else if (targetId === 'view-game2' || targetId === 'view-game3' || targetId === 'view-game4') {
        // Próximamente (Por ahora solo navegamos)
      }
      
      navigateTo(targetId, text);
    });
  });
}

// ------ Funciones Globales ------
export function addStars(amount) {
  AppState.stars += amount;
  localStorage.setItem('multiplizoo_stars', AppState.stars);
  updateStarsDisplay();
}

function updateStarsDisplay() {
  els.starCount.innerText = AppState.stars;
  
  // Animación suave de ganancia
  els.starCount.style.transform = 'scale(1.5)';
  els.starCount.style.color = '#FF5252';
  setTimeout(() => {
    els.starCount.style.transform = 'scale(1)';
    els.starCount.style.color = 'inherit';
  }, 300);
}

// ------ Interfaz Aprender ------
function setupLearnGrid() {
  const grid = document.getElementById('learn-grid');
  grid.innerHTML = '';
  
  for (let i = 0; i <= 11; i++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.innerText = i;
    btn.onclick = () => {
      playSound('pop');
      openLearnDetail(i);
    };
    grid.appendChild(btn);
  }
}

function openLearnDetail(number) {
  navigateTo('view-learn-detail', `Tabla del ${number}`);
  
  const title = document.getElementById('learn-title-detail');
  const tableDisplay = document.getElementById('learn-table-display');
  
  title.innerText = `Tabla del ${number}`;
  tableDisplay.innerHTML = '';
  
  // Generar tabla visualmente
  for(let i=0; i<=11; i++) {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `<span>${number} × ${i}</span> <span>${number * i}</span>`;
    tableDisplay.appendChild(row);
  }
  
  // Lista de videos educativos simpáticos para niños (IDs reales de Youtube de Happy Learning / Smile and Learn)
  // Como fallback genérico se usa un video representativo de tablas.
  const videoMap = {
    0: 'sA2OqXINsIE', // Usando tabla del 10 para 0 por falta de uno específico
    1: '9xpwH-57Ttc', 2: 'l1r4f6pW6QY', 3: 'M8XwWjC64x4',
    4: 'fU8s01wD5zE', 5: 'X2I-B2E2D-c', 6: '5gKIfGg3Iro',
    7: 'U6gY6PZ3u9c', 8: '2_hHMBmIt9Q', 9: 'X1E3a0K8k8k', 10: 'sA2OqXINsIE',
    11: '9xpwH-57Ttc' // Usando tabla del 1 para 11 temporalmente
  };
  const vidId = videoMap[number] || '9xpwH-57Ttc';
  
  const btnPlayVideo = document.getElementById('btn-play-video');
  const videoMenuOverlay = document.getElementById('video-menu-overlay');
  const videoMenuTitle = document.getElementById('video-menu-title');
  const btnCloseVideoMenu = document.getElementById('btn-close-video-menu');
  const videoOptions = document.querySelectorAll('.video-option-btn');
  
  const videoOverlay = document.getElementById('video-overlay');
  const ytPlaceholder = document.getElementById('youtube-fullscreen-placeholder');
  const btnCloseVideo = document.getElementById('btn-close-video');

  btnPlayVideo.onclick = () => {
    playSound('pop');
    videoMenuTitle.innerText = `Videos Tabla del ${number}`;
    videoMenuOverlay.style.display = 'flex';
  };

  btnCloseVideoMenu.onclick = () => {
    playSound('pop');
    videoMenuOverlay.style.display = 'none';
  };

  videoOptions.forEach(btn => {
    btn.onclick = (e) => {
      playSound('pop');
      const type = e.currentTarget.getAttribute('data-type');
      videoMenuOverlay.style.display = 'none';
      videoOverlay.style.display = 'flex';
      
      let titleSuffix = type === 'musical' ? 'Musical' : (type === 'teoria' ? 'Teoría' : 'Trucos');
      
      ytPlaceholder.innerHTML = `
        <iframe width="100%" height="100%" 
          src="https://www.youtube.com/embed/${vidId}?autoplay=1" 
          title="Video ${titleSuffix} - Tabla del ${number}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      `;
    };
  });

  btnCloseVideo.onclick = () => {
    playSound('pop');
    videoOverlay.style.display = 'none';
    ytPlaceholder.innerHTML = ''; // Detener el video
  };
}

// ------ Setup Configurador Quiz ------
function setupQuizConfig() {
  const container = document.getElementById('quiz-tables-selector');
  for (let i = 0; i <= 11; i++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.innerText = i;
    btn.onclick = () => {
      playSound('pop');
      btn.classList.toggle('selected');
    };
    container.appendChild(btn);
  }

  const alertOverlay = document.getElementById('custom-alert-overlay');
  const alertMessage = document.getElementById('custom-alert-message');
  
  document.getElementById('btn-close-alert').onclick = () => {
    playSound('pop');
    alertOverlay.style.display = 'none';
  };

  document.getElementById('btn-start-quiz').onclick = () => {
    playSound('pop');
    const selected = Array.from(container.querySelectorAll('.selected')).map(b => parseInt(b.innerText));
    if (selected.length === 0) {
      alertMessage.innerText = '¡Selecciona al menos 1 tabla!';
      alertOverlay.style.display = 'flex';
      return;
    }
    
    const hints = document.getElementById('quiz-hints-toggle').checked;
    const time = document.getElementById('quiz-time-toggle').checked ? 20 : null; 
    
    import('./quiz.js').then(m => m.startQuiz({ mode: 'quiz', tables: selected, hints, time }));
  };
}

// Arrancar App
document.addEventListener('DOMContentLoaded', initApp);
