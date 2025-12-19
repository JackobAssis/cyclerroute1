/**
 * IndexedDB Manager
 * Gerencia todas as operações de banco de dados do CyclerRoute
 * Estrutura: { id, name, description, waypoints, distance, duration, createdAt }
 */

const DB_NAME = 'CyclerRouteDB';
const DB_VERSION = 1;
const STORE_NAME = 'routes';

let db = null;

/**
 * Abre ou cria o banco de dados
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Erro ao abrir banco de dados'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('distance', 'distance', { unique: false });
      }
    };
  });
}

/**
 * Lê um registro do banco
 * @param {string} id - ID da rota
 * @returns {Promise<Object>}
 */
export function readRoute(id) {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await openDB();
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => {
        reject(new Error('Erro ao ler rota'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Escreve/cria um novo registro
 * @param {Object} route - Dados da rota
 * @returns {Promise<string>} ID da rota criada
 */
export function writeRoute(route) {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await openDB();
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(route);

      request.onerror = () => {
        reject(new Error('Erro ao escrever rota'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Atualiza um registro existente
 * @param {Object} route - Dados da rota com ID
 * @returns {Promise<string>} ID da rota atualizada
 */
export function updateRoute(route) {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await openDB();
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(route);

      request.onerror = () => {
        reject(new Error('Erro ao atualizar rota'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Deleta um registro
 * @param {string} id - ID da rota
 * @returns {Promise<void>}
 */
export function deleteRoute(id) {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await openDB();
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error('Erro ao deletar rota'));
      };

      request.onsuccess = () => {
        resolve();
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Lê todos os registros
 * @returns {Promise<Array>}
 */
export function readAllRoutes() {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await openDB();
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error('Erro ao ler rotas'));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Limpa todo o banco de dados
 * @returns {Promise<void>}
 */
export function clearAllRoutes() {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await openDB();
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error('Erro ao limpar rotas'));
      };

      request.onsuccess = () => {
        resolve();
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Exporta todas as rotas como JSON
 * @returns {Promise<string>}
 */
export async function exportAllRoutesAsJSON() {
  try {
    const routes = await readAllRoutes();
    return JSON.stringify(routes, null, 2);
  } catch (error) {
    throw new Error('Erro ao exportar rotas: ' + error.message);
  }
}

/**
 * Importa rotas de um JSON
 * @param {string} jsonString - String JSON com rotas
 * @returns {Promise<number>} Quantidade de rotas importadas
 */
export async function importRoutesFromJSON(jsonString) {
  try {
    const routes = JSON.parse(jsonString);
    
    if (!Array.isArray(routes)) {
      throw new Error('JSON inválido: esperado um array de rotas');
    }

    let imported = 0;
    
    for (const route of routes) {
      // Validação básica
      if (!route.name || !Array.isArray(route.points)) {
        continue;
      }

      // Gera novo ID para evitar conflitos
      const newRoute = {
        ...route,
        id: Date.now() + Math.random(),
        createdAt: new Date().toISOString()
      };

      await writeRoute(newRoute);
      imported++;
    }

    return imported;
  } catch (error) {
    throw new Error('Erro ao importar rotas: ' + error.message);
  }
}
