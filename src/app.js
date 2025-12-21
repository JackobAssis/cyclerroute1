/**
 * CyclerRoute - PWA para Ciclistas
 * App principal com GPS real usando OSRM
 */

import * as db from './storage/db.js';
import * as routeCreatorOSRM from './map/route-creator-osrm.js';
import * as gpsNavigator from './map/gps-navigator.js';
import { createCurrentIcon } from './map/map-init.js';

// ========================================
// ESTADO GLOBAL
// ========================================

let currentScreen = 'home';
let currentRoute = null;
let maps = {}; // Mapas Leaflet para cada tela
let allRoutes = [];

// ========================================
// INICIALIZAÇÃO
// ========================================

window.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  console.log('🚴 CyclerRoute iniciando...');
  
  try {
    // Splash screen
    if (window.SplashScreen) {
      window.SplashScreen.create();
      window.SplashScreen.updateStatus('Carregando...');
    }
    
    // Inicializa DB
    await db.openDB();
    console.log('✓ Database pronto');
    
    // Carrega rotas
    allRoutes = await loadAllRoutes();
    console.log(`✓ ${allRoutes.length} rotas carregadas`);
    
    // Configura event listeners
    setupEventListeners();
    console.log('✓ Event listeners configurados');
    
    // Inicializa mapa da home
    initHomeMap();
    console.log('✓ Mapa home inicializado');
    
    // Esconde splash
    setTimeout(() => {
      if (window.SplashScreen) {
        window.SplashScreen.hide();
      }
    }, 800);
    
    console.log('✅ App pronto!');
  } catch (error) {
    console.error('❌ Erro ao inicializar:', error);
    alert('Erro ao inicializar o app');
  }
}

// ========================================
// NAVEGAÇÃO ENTRE TELAS
// ========================================

function showScreen(screenName) {
  // Esconde todas as telas
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  
  // Mostra tela solicitada
  const screen = document.getElementById(`screen-${screenName}`);
  if (screen) {
    // guarda tela anterior
    const previousScreen = currentScreen;

    screen.classList.add('active');
    currentScreen = screenName;

    // Limpeza ao sair da tela de criação
    if (previousScreen === 'create' && screenName !== 'create') {
      try {
        gpsNavigator.stopPassiveTracking();
      } catch (e) {}
      if (createControls.currentMarker && maps.create) {
        try { maps.create.removeLayer(createControls.currentMarker); } catch (e) {}
        createControls.currentMarker = null;
      }
      if (createControls.container) {
        createControls.container.remove();
        createControls.container = null;
      }
      createControls.gpsActive = false;
    }

    // Callbacks específicas por tela
    if (screenName === 'create') {
      initCreateMap();
    } else if (screenName === 'routes-list') {
      renderRoutesList();
    }
  }
}

function goHome() {
  showScreen('home');
}

function goToCreate() {
  showScreen('create');
}

function goToRoutesList() {
  showScreen('routes-list');
}

function goToViewRoute(routeId) {
  currentRoute = allRoutes.find(r => r.id === routeId);
  if (currentRoute) {
    showScreen('view-route');
    initViewMap();
  }
}

function goToNavigate() {
  if (currentRoute) {
    showScreen('navigate');
    initNavigateMap();
  }
}

// ========================================
// MAPA HOME
// ========================================

function initHomeMap() {
  if (maps.home) return;
  
  const mapElement = document.getElementById('map-home');
  if (!mapElement) return;
  
  // Cria mapa
  maps.home = L.map('map-home', {
    zoomControl: true,
    attributionControl: true
  }).setView([-23.5505, -46.6333], 13); // São Paulo como padrão
  
  // Adiciona tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(maps.home);
  
  // Tenta centralizar no usuário
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        maps.home.setView([latitude, longitude], 15);
        
        // Adiciona marcador
        L.marker([latitude, longitude]).addTo(maps.home)
          .bindPopup('Você está aqui')
          .openPopup();
      },
      (error) => {
        console.warn('Erro ao obter localização:', error);
      }
    );
  }
}

// ========================================
// CRIAR ROTA
// ========================================

let createState = {
  pointsCount: 0,
  distance: 0,
  duration: 0,
  canSave: false
};

// UI controls específicos da tela de criação
let createControls = {
  container: null,
  currentMarker: null,
  gpsActive: false,
  snapToRoads: true
};

function initCreateMap() {
  if (maps.create) {
    // Limpa rota anterior
    routeCreatorOSRM.clearRoute();
    updateCreateUI();
    return;
  }
  
  const mapElement = document.getElementById('map-create');
  if (!mapElement) return;
  
  // Cria mapa
  maps.create = L.map('map-create', {
    zoomControl: true,
    attributionControl: true
  }).setView([-23.5505, -46.6333], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(maps.create);
  
  // Centraliza no usuário
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      maps.create.setView([latitude, longitude], 15);
    });
  }
  
  // Inicializa criador de rotas
  routeCreatorOSRM.initRouteCreator(maps.create);
  
  // Configura callbacks
  routeCreatorOSRM.setCallbacks({
    onWaypointAdded: (count) => {
      createState.pointsCount = count;
      updateCreateUI();
    },
    onRouteCalculated: (routeData) => {
      createState.distance = routeData.distance;
      createState.duration = routeData.duration;
      createState.canSave = true;
      updateCreateUI();
    },
    onRouteCleared: () => {
      createState = { pointsCount: 0, distance: 0, duration: 0, canSave: false };
      updateCreateUI();
    }
  });
  
  updateCreateUI();

  // Inicia rastreamento passivo para centralização e botão "Adicionar minha posição"
  try {
    gpsNavigator.startPassiveTracking((pos) => {
      // Atualiza marcador de posição atual
      if (!createControls.currentMarker) {
        createControls.currentMarker = L.circleMarker([pos.lat, pos.lng], {
          color: '#ffaa00',
          fillColor: '#ffaa00',
          fillOpacity: 0.9,
          radius: 8,
          weight: 3
        }).addTo(maps.create);
      } else {
        createControls.currentMarker.setLatLng([pos.lat, pos.lng]);
      }
    });
    createControls.gpsActive = true;
  } catch (e) {
    console.warn('Não foi possível iniciar rastreamento passivo:', e);
  }

  // Remove controles flutuantes se existirem
  if (createControls.container) {
    createControls.container.remove();
    createControls.container = null;
  }
}

function updateCreateUI() {
  // Atualiza contadores
  document.getElementById('points-count').textContent = createState.pointsCount;
  
  const distKm = (createState.distance / 1000).toFixed(2);
  document.getElementById('distance-display').textContent = `${distKm} km`;
  
  const durationMin = Math.round(createState.duration / 60);
  document.getElementById('duration-display').textContent = `${durationMin} min`;
  
  // Habilita/desabilita botão salvar
  const btnSave = document.getElementById('btn-save-route');
  if (btnSave) {
    btnSave.disabled = !createState.canSave;
  }
}

function clearRoute() {
  routeCreatorOSRM.clearRoute();
  createState = { pointsCount: 0, distance: 0, duration: 0, canSave: false };
  updateCreateUI();
}

// ...existing code...

function openSaveDialog() {
  if (!createState.canSave) return;
  
  const dialog = document.getElementById('dialog-save-route');
  dialog.style.display = 'flex';
  
  // Limpa campos
  document.getElementById('input-route-name').value = '';
  document.getElementById('input-route-description').value = '';
  
  // Foca no input
  setTimeout(() => {
    document.getElementById('input-route-name').focus();
  }, 100);
}

function closeSaveDialog() {
  document.getElementById('dialog-save-route').style.display = 'none';
}

async function confirmSaveRoute() {
  const name = document.getElementById('input-route-name').value.trim();
  const description = document.getElementById('input-route-description').value.trim();
  
  if (!name) {
    alert('Digite um nome para a rota');
    return;
  }
  
  const routeData = routeCreatorOSRM.getRouteData();
  if (!routeData) {
    alert('Nenhuma rota para salvar');
    return;
  }
  
  try {
    const route = {
      id: generateId(),
      name: name,
      description: description,
      waypoints: routeData.waypoints,
      distance: routeData.distance,
      duration: routeData.duration,
      createdAt: new Date().toISOString()
    };
    
    await db.writeRoute(route);
    console.log('✓ Rota salva:', route);
    
    // Atualiza lista
    allRoutes = await loadAllRoutes();
    
    // Fecha dialog
    closeSaveDialog();
    
    // Feedback
    alert('Rota salva com sucesso!');
    
    // Volta para home
    goHome();
  } catch (error) {
    console.error('Erro ao salvar rota:', error);
    alert('Erro ao salvar rota');
  }
}

// ========================================
// LISTAR ROTAS
// ========================================

async function loadAllRoutes() {
  try {
    return await db.getAllRoutes();
  } catch (error) {
    console.error('Erro ao carregar rotas:', error);
    return [];
  }
}

function renderRoutesList() {
  const container = document.getElementById('routes-list-container');
  const emptyState = document.getElementById('empty-routes');
  
  if (allRoutes.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }
  
  container.style.display = 'block';
  emptyState.style.display = 'none';
  
  container.innerHTML = allRoutes.map(route => {
    const distKm = (route.distance / 1000).toFixed(2);
    const durationMin = Math.round(route.duration / 60);
    const date = new Date(route.createdAt).toLocaleDateString('pt-BR');
    
    return `
      <div class="route-card" data-id="${route.id}">
        <div class="route-card-header">
          <h3 class="route-card-title">${route.name}</h3>
          <button class="btn-delete-route" data-id="${route.id}">🗑️</button>
        </div>
        ${route.description ? `<p class="route-card-description">${route.description}</p>` : ''}
        <div class="route-card-stats">
          <span>📏 ${distKm} km</span>
          <span>⏱️ ${durationMin} min</span>
          <span>📅 ${date}</span>
        </div>
        <button class="btn btn-primary btn-open-route" data-id="${route.id}">
          Abrir Rota
        </button>
      </div>
    `;
  }).join('');
  
  // Event listeners para botões
  container.querySelectorAll('.btn-open-route').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const routeId = e.target.dataset.id;
      goToViewRoute(routeId);
    });
  });
  
  container.querySelectorAll('.btn-delete-route').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const routeId = e.target.dataset.id;
      await deleteRoute(routeId);
    });
  });
}

async function deleteRoute(routeId) {
  if (!confirm('Tem certeza que deseja excluir esta rota?')) {
    return;
  }
  
  try {
    await db.deleteRoute(routeId);
    console.log('✓ Rota excluída:', routeId);
    
    // Atualiza lista
    allRoutes = await loadAllRoutes();
    renderRoutesList();
    
    alert('Rota excluída com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir rota:', error);
    alert('Erro ao excluir rota');
  }
}

// ========================================
// VISUALIZAR ROTA
// ========================================

function initViewMap() {
  if (!currentRoute) return;
  
  const mapElement = document.getElementById('map-view');
  if (!mapElement) return;
  
  // Remove mapa anterior
  if (maps.view) {
    maps.view.remove();
  }
  
  // Cria novo mapa
  maps.view = L.map('map-view', {
    zoomControl: true,
    attributionControl: true
  }).setView([-23.5505, -46.6333], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(maps.view);
  
  // Carrega rota no mapa
  routeCreatorOSRM.loadRouteForViewing(currentRoute, maps.view);
  
  // Atualiza informações
  document.getElementById('view-route-name').textContent = currentRoute.name;
  document.getElementById('view-route-description').textContent = currentRoute.description || '';
  
  const distKm = (currentRoute.distance / 1000).toFixed(2);
  document.getElementById('view-distance').textContent = `${distKm} km`;
  
  const durationMin = Math.round(currentRoute.duration / 60);
  document.getElementById('view-duration').textContent = `${durationMin} min`;
}

// ========================================
// NAVEGAÇÃO GPS
// ========================================

let navigationState = {
  startTime: null,
  isOffRoute: false
};

function initNavigateMap() {
  if (!currentRoute) return;
  
  const mapElement = document.getElementById('map-navigate');
  if (!mapElement) return;
  
  // Remove mapa anterior
  if (maps.navigate) {
    maps.navigate.remove();
  }
  
  // Cria novo mapa
  maps.navigate = L.map('map-navigate', {
    zoomControl: true,
    attributionControl: true
  }).setView([-23.5505, -46.6333], 17);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(maps.navigate);
  
  // Inicia navegação
  navigationState.startTime = Date.now();
  navigationState.isOffRoute = false;
  
  gpsNavigator.startNavigation(currentRoute, maps.navigate, {
    onPositionUpdate: (data) => {
      updateNavigationUI(data);
    },
    onOffRoute: (distance) => {
      navigationState.isOffRoute = true;
      document.getElementById('nav-warning').style.display = 'block';
      document.getElementById('nav-status').textContent = `Fora da rota (${distance.toFixed(0)}m)`;
    },
    onBackOnRoute: () => {
      navigationState.isOffRoute = false;
      document.getElementById('nav-warning').style.display = 'none';
      document.getElementById('nav-status').textContent = 'Na rota';
    },
    onDestinationReached: (summary) => {
      showNavigationComplete(summary);
    }
  });
  
  document.getElementById('nav-status').textContent = 'Aguardando GPS...';
}

function updateNavigationUI(data) {
  // Status
  if (!navigationState.isOffRoute) {
    document.getElementById('nav-status').textContent = 'Na rota';
  }
  
  // Distância restante
  const distKm = (data.distanceToDestination / 1000).toFixed(2);
  document.getElementById('nav-distance-remaining').textContent = `${distKm} km`;
  
  // Velocidade
  const speed = data.speed.toFixed(1);
  document.getElementById('nav-speed').textContent = `${speed} km/h`;
  
  // Tempo decorrido
  const elapsed = Date.now() - navigationState.startTime;
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  document.getElementById('nav-time-elapsed').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function stopNavigation() {
  gpsNavigator.stopNavigation();
  goToViewRoute(currentRoute.id);
}

function showNavigationComplete(summary) {
  const dialog = document.getElementById('dialog-navigation-complete');
  dialog.style.display = 'flex';
  
  // Formata tempo
  const minutes = Math.floor(summary.duration / 60000);
  const seconds = Math.floor((summary.duration % 60000) / 1000);
  document.getElementById('summary-time').textContent = 
    `${minutes}min ${seconds}s`;
  
  // Formata distância
  const distKm = (summary.distance / 1000).toFixed(2);
  document.getElementById('summary-distance').textContent = `${distKm} km`;
}

function closeNavigationComplete() {
  document.getElementById('dialog-navigation-complete').style.display = 'none';
  goHome();
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
  // Home
  document.getElementById('btn-create-route')?.addEventListener('click', goToCreate);
  document.getElementById('btn-my-routes')?.addEventListener('click', goToRoutesList);
  
  // Create
  document.getElementById('btn-back-create')?.addEventListener('click', goHome);
  document.getElementById('btn-clear-route')?.addEventListener('click', clearRoute);
  document.getElementById('btn-save-route')?.addEventListener('click', openSaveDialog);
  
  // Save dialog
  document.getElementById('btn-cancel-save')?.addEventListener('click', closeSaveDialog);
  document.getElementById('btn-confirm-save')?.addEventListener('click', confirmSaveRoute);
  
  // Routes list
  document.getElementById('btn-back-list')?.addEventListener('click', goHome);
  document.getElementById('btn-create-first-route')?.addEventListener('click', goToCreate);
  
  // View route
  document.getElementById('btn-back-view')?.addEventListener('click', goToRoutesList);
  document.getElementById('btn-navigate-route')?.addEventListener('click', goToNavigate);
  
  // Navigate
  document.getElementById('btn-stop-navigation')?.addEventListener('click', stopNavigation);
  document.getElementById('btn-close-summary')?.addEventListener('click', closeNavigationComplete);
}

// ========================================
// UTILIDADES
// ========================================

function generateId() {
  return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
