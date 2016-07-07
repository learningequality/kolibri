const logging = require('loglevel');
const rest = require('rest');
const mime = require('rest/interceptor/mime');

const client = rest.wrap(mime);

/** Class representing a single API resource object */
class Model {
  /**
   * Create a model instance.
   * @param {object} data - data to insert into the model at creation time - should include at
   * least an id for fetching, or data an no id if the intention is to save a new model.
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

    // force IDs to always be strings - this should be changed on the server-side too
    this.attributes[this.resource.idKey] = String(this.attributes[this.resource.idKey]);
  }

  /**
   * Method to fetch data from the server for this particular model.
   * @param {object} params - an object of parameters to be parsed into GET parameters on the
   * fetch.
   * @returns {Promise} - Promise is resolved with Model attributes when the XHR successfully
   * returns, otherwise reject is called with the response object.
   */
  fetch(params = {}) {
    this.synced = false;
    return new Promise((resolve, reject) => {
      // Do a fetch on the URL.
      client({ path: this.url, params }).then((response) => {
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
  /**
   * Create a Collection instance.
   * @param {Object} params - Default parameters to use when fetching data from the server.
   * @param {Object[]|Model[]} data - Data to prepopulate the collection with,
   * useful if wanting to save multiple models.
   * @param {Resource} resource - object of the Resource class, specifies the urls and fetching
   * behaviour for the collection.
   */
  constructor(params = {}, data = [], resource) {
    this.resource = resource;
    this.params = params;
    if (!this.resource) {
      throw new TypeError('resource must be defined');
    }
    this.models = [];
    this._model_map = {};
    this.synced = false;
    this.set(data);
  }

  /**
   * Method to fetch data from the server for this collection.
   * @param {object} extraParams - an object of parameters to be parsed into GET parameters on the
   * fetch.
   * @returns {Promise} - Promise is resolved with Array of Model attributes when the XHR
   * successfully returns, otherwise reject is called with the response object.
   */
  fetch(extraParams = {}) {
    this.synced = false;
    const params = Object.assign({}, this.params, extraParams);
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
        this.models.forEach((model) => {
          model.synced = true; // eslint-disable-line no-param-reassign
        });
        // Return the data from the models, not the models themselves.
        resolve(this.models.map((model) => model.attributes));
      }, (response) => {
        logging.error('An error occurred', response);
        reject(response);
      });
    });
  }

  get url() {
    return this.resource.collectionUrl();
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
      if (!this._model_map[setModel.id]) {
        this._model_map[setModel.id] = setModel;
        this.models.push(setModel);
      }
    });
  }

  get data() {
    return this.models.map((model) => model.attributes);
  }
}

/** Class representing a single API resource.
 *  Contains references to all Models that have been fetched from the server.
 *  Can also be subclassed in order to create custom behaviour for particular API resources.
 */
class Resource {
  /**
   * Create a resource with a Django REST API name corresponding to the name parameter.
   * @param {Kolibri} kolibri - The current instantiated instance of the core app.
   */
  constructor(kolibri) {
    this.models = {};
    this.collections = {};
    this.kolibri = kolibri;
  }

  /**
   * Optionally pass in data and instantiate a collection for saving that data or fetching
   * data from the resource.
   * @param {Object} params - default parameters to use for Collection fetching.
   * @param {Object[]} data - Data to instantiate the Collection - see Model constructor for
   * details of data.
   * @returns {Collection} - Returns an instantiated Collection object.
   */
  getCollection(params = {}, data = []) {
    let collection;
    // Sort keys in order, then assign those keys to an empty object in that order.
    // Then stringify to create a cache key.
    const key = JSON.stringify(
      Object.assign(
        {}, ...Object.keys(params).sort().map(
          (paramKey) => ({ [paramKey]: params[paramKey] })
        )
      )
    );
    if (!this.collections[key]) {
      collection = new Collection(params, data, this);
    } else {
      collection = this.collections[key];
    }
    return collection;
  }

  /**
   * Get a model by id - this will either return a Model that has already been instantiated,
   * or will instantiate a model
   * that can later be fetched.
   * @param {String} id - The primary key of the Model instance.
   * @param {Object} [data={}] - Optional additional data to pass into the Model.
   * @returns {Model} - Returns a Model instance.
   */
  getModel(id, data = {}) {
    let model;
    if (!this.models[id]) {
      Object.assign(data, { [this.idKey]: id });
      model = new Model(data, this);
    } else {
      model = this.models[id];
    }
    return model;
  }

  /**
   * Add a model to the resource for deduplication, dirty checking, and tracking purposes.
   * @param {Object} data - The data for the model to add.
   * @returns {Model} - Returns the instantiated Model.
   */
  addModelData(data) {
    const model = new Model(data, this);
    return this.addModel(model);
  }

  /**
   * Add a model to the resource for deduplication, dirty checking, and tracking purposes.
   * @param {Object|Model} model - Either the data for the model to add, or the Model itself.
   * @returns {Model} - Returns the instantiated Model.
   */
  addModel(model) {
    if (!(model instanceof Model)) {
      return this.addModelData(model);
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
    // Leveraging Django REST Framework generated URL patterns.
    return this.urls[`${this.name}_detail`];
  }

  get collectionUrl() {
    // Leveraging Django REST Framework generated URL patterns.
    return this.urls[`${this.name}_list`];
  }

  static idKey() {
    return 'id';
  }

  get idKey() {
    return this.constructor.idKey();
  }

  static resourceName() {
    throw new ReferenceError('name is not defined for the base Resource class - please subclass.');
  }

  get name() {
    return this.constructor.resourceName();
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
    this._kolibri = kolibri;
    this._resources = {};
  }

  /**
   * Register a resource with the resource manager. Only one resource of a particular name can be
   * registered.
   * @param {Resource} ResourceClass - The subclass of Resource to use in registering the
   * resource. This is used to register a resource with specific subclassed behaviour for that
   * resource.
   * @returns {Resource} - Return the instantiated Resource.
   */
  registerResource(ResourceClass) {
    const name = ResourceClass.resourceName();
    if (!name) {
      throw new TypeError('A resource must have a defined resource name!');
    }
    if (this._resources[name]) {
      throw new TypeError('A resource with that name has already been registered!');
    }
    this._resources[name] = new ResourceClass(this._kolibri);
    // Shim for IE9 compatibility of .name property.
    // Modified from: http://matt.scharley.me/2012/03/monkey-patch-name-ie.html#comment-551654096
    const className = ResourceClass.name || /function\s([^(]{1,})\(/.exec(
        (ResourceClass).toString())[1].trim();
    Object.defineProperty(this, className, { value: this._resources[name] });
    return this._resources[name];
  }

}

module.exports = {
  ResourceManager,
  Resource,
};
