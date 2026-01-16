// API Service para Honeycomb Omnidots
// Usa Netlify Functions como proxy para evitar CORS

const HoneycombAPI = {
  // Detectar si estamos en localhost o en Netlify
  getBaseUrl: () => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://honeycomb.omnidots.com/api/v1');
    }
    return '/.netlify/functions/api';
  },

  // Autenticar usuario
  authenticate: async (username, password) => {
    try {
      const baseUrl = HoneycombAPI.getBaseUrl();
      let response;

      if (baseUrl.includes('allorigins')) {
        response = await fetch('https://honeycomb.omnidots.com/api/v1/user/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
      } else {
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
        const apiUrl = `https://honeycomb.omnidots.com/api/v1/${endpoint}?${queryParams}`;
        url = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(apiUrl);
      } else {
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

  // Obtener registros PPV - últimas 24 horas
  getPeakRecords: async (measuringPointId, limit = 20) => {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (24 * 60 * 60); // 24 horas atrás
    
    const result = await HoneycombAPI.request('get_peak_records', {
      measuring_point_id: measuringPointId,
      start_time: startTime,
      end_time: endTime,
      limit: limit
    });
    
    // Normalizar respuesta: la API devuelve "samples", convertimos a "records"
    if (result.ok) {
      result.records = result.samples || result.records || [];
    }
    
    return result;
  },

  // Obtener registros PPV con rango de tiempo personalizado
  getPeakRecordsRange: async (measuringPointId, startDate, endDate, limit = 100) => {
    const startTime = Math.floor(startDate.getTime() / 1000);
    const endTime = Math.floor(endDate.getTime() / 1000);
    
    const result = await HoneycombAPI.request('get_peak_records', {
      measuring_point_id: measuringPointId,
      start_time: startTime,
      end_time: endTime,
      limit: limit
    });
    
    if (result.ok) {
      result.records = result.samples || result.records || [];
    }
    
    return result;
  },

  // Obtener registros VDV
  getVDVRecords: async (measuringPointId, limit = 20) => {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (24 * 60 * 60);
    
    const result = await HoneycombAPI.request('get_vdv_records', {
      measuring_point_id: measuringPointId,
      start_time: startTime,
      end_time: endTime,
      limit: limit
    });
    
    if (result.ok) {
      result.records = result.samples || result.records || [];
    }
    
    return result;
  },

  // Obtener último PPV de un punto
  getLatestPPV: async (measuringPointId) => {
    const result = await HoneycombAPI.getPeakRecords(measuringPointId, 1);
    
    console.log('getLatestPPV result:', result);
    
    if (result.ok && result.records && result.records.length > 0) {
      return { ok: true, record: result.records[0] };
    }
    
    return { ok: false };
  },

  // Parsear datos triaxiales
  parseTriaxialData: (records) => {
    if (!Array.isArray(records)) return [];
    
    return records.map(record => {
      // Parsear timestamp
      let dateStr = 'Sin fecha';
      let timeStr = 'Sin hora';
      
      if (record.timestamp) {
        let ts = record.timestamp;
        if (ts < 10000000000) ts = ts * 1000;
        
        const date = new Date(ts);
        dateStr = date.toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        timeStr = date.toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
      
      // Obtener valores PPV
      const ppv_x = parseFloat(record.ppv_x) || 0;
      const ppv_y = parseFloat(record.ppv_y) || 0;
      const ppv_z = parseFloat(record.ppv_z) || 0;
      
      // Calcular máximo y eje dominante
      const ppv_max = Math.max(ppv_x, ppv_y, ppv_z);
      let max_axis = 'Z';
      if (ppv_x >= ppv_y && ppv_x >= ppv_z) max_axis = 'X';
      else if (ppv_y >= ppv_x && ppv_y >= ppv_z) max_axis = 'Y';
      
      // Frecuencias
      const freq_x = parseFloat(record.frequency_x) || parseFloat(record.freq_x) || 0;
      const freq_y = parseFloat(record.frequency_y) || parseFloat(record.freq_y) || 0;
      const freq_z = parseFloat(record.frequency_z) || parseFloat(record.freq_z) || 0;
      
      // Frecuencia dominante
      let dominant_freq = freq_z;
      if (max_axis === 'X') dominant_freq = freq_x;
      else if (max_axis === 'Y') dominant_freq = freq_y;
      
      return {
        id: record.id,
        timestamp: record.timestamp,
        date: dateStr,
        time: timeStr,
        ppv_x,
        ppv_y,
        ppv_z,
        freq_x,
        freq_y,
        freq_z,
        ppv_max,
        max_axis,
        dominant_freq: Math.round(dominant_freq)
      };
    });
  }
};

// Exportar para usar en app.js
window.HoneycombAPI = HoneycombAPI;
