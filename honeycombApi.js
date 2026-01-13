// API Service para Honeycomb Omnidots
const API_BASE_URL = 'https://honeycomb.omnidots.com/api/v1';

const HoneycombAPI = {
  authenticate: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/authenticate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (data.ok && data.token) {
        localStorage.setItem('honeycomb_token', data.token);
        localStorage.setItem('honeycomb_token_date', new Date().toISOString());
      }
      
      return data;
    } catch (error) {
      console.error('Error de autenticación:', error);
      return { ok: false, message: 'Error de conexión. Por favor contacta a Omnidots para habilitar CORS para tu dominio.' };
    }
  },

  getStoredToken: () => {
    return localStorage.getItem('honeycomb_token');
  },

  isTokenValid: () => {
    const token = localStorage.getItem('honeycomb_token');
    const tokenDate = localStorage.getItem('honeycomb_token_date');
    
    if (!token || !tokenDate) return false;
    
    const daysSinceToken = (new Date() - new Date(tokenDate)) / (1000 * 60 * 60 * 24);
    return daysSinceToken < 14;
  },

  logout: () => {
    localStorage.removeItem('honeycomb_token');
    localStorage.removeItem('honeycomb_token_date');
  },

  getMeasuringPoints: async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/list_measuring_points?token=${token}`);
      return await response.json();
    } catch (error) {
      return { ok: false, message: 'Error al obtener puntos' };
    }
  },

  getPeakRecords: async (token, measuringPointId, limit = 20) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/get_peak_records?token=${token}&measuring_point_id=${measuringPointId}&limit=${limit}`
      );
      return await response.json();
    } catch (error) {
      return { ok: false, message: 'Error al obtener registros' };
    }
  },

  getLatestPPV: async (token, measuringPointId) => {
    try {
      const result = await HoneycombAPI.getPeakRecords(token, measuringPointId, 1);
      
      if (result.ok && result.records && result.records.length > 0) {
        return { ok: true, record: result.records[0] };
      }
      
      return { ok: false };
    } catch (error) {
      return { ok: false };
    }
  },

  parseTriaxialData: (records) => {
    if (!Array.isArray(records)) return [];
    
    return records.map(record => ({
      timestamp: record.timestamp,
      time: new Date(record.timestamp).toLocaleTimeString('es-CL'),
      date: new Date(record.timestamp).toLocaleDateString('es-CL'),
      ppv_x: record.ppv_x || 0,
      ppv_y: record.ppv_y || 0,
      ppv_z: record.ppv_z || 0,
      freq_x: record.frequency_x || 0,
      freq_y: record.frequency_y || 0,
      freq_z: record.frequency_z || 0,
      ppv_max: Math.max(record.ppv_x || 0, rec
