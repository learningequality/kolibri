
const rest = require('rest');
const mime = require('rest/interceptor/mime');
const cookiejs = require('kolibri.lib.jscookie');
const csrf = require('rest/interceptor/csrf');
const errorCode = require('rest/interceptor/errorCode');


const client = rest
  .wrap(mime, { mime: 'application/json' })
  .wrap(csrf, { name: 'X-CSRFToken', token: cookiejs.get('csrftoken') })
  .wrap(errorCode);


function resource(url) {
  return new Promise((resolve, reject) => {
    client({ path: url })
      .then(response => resolve(response.entity))
      .catch(error => reject(error));
  });
}

module.exports = resource;
