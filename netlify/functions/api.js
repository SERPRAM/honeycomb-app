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

    // Para autenticación: enviar como POST con form data
    if (endpoint === 'user/authenticate' && event.body) {
      let bodyData = event.body;
      
      if (event.isBase64Encoded) {
        bodyData = Buffer.from(event.body, 'base64').toString('utf-8');
      }
      
      try {
        const credentials = JSON.parse(bodyData);
        
        // Crear form data URL encoded
        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);
        
        console.log('Auth POST to:', url);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: formData.toString()
        });
        
        const data = await response.json();
        console.log('Auth response:', JSON.stringify(data));
        
        return { statusCode: 200, headers, body: JSON.stringify(data) };
        
      } catch (e) {
        console.error('Error parsing credentials:', e);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, message: 'Error en credenciales' })
        };
      }
    }

    // Para otros endpoints: GET con query params
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (key !== 'endpoint') {
        queryParams.append(key, params[key]);
      }
    });

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    console.log('GET:', url);

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
