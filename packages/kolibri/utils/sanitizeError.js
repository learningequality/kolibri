import pickBy from 'lodash/pickBy';

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apikey', 'api_key'];
const SENSITIVE_HEADERS = ['authorization', 'x-api-key', 'x-auth-token'];
const MASK = '********';

function maskObject(obj, sensitiveKeys) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, sensitiveKeys.includes(k.toLowerCase()) ? MASK : v]),
  );
}

function _handleData(data) {
  const dataIsString = typeof data === 'string';
  if (dataIsString) {
    try {
      data = JSON.parse(data);
    } catch {} // eslint-disable-line no-empty
  }
  data = maskObject(data, SENSITIVE_FIELDS);
  return dataIsString ? JSON.stringify(data) : data;
}

export default function sanitizeError(error) {
  if (!error || typeof error !== 'object') return error;

  const result = {
    message: error.message,
    name: error.name,
    code: error.code,
  };

  if (error.config) {
    result.config = pickBy({
      method: error.config.method,
      url: error.config.url,
      data: _handleData(error.config.data),
      params: maskObject(error.config.params, SENSITIVE_FIELDS),
      headers: maskObject(error.config.headers, SENSITIVE_HEADERS),
    });
  }

  if (error.response) {
    result.response = {
      status: error.response.status,
      statusText: error.response.statusText,
      data: _handleData(error.response.data),
      config: result.config,
    };
  }

  return result;
}
