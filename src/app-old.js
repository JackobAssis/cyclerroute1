/**
 * CyclerRoute - PWA para Ciclistas
 * Arquivo principal que inicializa e gerencia todo o app
 */

import * as router from './router.js';
import * as ui from './ui.js';
import * as routeStore from './storage/route-store.js';
import * as mapInit from './map/map-init.js';
import * as routeCreator from './map/route-creator.js';
import * as routeLoader from './map/route-loader.js';
import { formatDistance } from './utils/distance.js';

// ========================================
// ESTADO GLOBAL
// ========================================

let currentRouteId = null;
let deferredPrompt = null;
let isOnline = navigator.onLine;

// ========================================
// INICIALIZAÇÃO
// ========================================

window.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
  console.log('🚴 CyclerRoute iniciando...');

  // Cria splash screen
  window.SplashScreen.create();
  window.SplashScreen.updateStatus('Inicializando...');

  try {
    console.log('[App] 1/5 - Iniciando PWA setup...');
    // Detecta instalação PWA
    setupPWA();
    window.SplashScreen.updateStatus('Preparando interface...');

    console.log('[App] 2/5 - Iniciando conectividade...');
    // Detecta mudanças de conectividade
    setupConnectivity();

    console.log('[App] 3/5 - Configurando UI event listeners...');
    // Mapeia eventos de UI
    setupUIEventListeners();
    window.SplashScreen.updateStatus('Carregando dados...');

    console.log('[App] 4/5 - Inicializando database...');
    // Inicializa DB
    await routeStore.getRoutes();

    console.log('[App] 5/5 - Initialization complete!');
    console.log('✓ CyclerRoute inicializado com sucesso');
    
    // Esconde splash com delay elegante
    await new Promise(resolve => setTimeout(resolve, 400));
    window.SplashScreen.hide();

    // Debug: Log o estado do app
    setTimeout(() => {
      console.log('📋 Estado do App:');
      console.log('- Router disponível:', typeof router);
      console.log('- UI disponível:', typeof ui);
      console.log('- RouteStore disponível:', typeof routeStore);
      console.log('- MapInit disponível:', typeof mapInit);
      console.log('- Home screen:', document.getElementById('screen-home')?.className);
      console.log('- Botões encontrados:');
      console.log('  - btn-create-route:', !!document.getElementById('btn-create-route'));
      console.log('  - btn-my-routes:', !!document.getElementById('btn-my-routes'));
      console.log('  - btn-import-route:', !!document.getElementById('btn-import-route'));
    }, 500);

  } catch (error) {
    console.error('❌ Erro ao inicializar app:', error);
    console.error('Stack:', error.stack);
    window.SplashScreen.updateStatus('Erro ao carregar');
    ui.showToast('Erro ao inicializar app', 'error');
    await new Promise(resolve => setTimeout(resolve, 1000));
    window.SplashScreen.hide();
  }
}

// ========================================
// PWA SETUP
// ========================================

function setupPWA() {
  // Detecta prompt de instalação
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    ui.setInstallButtonVisible(true);
  });

  // App foi instalada
  window.addEventListener('appinstalled', () => {
    console.log('✓ App instalado');
    deferredPrompt = null;
    ui.setInstallButtonVisible(false);
  });

  // Display mode changed
  window.matchMedia('(display-mode: standalone)').addListener(() => {
    console.log('Display mode mudou');
  });
}

// ========================================
// CONECTIVIDADE
// ========================================

function setupConnectivity() {
  window.addEventListener('online', () => {
    isOnline = true;
    ui.showToast('Conectado à internet', 'success', 2000);
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    ui.showToast('Desconectado da internet', 'warning', 2000);
  });
}

// ========================================
// EVENT LISTENERS - UI
// ========================================

function setupUIEventListeners() {
  console.log('[App] Configurando event listeners...');

  // Home Screen
  const btnCreateRoute = document.getElementById('btn-create-route');
  if (btnCreateRoute) {
    btnCreateRoute.addEventListener('click', () => {
      console.log('[App] Click em "Criar Rota"');
      router.goToCreateRoute();
      initCreateRouteScreen();
    });
    console.log('✓ btn-create-route listener OK');
  } else {
    console.error('❌ btn-create-route não encontrado!');
  }

  const btnMyRoutes = document.getElementById('btn-my-routes');
  if (btnMyRoutes) {
    btnMyRoutes.addEventListener('click', () => {
      console.log('[App] Click em "Minhas Rotas"');
      router.goToRoutesList();
      initRoutesListScreen();
    });
    console.log('✓ btn-my-routes listener OK');
  } else {
    console.error('❌ btn-my-routes não encontrado!');
  }

  const btnImportRoute = document.getElementById('btn-import-route');
  if (btnImportRoute) {
    btnImportRoute.addEventListener('click', handleImportRoute);
    console.log('✓ btn-import-route listener OK');
  } else {
    console.error('❌ btn-import-route não encontrado!');
  }

  // Create Route Screen
  const btnBackCreate = document.getElementById('btn-back-create');
  if (btnBackCreate) {
    btnBackCreate.addEventListener('click', () => {
      console.log('[App] Click em "Voltar" (Create)');
      routeCreator.resetRoute();
      mapInit.destroyMap();
      router.goBack();
    });
    console.log('✓ btn-back-create listener OK');
  }

  const btnUndoPoint = document.getElementById('btn-undo-point');
  if (btnUndoPoint) {
    btnUndoPoint.addEventListener('click', () => {
      console.log('[App] Click em "Desfazer"');
      routeCreator.removeLastPoint();
    });
    console.log('✓ btn-undo-point listener OK');
  }

  const btnFinishRoute = document.getElementById('btn-finish-route');
  if (btnFinishRoute) {
    btnFinishRoute.addEventListener('click', () => {
      console.log('[App] Click em "Salvar Rota"');
      if (routeCreator.isRouteValid()) {
        ui.showModal('dialog-save-route');
        ui.focusElement('input-route-name');
      } else {
        ui.showToast('Adicione pelo menos 2 pontos', 'warning');
      }
    });
    console.log('✓ btn-finish-route listener OK');
  }

  // Save Route Dialog
  const btnCancelSave = document.getElementById('btn-cancel-save');
  if (btnCancelSave) {
    btnCancelSave.addEventListener('click', () => {
      console.log('[App] Click em "Cancelar"');
      ui.hideModal('dialog-save-route');
    });
    console.log('✓ btn-cancel-save listener OK');
  }

  const btnConfirmSave = document.getElementById('btn-confirm-save');
  if (btnConfirmSave) {
    btnConfirmSave.addEventListener('click', handleSaveRoute);
    console.log('✓ btn-confirm-save listener OK');
  }

  // Allow Enter key to save
  const inputRouteName = document.getElementById('input-route-name');
  if (inputRouteName) {
    inputRouteName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSaveRoute();
      }
    });
    console.log('✓ input-route-name listener OK');
  }

  // Routes List Screen
  const btnBackList = document.getElementById('btn-back-list');
  if (btnBackList) {
    btnBackList.addEventListener('click', () => {
      console.log('[App] Click em "Voltar" (List)');
      router.goBack();
    });
    console.log('✓ btn-back-list listener OK');
  }

  // View Route Screen
  const btnBackView = document.getElementById('btn-back-view');
  if (btnBackView) {
    btnBackView.addEventListener('click', () => {
      console.log('[App] Click em "Voltar" (View)');
      routeLoader.clearDisplay();
      mapInit.destroyMap();
      router.goBack();
    });
    console.log('✓ btn-back-view listener OK');
  }

  const btnNavigateRoute = document.getElementById('btn-navigate-route');
  if (btnNavigateRoute) {
    btnNavigateRoute.addEventListener('click', handleStartNavigation);
    console.log('✓ btn-navigate-route listener OK');
  }

  const btnExportRoute = document.getElementById('btn-export-route');
  if (btnExportRoute) {
    btnExportRoute.addEventListener('click', handleExportRoute);
    console.log('✓ btn-export-route listener OK');
  }

  const btnDeleteRoute = document.getElementById('btn-delete-route');
  if (btnDeleteRoute) {
    btnDeleteRoute.addEventListener('click', handleDeleteRoute);
    console.log('✓ btn-delete-route listener OK');
  }

  // Navigate Screen
  const btnStopNavigate = document.getElementById('btn-stop-navigate');
  if (btnStopNavigate) {
    btnStopNavigate.addEventListener('click', () => {
      console.log('[App] Click em "Parar"');
      routeLoader.stopNavigation();
      router.goToViewRoute();
      initViewRouteScreen();
    });
    console.log('✓ btn-stop-navigate listener OK');
  }

  // Install PWA button
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Resultado instalação: ${outcome}`);
      deferredPrompt = null;
      ui.setInstallButtonVisible(false);
    });
    console.log('✓ install-btn listener OK');
  }

  console.log('[App] ✓ Todos os event listeners configurados!');
}

// ========================================
// CREATE ROUTE SCREEN
// ========================================

function initCreateRouteScreen() {
  // Inicializa mapa
  mapInit.initMap('map', {
    center: [-23.5505, -46.6333],
    zoom: 13
  });

  // Inicializa criador de rota
  routeCreator.initRouteCreator();

  // Setup callbacks
  routeCreator.onPointsChanged((count) => {
    ui.updatePointsCount(count);
  });

  routeCreator.onDistanceChanged((distance) => {
    ui.updateDistanceDisplay(distance);
  });

  // Click no mapa para adicionar ponto
  mapInit.onMapClick((point) => {
    routeCreator.addPoint(point);
  });

  // Atualiza display
  ui.updatePointsCount(0);
  ui.updateDistanceDisplay(0);
}

// ========================================
// ROUTES LIST SCREEN
// ========================================

async function initRoutesListScreen() {
  try {
    const routes = await routeStore.getRoutes();

    ui.renderRoutesList(routes, async (routeId) => {
      // Carrega rota selecionada
      currentRouteId = routeId;
      const route = await routeStore.getRouteById(routeId);

      // Vai para visualizar
      router.goToViewRoute();
      initViewRouteScreen();
    });
  } catch (error) {
    console.error('Erro ao carregar rotas:', error);
    ui.showToast('Erro ao carregar rotas', 'error');
  }
}

// ========================================
// VIEW ROUTE SCREEN
// ========================================

async function initViewRouteScreen() {
  if (!currentRouteId) {
    router.goBack();
    return;
  }

  try {
    // Carrega rota
    const route = await routeStore.getRouteById(currentRouteId);

    // Renderiza info
    ui.renderRouteInfo(route);

    // Inicializa mapa
    mapInit.initMap('map-view', {
      center: [route.points[0].lat, route.points[0].lng],
      zoom: 13
    });

    // Carrega rota no mapa
    routeLoader.loadRoute(route);
  } catch (error) {
    console.error('Erro ao visualizar rota:', error);
    ui.showToast('Erro ao visualizar rota', 'error');
    router.goBack();
  }
}

// ========================================
// NAVIGATE ROUTE SCREEN
// ========================================

function initNavigateRouteScreen() {
  // Inicializa mapa para navegação
  const route = routeLoader.getDisplayedRoute();
  
  if (!route) {
    router.goBack();
    return;
  }

  mapInit.initMap('map-navigate', {
    center: [route.points[0].lat, route.points[0].lng],
    zoom: 15
  });

  // Carrega rota no mapa
  routeLoader.loadRoute(route);

  // Inicia navegação
  routeLoader.startNavigation({
    onProgressUpdate: (status) => {
      ui.updateNavigationStatus(status);
    },
    onPointReached: (index, point) => {
      console.log(`Chegou ao ponto ${index + 1}`);
      ui.showToast(`Ponto ${index + 1} atingido!`, 'success', 1500);
    },
    onNavigationComplete: () => {
      ui.showToast('Rota concluída!', 'success', 3000);
    },
    onSimulationMode: (enabled) => {
      if (enabled) {
        ui.showToast('Modo teste: clique no mapa para avançar', 'info', 3000);
      }
    }
  });

  // Atualiza UI inicial
  const status = routeLoader.getNavigationStatus();
  if (status) {
    ui.updateNavigationStatus(status);
  }
}

// ========================================
// HANDLERS - CREATE/SAVE ROUTE
// ========================================

async function handleSaveRoute() {
  const routeName = ui.getInputValue('input-route-name');

  if (!routeName) {
    ui.showToast('Digite um nome para a rota', 'warning');
    return;
  }

  if (!routeCreator.isRouteValid()) {
    ui.showToast('Rota inválida', 'error');
    return;
  }

  try {
    const points = routeCreator.getRoutePoints();
    await routeStore.saveRoute(routeName, points);

    ui.hideModal('dialog-save-route');
    ui.clearInput('input-route-name');
    routeCreator.resetRoute();
    mapInit.destroyMap();

    ui.showToast('✓ Rota salva com sucesso', 'success', 2000);
    router.goToRoutesList();
    initRoutesListScreen();
  } catch (error) {
    console.error('Erro ao salvar rota:', error);
    ui.showToast('Erro ao salvar rota', 'error');
  }
}

// ========================================
// HANDLERS - VIEW/NAVIGATE ROUTE
// ========================================

function handleStartNavigation() {
  router.goToNavigate();
  initNavigateRouteScreen();
}

async function handleExportRoute() {
  if (!currentRouteId) return;

  try {
    const json = await routeStore.exportRoute(currentRouteId);
    const route = await routeStore.getRouteById(currentRouteId);
    const filename = `rota-${route.name}-${Date.now()}.json`;

    ui.downloadFile(json, filename, 'application/json');
    ui.showToast('✓ Rota exportada', 'success', 2000);
  } catch (error) {
    console.error('Erro ao exportar:', error);
    ui.showToast('Erro ao exportar rota', 'error');
  }
}

function handleDeleteRoute() {
  if (!currentRouteId) return;

  ui.showConfirmDialog(
    'Deletar Rota',
    'Tem certeza que deseja deletar esta rota?',
    async () => {
      try {
        await routeStore.deleteRouteData(currentRouteId);
        ui.showToast('✓ Rota deletada', 'success', 2000);
        routeLoader.clearDisplay();
        mapInit.destroyMap();
        router.goToRoutesList();
        initRoutesListScreen();
      } catch (error) {
        console.error('Erro ao deletar:', error);
        ui.showToast('Erro ao deletar rota', 'error');
      }
    }
  );
}

// ========================================
// HANDLERS - IMPORT/EXPORT
// ========================================

async function handleImportRoute() {
  try {
    const file = await ui.openFileDialog();
    const content = await ui.readFile(file);
    const imported = await routeStore.importRoutes(content);

    ui.showToast(`✓ ${imported} rota(s) importada(s)`, 'success', 2000);
    router.goToRoutesList();
    initRoutesListScreen();
  } catch (error) {
    console.error('Erro ao importar:', error);
    ui.showToast('Erro ao importar rota: ' + error.message, 'error');
  }
}

// ========================================
// KEYBOARD SHORTCUTS
// ========================================

window.addEventListener('keydown', (e) => {
  // ESC para voltar
  if (e.key === 'Escape') {
    const currentScreen = router.getCurrentScreen();
    if (currentScreen !== 'screen-home') {
      router.goBack();
    }
  }
});

// ========================================
// RESIZE HANDLER
// ========================================

window.addEventListener('resize', () => {
  mapInit.invalidateSize();
});

// ========================================
// EXPORTS (para debug em console)
// ========================================

window.CyclerRoute = {
  router,
  ui,
  routeStore,
  mapInit,
  routeCreator,
  routeLoader,
  goHome: () => router.goHome(),
  showToast: (msg, type) => ui.showToast(msg, type),
  getStats: () => routeStore.getStatistics()
};

console.log('💡 Use window.CyclerRoute para acessar funções de debug');
