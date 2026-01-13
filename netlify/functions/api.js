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
    
    // Para GET: agregar parámetros a la URL (excepto 'endpoint')
    if (event.httpMethod === 'GET') {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (key !== 'endpoint') {
          queryParams.append(key, params[key]);
        }
      });
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    // Configurar fetch
    const fetchOptions = {
      method: event.httpMethod,
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    // Si es POST, incluir body directamente
    if (event.httpMethod === 'POST' && event.body) {
      // Parsear el body si viene como string
      let bodyData = event.body;
      
      // Si el body está en base64 (Netlify a veces lo codifica)
      if (event.isBase64Encoded) {
        bodyData = Buffer.from(event.body, 'base64').toString('utf-8');
      }
      
      fetchOptions.body = bodyData;
      
      console.log('POST to:', url);
      console.log('Body:', bodyData);
    }

    // Hacer petición a Honeycomb
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    console.log('Response:', JSON.stringify(data));

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
};;
