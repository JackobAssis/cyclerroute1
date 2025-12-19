/**
 * Route Creator com OSRM
 * Cria rotas reais usando Leaflet Routing Machine e OSRM
 */

let map = null;
let routingControl = null;
let waypoints = [];
let routeData = null;
let callbacks = {
  onRouteCalculated: null,
  onWaypointAdded: null,
  onRouteCleared: null
};

/**
 * Inicializa o criador de rotas
 * @param {L.Map} mapInstance - Instância do mapa Leaflet
 */
export function initRouteCreator(mapInstance) {
  map = mapInstance;
  waypoints = [];
  routeData = null;
  
  // Remove controle anterior se existir
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
  
  // Adiciona listener de clique no mapa
  map.on('click', handleMapClick);
}

/**
 * Registra callbacks
 * @param {Object} cbs - Objeto com callbacks
 */
export function setCallbacks(cbs) {
  callbacks = { ...callbacks, ...cbs };
}

/**
 * Handler de clique no mapa
 * @param {Object} e - Evento de clique
 */
function handleMapClick(e) {
  const { lat, lng } = e.latlng;
  addWaypoint(lat, lng);
}

/**
 * Adiciona um waypoint
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
export function addWaypoint(lat, lng) {
  waypoints.push(L.latLng(lat, lng));
  
  // Callback
  if (callbacks.onWaypointAdded) {
    callbacks.onWaypointAdded(waypoints.length);
  }
  
  // Se tiver pelo menos 2 pontos, calcular rota
  if (waypoints.length >= 2) {
    calculateRoute();
  } else {
    // Apenas adiciona marcador no primeiro ponto
    if (!routingControl) {
      addSingleMarker(lat, lng);
    }
  }
}

/**
 * Adiciona marcador único (quando só tem 1 ponto)
 */
function addSingleMarker(lat, lng) {
  if (map.singleMarker) {
    map.removeLayer(map.singleMarker);
  }
  
  map.singleMarker = L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  }).addTo(map);
  
  map.singleMarker.bindPopup('Ponto inicial - clique para adicionar destino').openPopup();
}

/**
 * Calcula a rota usando OSRM
 */
function calculateRoute() {
  // Remove marcador único se existir
  if (map.singleMarker) {
    map.removeLayer(map.singleMarker);
    map.singleMarker = null;
  }
  
  // Remove controle anterior
  if (routingControl) {
    map.removeControl(routingControl);
  }
  
  // Cria novo controle de rota
  routingControl = L.Routing.control({
    waypoints: waypoints,
    router: L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      profile: 'bike' // Preferência para bicicletas
    }),
    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    showAlternatives: false,
    lineOptions: {
      styles: [
        { color: '#32FF7E', opacity: 0.8, weight: 6 }
      ],
      extendToWaypoints: true,
      missingRouteTolerance: 0
    },
    createMarker: function(i, waypoint, n) {
      let iconUrl;
      if (i === 0) {
        // Marcador inicial (verde)
        iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
      } else if (i === n - 1) {
        // Marcador final (vermelho)
        iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
      } else {
        // Waypoints intermediários (azul)
        iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
      }
      
      return L.marker(waypoint.latLng, {
        draggable: false,
        icon: L.icon({
          iconUrl: iconUrl,
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      });
    },
    // Oculta o painel de instruções
    show: false,
    collapsible: false,
    containerClassName: 'leaflet-routing-container-hidden'
  }).addTo(map);
  
  // Listener quando a rota é calculada
  routingControl.on('routesfound', function(e) {
    const routes = e.routes;
    const route = routes[0];
    
    routeData = {
      distance: route.summary.totalDistance, // metros
      duration: route.summary.totalTime, // segundos
      coordinates: route.coordinates,
      waypoints: waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }))
    };
    
    // Callback
    if (callbacks.onRouteCalculated) {
      callbacks.onRouteCalculated(routeData);
    }
  });
  
  // Listener de erro
  routingControl.on('routingerror', function(e) {
    console.error('Erro ao calcular rota:', e);
    alert('Erro ao calcular rota. Tente pontos diferentes.');
  });
}

/**
 * Limpa a rota atual
 */
export function clearRoute() {
  waypoints = [];
  routeData = null;
  
  // Remove marcador único
  if (map && map.singleMarker) {
    map.removeLayer(map.singleMarker);
    map.singleMarker = null;
  }
  
  // Remove controle de rota
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
  
  // Callback
  if (callbacks.onRouteCleared) {
    callbacks.onRouteCleared();
  }
}

/**
 * Obtém os dados da rota atual
 * @returns {Object|null}
 */
export function getRouteData() {
  return routeData;
}

/**
 * Obtém os waypoints
 * @returns {Array}
 */
export function getWaypoints() {
  return waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }));
}

/**
 * Destroi o criador de rotas
 */
export function destroy() {
  if (map) {
    map.off('click', handleMapClick);
  }
  clearRoute();
  map = null;
}

/**
 * Carrega uma rota existente no mapa (modo visualização)
 * @param {Object} route - Dados da rota
 * @param {L.Map} mapInstance - Instância do mapa
 */
export function loadRouteForViewing(route, mapInstance) {
  map = mapInstance;
  
  // Remove controle anterior
  if (routingControl) {
    map.removeControl(routingControl);
  }
  
  // Converte waypoints
  const waypointsLatLng = route.waypoints.map(wp => L.latLng(wp.lat, wp.lng));
  
  // Cria controle de rota (sem permitir edição)
  routingControl = L.Routing.control({
    waypoints: waypointsLatLng,
    router: L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      profile: 'bike'
    }),
    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    showAlternatives: false,
    lineOptions: {
      styles: [
        { color: '#32FF7E', opacity: 0.8, weight: 6 }
      ]
    },
    createMarker: function(i, waypoint, n) {
      let iconUrl;
      if (i === 0) {
        iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
      } else if (i === n - 1) {
        iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
      } else {
        iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
      }
      
      return L.marker(waypoint.latLng, {
        draggable: false,
        icon: L.icon({
          iconUrl: iconUrl,
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      });
    },
    show: false,
    containerClassName: 'leaflet-routing-container-hidden'
  }).addTo(map);
}
