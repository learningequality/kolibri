const logging = require('loglevel');
const rest = require('rest');
const mime = require('rest/interceptor/mime');

const client = rest.wrap(mime);

class Model {
  constructor(data, resource) {
    this.attributes = {};
    Object.assign(this.attributes, data);
    this.resource = resource;
    if (!this.resource) {
      throw new TypeError('resource must be defined');
    }
    this.resource.addModel(this);
    this.synced = false;
  }
  fetch() {
    return new Promise((resolve, reject) => {
      client({ path: this.url() }).then((response) => {
        this.set(response.entity);
        this.synced = true;
        resolve(this.attributes);
      }, (response) => {
        logging.error('An error occurred', response);
        reject(response);
      });
    });
  }
  url() {
    return this.resource.modelUrl(this.id());
  }
  id() {
    return this.attributes[this.resource.idKey];
  }
  set(attributes) {
    Object.assign(this.attributes, attributes);
  }
}

class Collection {
  constructor(data = [], resource) {
    this.resource = resource;
    if (!this.resource) {
      throw new TypeError('resource must be defined');
    }
    this.models = [];
    this._model_map = {};
    this.synced = false;
  }
  fetch({ params } = { params: {} }) {
    return new Promise((resolve, reject) => {
      client({ path: this.url(), params }).then((response) => {
        this.set(response.entity);
        this.synced = true;
        resolve(this.models);
      }, (response) => {
        logging.error('An error occurred', response);
        reject(response);
      });
    });
  }
  url() {
    return this.resource.collectionUrl();
  }
  set(models) {
    let modelsToSet;
    if (!Array.isArray(models)) {
      modelsToSet = [models];
    } else {
      modelsToSet = models;
    }
    modelsToSet = modelsToSet.map((val) => {
      if (!(val instanceof Model)) {
        return new Model(val, { resource: this.resource });
      }
      return val;
    });

    modelsToSet.forEach((model) => {
      const setModel = this.resource.addModel(model);
      if (!this._model_map[model.id()]) {
        this._model_map[model.id()] = setModel;
        this.models.push(setModel);
      }
    });
  }
}

class Resource {
  constructor({ name, idKey, kolibri } = { idKey: 'id' }) {
    this.models = {};
    this.name = name;
    this.idKey = idKey;
    this.kolibri = kolibri;
  }
  getCollection(data = []) {
    return new Collection(data, this);
  }
  getModel(id) {
    let model;
    if (!this.models[id]) {
      model = new Model({ [this.idKey]: id }, this);
    } else {
      model = this.models[id];
    }
    return model;
  }
  addModel(model) {
    if (!this.models[model.id()]) {
      this.models[model.id()] = model;
    } else {
      this.models[model.id()].set(model.attributes);
    }
    return this.models[model.id()];
  }
  get urls() {
    return this.kolibri.urls;
  }
  get modelUrl() {
    return this.urls[`${this.name}_detail`];
  }
  get collectionUrl() {
    return this.urls[`${this.name}_list`];
  }
}

class ResourceManager {
  constructor(kolibri) {
    this.kolibri = kolibri;
    this._resources = {};
  }
  registerResource(name, idKey = 'id', ResourceClass = Resource) {
    if (name && !this._resources[name]) {
      this._resources[name] = new ResourceClass({ name, idKey, kolibri: this.kolibri });
    } else {
      if (!name) {
        throw new TypeError('A resource must have a defined resource name!');
      } else {
        throw new TypeError('A resource with that name has already been registered!');
      }
    }
    return this._resources[name];
  }
  getResource(name) {
    if (!this._resources[name]) {
      return this.registerResource(name);
    }
    return this._resources[name];
  }
}

module.exports = {
  ResourceManager,
  Resource,
};
