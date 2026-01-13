// API Service para Honeycomb Omnidots
// Usa Netlify Functions como proxy para evitar CORS

const HoneycombAPI = {
  // Detectar si estamos en localhost o en Netlify
  getBaseUrl: () => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      // En desarrollo local, usar proxy de allorigins (limitado)
      return 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://honeycomb.omnidots.com/api/v1');
    }
    // En Netlify, usar nuestra función proxy
    return '/.netlify/functions/api';
  },

  // Autenticar usuario
  authenticate: async (username, password) => {
    try {
      const baseUrl = HoneycombAPI.getBaseUrl();
      let response;

      if (baseUrl.includes('allorigins')) {
        // Método directo (puede fallar por CORS)
        response = await fetch('https://honeycomb.omnidots.com/api/v1/user/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
      } else {
        // Usar proxy de Netlify
        response = await fetch(`${baseUrl}?endpoint=user/authenticate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
      }
      
      const data = await response.json();
      
      if (data.ok && data.token) {
        localStorage.setItem('honeycomb_token', data.token);
        localStorage.setItem('honeycomb_token_date', new Date().toISOString());
        localStorage.setItem('honeycomb_username', username);
      }
      
      return data;
    } catch (error) {
      console.error('Error autenticación:', error);
      return { ok: false, message: 'Error de conexión. Verifica tu conexión a internet.' };
    }
  },

  // Obtener token guardado
  getStoredToken: () => {
    return localStorage.getItem('honeycomb_token');
  },

  // Obtener username guardado
  getStoredUsername: () => {
    return localStorage.getItem('honeycomb_username');
  },

  // Verificar si token es válido (menos de 14 días)
  isTokenValid: () => {
    const token = localStorage.getItem('honeycomb_token');
    const tokenDate = localStorage.getItem('honeycomb_token_date');
    
    if (!token || !tokenDate) return false;
    
    const daysSinceToken = (new Date() - new Date(tokenDate)) / (1000 * 60 * 60 * 24);
    return daysSinceToken < 14;
  },

  // Cerrar sesión
  logout: () => {
    localStorage.removeItem('honeycomb_token');
    localStorage.removeItem('honeycomb_token_date');
    localStorage.removeItem('honeycomb_username');
  },

  // Hacer petición genérica a la API
  request: async (endpoint, params = {}) => {
    try {
      const baseUrl = HoneycombAPI.getBaseUrl();
      const token = HoneycombAPI.getStoredToken();
      
      if (!token) {
        return { ok: false, message: 'No hay token de autenticación' };
      }

      // Construir URL con parámetros
      const queryParams = new URLSearchParams({ token, ...params });
      
      let url;
      if (baseUrl.includes('allorigins')) {
        // Para allorigins (desarrollo)
        const apiUrl = `https://honeycomb.omnidots.com/api/v1/${endpoint}?${queryParams}`;
        url = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(apiUrl);
      } else {
        // Para Netlify Functions
        url = `${baseUrl}?endpoint=${endpoint}&${queryParams}`;
      }

      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      return { ok: false, message: 'Error de conexión' };
    }
  },

  // Obtener puntos de medición
  getMeasuringPoints: async () => {
    return await HoneycombAPI.request('list_measuring_points');
  },

  // Obtener sensores
  getSensors: async () => {
    return await HoneycombAPI.request('list_sensors');
  },

  // Obtener registros PPV
  getPeakRecords: async (measuringPointId, limit = 20) => {
    return await HoneycombAPI.request('get_peak_records', {
      measuring_point_id: measuringPointId,
      limit: limit
    });
  },

  // Obtener registros VDV
  getVDVRecords: async (measuringPointId, limit = 20) => {
    return await HoneycombAPI.request('get_vdv_records', {
      measuring_point_id: measuringPointId,
      limit: limit
    });
  },

  // Obtener último PPV de un punto
  getLatestPPV: async (measuringPointId) => {
    const result = await HoneycombAPI.getPeakRecords(measuringPointId, 1);
    
    if (result.ok && result.records && result.records.length > 0) {
      return { ok: true, record: result.records[0] };
    }
    
    return { ok: false };
  },

  // Parsear datos triaxiales
  parseTriaxialData: (records) => {
    if (!Array.isArray(records)) return [];
    
    return records.map(record => ({
      id: record.id,
      timestamp: record.timestamp,
      time: new Date(record.timestamp).toLocaleTimeString('es-CL'),
      date: new Date(record.timestamp).toLocaleDateString('es-CL'),
      ppv_x: record.ppv_x || 0,
      ppv_y: record.ppv_y || 0,
      ppv_z: record.ppv_z || 0,
      freq_x: record.frequency_x || 0,
      freq_y: record.frequency_y || 0,
      freq_z: record.frequency_z || 0,
      ppv_max: Math.max(record.ppv_x || 0, record.ppv_y || 0, record.ppv_z || 0),
      max_axis: record.max_axis || 'Z',
      dominant_freq: record.dominant_frequency || 0
    }));
  }
};

// Exportar para usar en app.js
window.HoneycombAPI = HoneycombAPI;
