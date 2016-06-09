// Fetch polyfill
require('whatwg-fetch');
const logging = require('loglevel');
const { default: restful, fetchBackend } = require('restful.js');

const api = restful('', fetchBackend(fetch));

const Kolibri = require('kolibri');

class Resource {
  constructor(resourceName, { readOnly, idKey } = { read_only: false, id_key: 'id' }) {
    const baseUrl = Kolibri.urls[`${resourceName}_list`]().split('/').slice(1, -2).join('/');
    const collectionName = Kolibri.urls[`${resourceName}_list`]().split('/').slice(-2).join('/');
    this.collection = api.custom(baseUrl).all(collectionName);
    this.readOnly = readOnly;
    this.idKey = idKey;
    this.collection.identifier(this.idKey);
    this.entities = {};
  }
  getItem(id, params = {}) {
    return new Promise((resolve, reject) => {
      this.collection.get(id, params).then((response) => {
        this.entities[id] = response.body();
        const data = this.entities[id].data();
        resolve(data);
      }, (response) => {
        logging.error('An error occurred', response);
        reject(response);
      });
    });
  }
  getCollection(params = {}) {
    return new Promise((resolve, reject) => {
      this.collection.getAll(params).then((response) => {
        response.body().forEach((entity) => {
          this.entities[entity.id()] = entity;
        });
        const data = Object.keys(this.entities).map(key => this.entities[key].data());
        resolve(data);
      }, (response) => {
        logging.error('An error occurred', response);
        reject(response);
      });
    });
  }
}

module.exports = Resource;
