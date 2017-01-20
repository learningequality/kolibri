/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

'use strict';

const assert = require('assert');
const sinon = require('sinon');
const rewire = require('rewire');

if (!global.hasOwnProperty('Intl')) {
  global.Intl = require('intl');
}

const Resources = rewire('../src/api-resource.js');

describe('ResourceManager', function () {
  beforeEach(function () {
    this.mockName = 'test';
    this.mockClassName = 'testClass';
    this.resourceManager = new Resources.ResourceManager({});
  });
  afterEach(function () {
    delete this.resourceManager;
  });
  describe('_kolibri property', function () {
    it('should be empty object', function () {
      assert.deepEqual(this.resourceManager._kolibri, {});
    });
  });
  describe('_resources property', function () {
    it('should be empty', function () {
      assert.deepEqual(this.resourceManager._resources, {});
    });
  });
  describe('registerResource method', function () {
    it('should throw a TypeError if no className is passed', function () {
      assert.throws(this.resourceManager.registerResource, TypeError);
    });
    it('should throw a TypeError if no ResourceClass is passed', function () {
      assert.throws(() => this.resourceManager.registerResource(this.mockName), TypeError);
    });
    it('should throw a TypeError if the ResourceClass does not have a name', function () {
      const mockClass = {
        resourceName: sinon.spy(),
      };
      assert.throws(() => this.resourceManager.registerResource(this.mockName, mockClass),
        TypeError);
    });
    it('should throw a TypeError if the resource name is already registered', function () {
      const mockClass = {
        resourceName: sinon.stub().returns(this.mockClassName),
      };
      this.resourceManager._resources.test = {};
      assert.throws(() => this.resourceManager.registerResource(this.mockName, mockClass),
        TypeError);
    });
    describe('when successfully registering', function () {
      beforeEach(function () {
        this.mockClass = sinon.spy(() => ({}));
        this.resourceNameStub = sinon.stub().returns(this.mockClassName);
        this.mockClass.resourceName = this.resourceNameStub;
        this.resourceManager.registerResource(this.mockName, this.mockClass);
      });
      it('should populate the _resources property with an object', function () {
        assert.ok(this.resourceManager._resources[this.mockClassName]);
      });
      it('should invoke the constructor of the ResourceClass', function () {
        assert.ok(this.mockClass.calledWithNew());
      });
    });
  });
});


describe('Resource', function () {
  beforeEach(function () {
    this.kolibri = {};
    this.resource = new Resources.Resource(this.kolibri);
  });
  afterEach(function () {
    delete this.resource;
  });
  describe('kolibri property', function () {
    it('should be empty object', function () {
      assert.deepEqual(this.resource.kolibri, {});
    });
  });
  describe('collections property', function () {
    it('should be empty object', function () {
      assert.deepEqual(this.resource.collections, {});
    });
  });
  describe('models property', function () {
    it('should be empty object', function () {
      assert.deepEqual(this.resource.models, {});
    });
  });
  describe('resourceName method', function () {
    it('should throw a ReferenceError', function () {
      assert.throws(Resources.Resource.resourceName, ReferenceError);
    });
  });
  describe('static idKey method', function () {
    it('should be "id" by default', function () {
      assert.equal(Resources.Resource.idKey(), 'id');
    });
  });
  describe('idKey property', function () {
    it('should be "id" by default', function () {
      assert.equal(this.resource.idKey, 'id');
    });
  });
  describe('client property', function () {
    it('should return the rest client', function () {
      const Rest = function () { return this; };
      Rest.prototype.wrap = function () { return this; };
      const testClient = new Rest();
      this.resource.kolibri.client = testClient;
      assert.equal(this.resource.client, testClient);
    });
  });
  describe('urls property', function () {
    it('should return the urls property of the passed in kolibri object', function () {
      const urls = { hi: 'ho' };
      this.kolibri.urls = urls;
      assert.equal(this.resource.urls, urls);
    });
  });
  describe('name property', function () {
    it('should return the resourceName static method of the Resource class', function () {
      const testName = 'test';
      Resources.Resource.resourceName = function () {return testName;};
      assert.equal(this.resource.name, testName);
    });
  });
  describe('getModel method', function () {
    it('should return a model instance', function () {
      assert.ok(this.resource.getModel('test') instanceof Resources.Model);
    });
    it('should return an existing model from the cache', function () {
      const testModel = new Resources.Model({}, this.resource);
      this.resource.models.test = testModel;
      assert.equal(this.resource.getModel('test'), testModel);
    });
    it('should call create model if the model is not in the cache', function () {
      const spy = sinon.spy(this.resource, 'createModel');
      this.resource.getModel('test');
      assert.ok(spy.calledOnce);
    });
  });
  describe('createModel method', function () {
    it('should return a model instance', function () {
      assert.ok(this.resource.createModel({}) instanceof Resources.Model);
    });
    it('should call add model', function () {
      const spy = sinon.spy(this.resource, 'addModel');
      this.resource.createModel({});
      assert.ok(spy.calledOnce);
    });
  });
  describe('addModel method', function () {
    it('should return a model instance', function () {
      assert.ok(this.resource.addModel({}) instanceof Resources.Model);
    });
    it('should call createModel if passed an object', function () {
      const spy = sinon.spy(this.resource, 'createModel');
      this.resource.addModel({});
      assert.ok(spy.calledOnce);
    });
    it('should not call createModel if passed a Model', function () {
      const spy = sinon.spy(this.resource, 'createModel');
      this.resource.addModel(new Resources.Model({}, this.resource));
      assert.ok(!spy.called);
    });
    it('should not add a model to the cache if no id', function () {
      this.resource.addModel(new Resources.Model({}, this.resource));
      assert.deepEqual({}, this.resource.models);
    });
    it('should add a model to the cache if it has an id', function () {
      const model = this.resource.addModel(new Resources.Model({ id: 'test' }, this.resource));
      assert.deepEqual({ test: model }, this.resource.models);
    });
    it('should update the model in the cache if a model with matching id is found', function () {
      const model = new Resources.Model({ id: 'test' }, this.resource);
      this.resource.models.test = model;
      this.resource.addModel(new Resources.Model({ id: 'test', example: 'prop' }, this.resource));
      assert.deepEqual({ test: model }, this.resource.models);
      assert.equal(model.attributes.example, 'prop');
    });
  });
  describe('removeModel method', function () {
    it('should remove model from model cache', function () {
      const id = 'test';
      this.resource.models[id] = 'test';
      this.resource.removeModel({
        id,
      });
      assert.equal(typeof this.resource.models[id], 'undefined');
    });
  });
  describe('unCacheModel method', function () {
    it('should set the synced property of the model to false', function () {
      const id = 'test';
      this.resource.models[id] = {};
      this.resource.unCacheModel(id);
      assert.equal(this.resource.models[id].synced, false);
    });
  });
  describe('clearCache method', function () {
    it('should set the models property of the Resource to an empty object', function () {
      const id = 'test';
      this.resource.models[id] = {};
      this.resource.clearCache();
      assert.deepEqual(this.resource.models, {});
    });
    it('should set the collections property of the Resource to an empty object', function () {
      const id = 'test';
      this.resource.collections[id] = {};
      this.resource.clearCache();
      assert.deepEqual(this.resource.collections, {});
    });
  });
  describe('getCollection method', function () {
    it('should return a collection instance', function () {
      assert.ok(this.resource.getCollection({}) instanceof Resources.Collection);
    });
    it('should return an existing collection from the cache', function () {
      const testCollection = new Resources.Collection({}, [], this.resource);
      this.resource.collections['{}'] = testCollection;
      assert.equal(this.resource.getCollection({}), testCollection);
    });
    it('should call create collection if the collection is not in the cache', function () {
      const spy = sinon.spy(this.resource, 'createCollection');
      this.resource.getCollection({});
      assert.ok(spy.calledOnce);
    });
  });
  describe('createCollection method', function () {
    it('should return a collection instance', function () {
      assert.ok(this.resource.createCollection({}) instanceof Resources.Collection);
    });
    it('should add the collection to the cache', function () {
      const collection = this.resource.createCollection({});
      assert.equal(this.resource.collections[collection.key], collection);
    });
  });
});

describe('Collection', function () {
  beforeEach(function () {
    this.addModelStub = sinon.spy((model) => model);
    this.resource = {
      addModel: this.addModelStub,
      collectionUrl: () => '',
    };
    this.params = {};
    this.data = [{ test: 'test' }];
    this.collection = new Resources.Collection(this.params, this.data, this.resource);
  });
  afterEach(function () {
    delete this.resource;
    delete this.collection;
  });
  describe('constructor set properties:', function () {
    describe('resource property', function () {
      it('should be the passed in resource', function () {
        assert.equal(this.resource, this.collection.resource);
      });
    });
    describe('params property', function () {
      it('should be the passed in params', function () {
        assert.equal(this.params, this.collection.params);
      });
    });
    describe('models property', function () {
      it('should be an array of length 1', function () {
        assert.equal(this.collection.models.length, 1);
      });
    });
    describe('_model_map property', function () {
      it('should have one entry', function () {
        assert.equal(Object.keys(this.collection._model_map).length, 1);
      });
    });
    describe('synced property', function () {
      it('should be false', function () {
        assert.equal(this.collection.synced, false);
      });
    });
    describe('promises property', function () {
      it('should be an empty array', function () {
        assert.deepEqual(this.collection.promises, []);
      });
    });
    describe('addModel method', function () {
      it('should be called once', function () {
        assert.ok(this.addModelStub.calledOnce);
      });
    });
  });
  describe('constructor method', function () {
    describe('if resource is undefined', function () {
      it('should throw a TypeError', function () {
        assert.throws(() => new Resources.Collection(this.params, this.data), TypeError);
      });
    });
    describe('if data is passed in', function () {
      it('should call the set method once', function () {
        const spy = sinon.spy(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(this.params, this.data, this.resource);
        assert.ok(testCollection);
        assert.ok(spy.calledOnce);
        Resources.Collection.prototype.set.restore();
      });
      it('should call the set method with the data', function () {
        const spy = sinon.spy(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(this.params, this.data, this.resource);
        assert.ok(testCollection);
        assert.ok(spy.calledWithExactly(this.data));
        Resources.Collection.prototype.set.restore();
      });
    });
    describe('if no data is passed in', function () {
      it('should call the set method once', function () {
        const spy = sinon.spy(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(this.params, undefined, this.resource);
        assert.ok(testCollection);
        assert.ok(spy.calledOnce);
        Resources.Collection.prototype.set.restore();
      });
      it('should call the set method with an empty array', function () {
        const spy = sinon.spy(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(this.params, undefined, this.resource);
        assert.ok(testCollection);
        assert.ok(spy.calledWithExactly([]));
        Resources.Collection.prototype.set.restore();
      });
    });
  });
  describe('clearCache method', function () {
    beforeEach(function () {
      this.collection.clearCache();
    });
    it('should set models to an empty array', function () {
      assert.deepEqual(this.collection.models, []);
    });
    it('should set _model_map to an empty object', function () {
      assert.deepEqual(this.collection._model_map, {});
    });
  });
  describe('fetch method', function () {
    describe('if called when Collection.synced = true and force is false', function () {
      it('should return current data immediately', function () {
        this.collection.synced = true;
        const promise = this.collection.fetch();
        promise.then((result) => {
          assert.equal(result, this.data);
        });
      });
    });
    describe('if called when Collection.synced = false', function () {
      describe('and the fetch is successful', function () {
        beforeEach(function () {
          this.setSpy = sinon.stub(this.collection, 'set');
          this.clearCacheSpy = sinon.stub(this.collection, 'clearCache');
        });
        afterEach(function () {
          this.collection.set.restore();
        });
        describe('and the returned data is an array', function () {
          beforeEach(function () {
            this.response = { entity: [{ testing: 'testing' }] };
            this.client = sinon.stub();
            this.client.returns(Promise.resolve(this.response));
            this.resource.client = this.client;
          });
          it('should call the client once', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.client.calledOnce);
              done();
            });
          });
          it('should call clearCache once', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.clearCacheSpy.calledOnce);
              done();
            });
          });
          it('should call set once', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.setSpy.calledOnce);
              done();
            });
          });
          it('should call set with the response entity', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.setSpy.calledWithExactly(this.response.entity));
              done();
            });
          });
          it('should set synced to true', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.collection.synced);
              done();
            });
          });
          it('should leave no promises in promises property', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.deepEqual(this.collection.promises, []);
              done();
            });
          });
          it('should set every model synced to true', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              this.collection.models.forEach((model) => {
                assert.ok(model.synced);
              });
              done();
            });
          });
        });
        describe('and the returned data is paginated', function () {
          beforeEach(function () {
            this.response = { entity: {
              results: [{ testing: 'testing' }],
              count: 1,
              next: false,
              previous: false,
            } };
            this.collection.pageSize = 25;
            this.client = sinon.stub();
            this.client.returns(Promise.resolve(this.response));
            this.resource.client = this.client;
          });
          it('should call the client once', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.client.calledOnce);
              done();
            });
          });
          it('should call clearCache once', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.clearCacheSpy.calledOnce);
              done();
            });
          });
          it('should call set once', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.setSpy.calledOnce);
              done();
            });
          });
          it('should call set with the response entity results', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.setSpy.calledWithExactly(this.response.entity.results));
              done();
            });
          });
          it('should set synced to true', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.collection.synced);
              done();
            });
          });
          it('should set every model synced to true', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              this.collection.models.forEach((model) => {
                assert.ok(model.synced);
              });
              done();
            });
          });
          it('should set the pageCount property to 1', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.equal(this.collection.pageCount, 1);
              done();
            });
          });
          it('should set the hasNext property to false', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.equal(this.collection.hasNext, false);
              done();
            });
          });
          it('should set the hasPrev property to false', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.equal(this.collection.hasPrev, false);
              done();
            });
          });
        });
        describe('and the returned data is malformed', function () {
          beforeEach(function () {
            this.response = {};
            this.client = sinon.stub();
            this.client.returns(Promise.resolve(this.response));
            this.resource.client = this.client;
            this.logstub = sinon.spy();
            this.restore = Resources.__set__('logging.debug', (message) => this.logstub(message));
          });
          afterEach(function () {
            this.restore();
          });
          it('should call the client once', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.client.calledOnce);
              done();
            });
          });
          it('should call logging.debug once', function (done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.logstub.calledOnce);
              done();
            });
          });
        });
      });
      describe('and the fetch is not successful', function () {
        beforeEach(function () {
          this.response = 'Error';
          this.client = sinon.stub();
          this.client.returns(Promise.reject(this.response));
          this.resource.client = this.client;
          this.logstub = sinon.spy();
          this.restore = Resources.__set__('logging.error', (message) => this.logstub(message));
        });
        it('should call logging.error once', function (done) {
          this.collection.synced = false;
          this.collection.fetch().catch(() => {
            assert.ok(this.logstub.calledOnce);
            done();
          });
        });
        it('should return the error', function (done) {
          this.collection.synced = false;
          this.collection.fetch().catch((error) => {
            assert.equal(error, this.response);
            done();
          });
        });
        it('should leave no promises in promises property', function (done) {
          this.collection.synced = false;
          this.collection.fetch().catch(() => {
            assert.deepEqual(this.collection.promises, []);
            done();
          });
        });
      });
    });
    describe('if called with force true and synced is true', function () {
      it('should call the client once', function (done) {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(Promise.resolve(this.response));
        this.resource.client = this.client;
        this.collection.synced = true;
        this.collection.fetch({}, true).then(() => {
          assert.ok(this.client.calledOnce);
          done();
        });
      });
    });
    describe('if called once', function () {
      it('should add a promise to the promises property', function () {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        this.collection.synced = false;
        const promise = this.collection.fetch();
        assert.deepEqual(this.collection.promises, [promise]);
      });
    });
    describe('if called twice', function () {
      it('should add two promises to the promises property', function () {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        this.collection.synced = false;
        const promise1 = this.collection.fetch();
        const promise2 = this.collection.fetch();
        assert.deepEqual(this.collection.promises, [promise1, promise2]);
      });
    });
  });
  describe('set method', function () {
    beforeEach(function () {
      this.model = { id: 'test' };
    });
    describe('for a single model', function () {
      it('should add an entry to the models property', function () {
        this.collection.models = [];
        this.collection.set(this.model);
        assert.deepEqual(this.collection.models, [this.model]);
      });
      it('should add an entry to the _model_map property', function () {
        this.collection._model_map = {};
        this.collection.set(this.model);
        assert.deepEqual(this.collection._model_map, { [this.model.id]: this.model });
      });
    });
    describe('for an array of models', function () {
      it('should add them to the models property', function () {
        this.collection.models = [];
        this.collection.set([this.model]);
        assert.deepEqual(this.collection.models, [this.model]);
      });
      it('should add them to the _model_map property', function () {
        this.collection._model_map = {};
        this.collection.set([this.model]);
        assert.deepEqual(this.collection._model_map, { [this.model.id]: this.model });
      });
      it('should add only one entry per id to the models property', function () {
        this.collection.models = [];
        this.collection.set([this.model, this.model]);
        assert.deepEqual(this.collection.models, [this.model]);
      });
      it('should add only one entry per id to the _model_map property', function () {
        this.collection._model_map = {};
        this.collection.set([this.model, this.model]);
        assert.deepEqual(this.collection._model_map, { [this.model.id]: this.model });
      });
    });
  });
});
