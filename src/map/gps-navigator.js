/**
 * GPS Navigator
 * Sistema de navegação em tempo real com GPS
 */

let map = null;
let route = null;
let watchId = null;
let userMarker = null;
let routeLine = null;
let isNavigating = false;
let startTime = null;
let distanceTraveled = 0;
let lastPosition = null;

const OFF_ROUTE_THRESHOLD = 50; // metros

let callbacks = {
  onPositionUpdate: null,
  onOffRoute: null,
  onBackOnRoute: null,
  onDestinationReached: null,
  onNavigationEnd: null
};

/**
 * Inicia a navegação
 * @param {Object} routeData - Dados da rota
 * @param {L.Map} mapInstance - Instância do mapa
 * @param {Object} cbs - Callbacks
 */
export function startNavigation(routeData, mapInstance, cbs = {}) {
  if (isNavigating) {
    console.warn('Navegação já está ativa');
    return;
  }
  
  map = mapInstance;
  route = routeData;
  callbacks = { ...callbacks, ...cbs };
  isNavigating = true;
  startTime = Date.now();
  distanceTraveled = 0;
  lastPosition = null;
  
  // Desenha a rota no mapa
  drawRoute();
  
  // Inicia o GPS
  startGPSTracking();
}

/**
 * Para a navegação
 */
export function stopNavigation() {
  if (!isNavigating) return;
  
  isNavigating = false;
  
  // Para o GPS
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  
  // Remove elementos do mapa
  if (userMarker) {
    map.removeLayer(userMarker);
    userMarker = null;
  }
  
  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }
  
  // Callback
  if (callbacks.onNavigationEnd) {
    const elapsed = Date.now() - startTime;
    callbacks.onNavigationEnd({
      duration: elapsed,
      distance: distanceTraveled
    });
  }
  
  // Reset
  map = null;
  route = null;
  startTime = null;
  distanceTraveled = 0;
  lastPosition = null;
}

/**
 * Desenha a rota no mapa
 */
function drawRoute() {
  if (!route || !route.waypoints) return;
  
  // Remove linha anterior
  if (routeLine) {
    map.removeLayer(routeLine);
  }
  
  // Desenha linha da rota
  const latlngs = route.waypoints.map(wp => [wp.lat, wp.lng]);
  
  routeLine = L.polyline(latlngs, {
    color: '#32FF7E',
    weight: 6,
    opacity: 0.7
  }).addTo(map);
  
  // Adiciona marcadores de início e fim
  const start = route.waypoints[0];
  const end = route.waypoints[route.waypoints.length - 1];
  
  L.marker([start.lat, start.lng], {
    icon: L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      shadowSize: [41, 41]
    })
  }).addTo(map).bindPopup('Início');
  
  L.marker([end.lat, end.lng], {
    icon: L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      shadowSize: [41, 41]
    })
  }).addTo(map).bindPopup('Destino');
  
  // Ajusta visualização
  map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
}

/**
 * Inicia o rastreamento GPS
 */
function startGPSTracking() {
  if (!navigator.geolocation) {
    alert('GPS não disponível neste dispositivo');
    stopNavigation();
    return;
  }
  
  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };
  
  watchId = navigator.geolocation.watchPosition(
    handlePositionUpdate,
    handlePositionError,
    options
  );
}

/**
 * Handler de atualização de posição
 * @param {Position} position - Posição do GPS
 */
function handlePositionUpdate(position) {
  if (!isNavigating) return;
  
  const { latitude, longitude, speed, accuracy } = position.coords;
  const currentPos = { lat: latitude, lng: longitude };
  
  // Calcula distância percorrida
  if (lastPosition) {
    const dist = calculateDistance(lastPosition, currentPos);
    distanceTraveled += dist;
  }
  lastPosition = currentPos;
  
  // Atualiza marcador do usuário
  updateUserMarker(currentPos);
  
  // Centraliza mapa no usuário
  map.setView([latitude, longitude], 17);
  
  // Calcula distância até o destino
  const destination = route.waypoints[route.waypoints.length - 1];
  const distanceToDestination = calculateDistance(currentPos, destination);
  
  // Verifica se chegou ao destino (dentro de 20 metros)
  if (distanceToDestination < 20) {
    handleDestinationReached();
    return;
  }
  
  // Verifica se está fora da rota
  const distanceToRoute = calculateDistanceToRoute(currentPos);
  const isOffRoute = distanceToRoute > OFF_ROUTE_THRESHOLD;
  
  // Calcula velocidade (km/h)
  const speedKmh = speed ? speed * 3.6 : 0;
  
  // Callback com dados da posição
  if (callbacks.onPositionUpdate) {
    callbacks.onPositionUpdate({
      position: currentPos,
      speed: speedKmh,
      distanceToDestination: distanceToDestination,
      distanceTraveled: distanceTraveled,
      isOffRoute: isOffRoute,
      accuracy: accuracy
    });
  }
  
  // Notifica se saiu da rota
  if (isOffRoute && callbacks.onOffRoute) {
    callbacks.onOffRoute(distanceToRoute);
  } else if (!isOffRoute && callbacks.onBackOnRoute) {
    callbacks.onBackOnRoute();
  }
}

/**
 * Handler de erro de posição
 * @param {PositionError} error - Erro
 */
function handlePositionError(error) {
  console.error('Erro GPS:', error);
  let message = 'Erro ao obter localização';
  
  switch (error.code) {
    case error.PERMISSION_DENIED:
      message = 'Permissão de localização negada';
      break;
    case error.POSITION_UNAVAILABLE:
      message = 'Localização indisponível';
      break;
    case error.TIMEOUT:
      message = 'Tempo esgotado ao obter localização';
      break;
  }
  
  alert(message);
}

/**
 * Atualiza o marcador do usuário no mapa
 * @param {Object} position - {lat, lng}
 */
function updateUserMarker(position) {
  if (userMarker) {
    userMarker.setLatLng([position.lat, position.lng]);
  } else {
    // Cria marcador do usuário (círculo azul pulsante)
    userMarker = L.circleMarker([position.lat, position.lng], {
      color: '#4A90E2',
      fillColor: '#4A90E2',
      fillOpacity: 0.8,
      radius: 10,
      weight: 3
    }).addTo(map);
    
    // Adiciona popup
    userMarker.bindPopup('Você está aqui');
  }
}

/**
 * Calcula distância entre dois pontos (metros)
 * @param {Object} pos1 - {lat, lng}
 * @param {Object} pos2 - {lat, lng}
 * @returns {number}
 */
function calculateDistance(pos1, pos2) {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = pos1.lat * Math.PI / 180;
  const φ2 = pos2.lat * Math.PI / 180;
  const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
  const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calcula a distância mínima até a rota
 * @param {Object} position - {lat, lng}
 * @returns {number} - Distância em metros
 */
function calculateDistanceToRoute(position) {
  if (!route || !route.waypoints || route.waypoints.length < 2) {
    return 0;
  }
  
  let minDistance = Infinity;
  
  // Verifica distância para cada segmento da rota
  for (let i = 0; i < route.waypoints.length - 1; i++) {
    const p1 = route.waypoints[i];
    const p2 = route.waypoints[i + 1];
    const dist = distanceToSegment(position, p1, p2);
    minDistance = Math.min(minDistance, dist);
  }
  
  return minDistance;
}

/**
 * Calcula distância de um ponto a um segmento de linha
 * @param {Object} point - {lat, lng}
 * @param {Object} lineStart - {lat, lng}
 * @param {Object} lineEnd - {lat, lng}
 * @returns {number}
 */
function distanceToSegment(point, lineStart, lineEnd) {
  const x = point.lat;
  const y = point.lng;
  const x1 = lineStart.lat;
  const y1 = lineStart.lng;
  const x2 = lineEnd.lat;
  const y2 = lineEnd.lng;
  
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }
  
  let xx, yy;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  return calculateDistance(point, { lat: xx, lng: yy });
}

/**
 * Handler quando chega ao destino
 */
function handleDestinationReached() {
  const elapsed = Date.now() - startTime;
  
  if (callbacks.onDestinationReached) {
    callbacks.onDestinationReached({
      duration: elapsed,
      distance: distanceTraveled
    });
  }
  
  stopNavigation();
}

/**
 * Obtém estado da navegação
 * @returns {boolean}
 */
export function isActivelyNavigating() {
  return isNavigating;
}

/**
 * Obtém dados do progresso atual
 * @returns {Object}
 */
export function getProgress() {
  return {
    isNavigating,
    distanceTraveled,
    elapsedTime: startTime ? Date.now() - startTime : 0,
    lastPosition
  };
}
