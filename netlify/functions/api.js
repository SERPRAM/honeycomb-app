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
    const params = event.queryStringParameters || {};
    const endpoint = params.endpoint;

    if (!endpoint) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, message: 'Endpoint requerido' })
      };
    }

    let url = `${HONEYCOMB_API}/${endpoint}`;
    const queryParams = new URLSearchParams();

    // Para autenticación: convertir body a query params
    if (endpoint === 'user/authenticate' && event.body) {
      let bodyData = event.body;
      
      if (event.isBase64Encoded) {
        bodyData = Buffer.from(event.body, 'base64').toString('utf-8');
      }
      
      try {
        const credentials = JSON.parse(bodyData);
        if (credentials.username) queryParams.append('username', credentials.username);
        if (credentials.password) queryParams.append('password', credentials.password);
      } catch (e) {
        console.error('Error parsing body:', e);
      }
      
      url += `?${queryParams.toString()}`;
      
      console.log('Auth URL:', url.replace(/password=[^&]+/, 'password=***'));
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      const data = await response.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // Para otros endpoints: agregar parámetros GET normalmente
    Object.keys(params).forEach(key => {
      if (key !== 'endpoint') {
        queryParams.append(key, params[key]);
      }
    });

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

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
