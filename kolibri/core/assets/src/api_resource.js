const logging = require('loglevel');
const rest = require('rest');
const mime = require('rest/interceptor/mime');

const client = rest.wrap(mime);

/** Class representing a single API resource object */
class Model {
  /**
   * Create a model instance.
   * @param {object} data - data to insert into the model at creation time - should include at
   * least an id for fetching.
   * @param {Resource} resource - object of the Resource class, specifies the urls and fetching
   * behaviour for the model.
   */
  constructor(data, resource) {
    // Assign any data to the attributes property of the Model.
    this.attributes = {};
    Object.assign(this.attributes, data);
    this.resource = resource;
    if (!this.resource) {
      throw new TypeError('resource must be defined');
    }
    // Register any created model with the Resource to track model instances.
    this.resource.addModel(this);
    this.synced = false;
  }

  /**
   * Method to fetch data from the server for this particular model.
   * Takes no parameters, as all specification should be in the associated Resource object.
   * @returns {Promise} - Promise is resolved with Model attributes when the XHR successfully
   * returns, otherwise reject is called with the response object.
   */
  fetch() {
    return new Promise((resolve, reject) => {
      // Do a fetch on the URL.
      client({ path: this.url }).then((response) => {
        // Set the retrieved Object onto the Model instance.
        this.set(response.entity);
        // Flag that the Model has been fetched.
        this.synced = true;
        // Resolve the promise with the attributes of the Model.
        resolve(this.attributes);
      }, (response) => {
        logging.error('An error occurred', response);
        reject(response);
      });
    });
  }
  get url() {
    return this.resource.modelUrl(this.id);
  }
  get id() {
    return this.attributes[this.resource.idKey];
  }
  set(attributes) {
    Object.assign(this.attributes, attributes);
  }
}

/** Class representing a 'view' of a single API resource.
 *  Contains different Model objects, depending on the parameters passed to its fetch method.
 */
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

  /**
   * Method to fetch data from the server for this collection.
   * @param {object} params - an object of parameters to be parsed into GET parameters on the
   * fetch.
   * @returns {Promise} - Promise is resolved with Array of Model attributes when the XHR
   * successfully returns, otherwise reject is called with the response object.
   */
  fetch({ params } = { params: {} }) {
    return new Promise((resolve, reject) => {
      // Do a fetch on the URL, with the parameters passed in.
      client({ path: this.url, params }).then((response) => {
        // Reset current models to only include ones from this fetch.
        this.models = [];
        this._model_map = {};
        // Set response object - an Array - on the Collection to record the data.
        this.set(response.entity);
        // Mark that the fetch has completed.
        this.synced = true;
        // Return the data from the models, not the models themselves.
        resolve(this.models.map((model) => model.attributes));
      }, (response) => {
        logging.error('An error occurred', response);
        reject(response);
      });
    });
  }
  get url() {
    return this.resource.collectionUrl;
  }

  /**
   * Make a model a member of the collection - record in the models Array, and in the mapping
   * from id to model. Will automatically instantiate Models for data passed in as objects, and
   * deduplicate within the collection.
   * @param {(Object|Model|Object[]|Model[])} models - Either an Array or single instance of an
   * object or Model.
   */
  set(models) {
    let modelsToSet;
    if (!Array.isArray(models)) {
      modelsToSet = [models];
    } else {
      modelsToSet = models;
    }

    modelsToSet.forEach((model) => {
      // Note: this method ensures instantiation deduplication of models within the collection
      //  and across collections.
      const setModel = this.resource.addModel(model);
      if (!this._model_map[model.id]) {
        this._model_map[model.id] = setModel;
        this.models.push(setModel);
      }
    });
  }
}

/** Class representing a single API resource.
 *  Contains references to all Models that have been fetched from the server.
 *  Can also be subclassed in order to create custom behaviour for particular API resources.
 */
class Resource {
  /**
   * Create a resource with a Django REST API name corresponding to the name parameter.
   * @param {String} name - The Django REST framework name for the API endpoint.
   * @param {String} idKey - The primary key field for the API endpoint, defaults to 'id'.
   * @param {Kolibri} kolibri - The current instantiated instance of the core app.
   */
  constructor({ name, idKey, kolibri } = { idKey: 'id' }) {
    this.models = {};
    this.name = name;
    this.idKey = idKey;
    this.kolibri = kolibri;
  }

  /**
   * Optionally pass in data and instantiate a collection for saving that data or fetching
   * data from the resource.
   * @param {Object[]} data - Data to instantiate the Collection - see Model constructor for
   * details of data.
   * @returns {Collection} - Returns an instantiated Collection object.
   */
  getCollection(data = []) {
    return new Collection(data, this);
  }

  /**
   * Get a model by id - this will either return a Model that has already been instantiated,
   * or will instantiate a model
   * that can later be fetched.
   * @param {String} id - The primary key of the Model instance.
   * @returns {Model} - Returns a Model instance.
   */
  getModel(id) {
    let model;
    if (!this.models[id]) {
      model = new Model({ [this.idKey]: id }, this);
    } else {
      model = this.models[id];
    }
    return model;
  }

  /**
   * Add a model to the resource for deduplication, dirty checking, and tracking purposes.
   * @param {Object|Model} model - Either the data for the model to add, or the Model itself.
   * @returns {Model} - Returns the instantiated Model.
   */
  addModel(model) {
    if (!(model instanceof Model)) {
      model = new Model(model, { resource: this }); // eslint-disable-line no-param-reassign
    }
    if (!this.models[model.id]) {
      this.models[model.id] = model;
    } else {
      this.models[model.id].set(model.attributes);
    }
    return this.models[model.id];
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

/** Class to manage all API resources.
 *  This is instantiated and attached to the core app constructor, and its methods exposed there.
 *  This means that a particular Resource should only be instantiated once during the lifecycle
 * of the app, allowing for easy caching, as all Model instances can be shared in the central
 * resource.
 */
class ResourceManager {
  /**
   * Instantiate a Resource Manager to manage the creation of Resources.
   * @param {Kolibri} kolibri - The current instantiated instance of the core app - needed to
  * reference the urls.
   */
  constructor(kolibri) {
    this.kolibri = kolibri;
    this._resources = {};
  }

  /**
   * Register a resource with the resource manager. Only one resource of a particular name can be
   * registered.
   * @param {String} name - The Django REST framework name for the API endpoint.
   * @param {String} idKey - The primary key field for the API endpoint, defaults to 'id'.
   * @param {Class} [ResourceClass=Resource] - The subclass of Resource to use in registering the
   * resource. This can be used to register a resource with specific subclassed behaviour for that
   * resource.
   * @returns {Resource} - Return the instantiated Resource.
   */
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

  /**
   * Get a resource from the resource manager. For convenience, will register a resource for that
   * name if one does not exist.
   * @param {String} name - The Django REST framework name for the API endpoint.
   * @returns {Resource} - Return the Resource.
   */
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
