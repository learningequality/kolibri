const Resource = require('../api_resource').Resource;
const rest = require('rest');
const mime = require('rest/interceptor/mime');
const csrf = require('rest/interceptor/csrf');
const errorCode = require('rest/interceptor/errorCode');
const logging = require('logging').getLogger(__filename);

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name.concat('='))) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const client = rest.wrap(mime).wrap(csrf, { name: 'X-CSRFToken',
  token: getCookie('csrftoken') }).wrap(errorCode);

class DeviceOwnerResource extends Resource {
  static resourceName() {
    return 'deviceowner';
  }

  createDeviceOwner(data) {
    const mpath = 'http://localhost:8000/setup_wizard/create_deviceowner_api/';
    const promise = new Promise((resolve, reject) => {
      client({ path: mpath, params: data }).then((response) => {
        resolve(response.entity);
      }, (response) => {
        logging.error('An error occurred', response);
      });
    },
    (reject) => {
      reject(reject);
    });
    return promise;
  }
}

module.exports = DeviceOwnerResource;
