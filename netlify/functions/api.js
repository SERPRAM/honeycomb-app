// Netlify Function - Proxy para API Honeycomb
// Resuelve el problema de CORS

const HONEYCOMB_API = 'https://honeycomb.omnidots.com/api/v1';

exports.handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Obtener el endpoint desde query params
    const params = event.queryStringParameters || {};
    const endpoint = params.endpoint;

    if (!endpoint) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, message: 'Endpoint requerido' })
      };
    }

    // Construir URL de Honeycomb
    let url = `${HONEYCOMB_API}/${endpoint}`;
    
    // Agregar otros parámetros (excepto 'endpoint')
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (key !== 'endpoint') {
        queryParams.append(key, params[key]);
      }
    });
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    // Configurar fetch
    const fetchOptions = {
      method: event.httpMethod,
      headers: { 'Content-Type': 'application/json' }
    };

    // Si es POST, incluir body
    if (event.httpMethod === 'POST' && event.body) {
      fetchOptions.body = event.body;
    }

    // Hacer petición a Honeycomb
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Error en proxy:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        ok: false, 
        message: 'Error de conexión con Honeycomb',
        error: error.message 
      })
    };
  }
};
