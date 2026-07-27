import { ref } from 'vue';
import * as Resources from '../apiResource';

jest.mock('kolibri/urls');

// Build a URL function of the shape the URL resolver produces. Route params - whether passed
// as named kwargs (an object) or positional args - are substituted into the path, mirroring
// how the real reverse() fills a route pattern. They never appear as a query string; query
// params are a separate concern handled by the request `params` option.
const urlFunctionFor =
  action =>
  (...args) => {
    let segments;
    if (args.length === 1 && args[0] !== null && typeof args[0] === 'object') {
      // Named kwargs: use the values, ordered by key so the path is deterministic.
      segments = Object.keys(args[0])
        .sort()
        .map(key => args[0][key]);
    } else {
      segments = args;
    }
    return `/api/${action}/${segments.join('/')}`;
  };

// A promise whose resolution is controlled by the test.
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('Resource', function () {
  let resource, modelData;
  const testName = 'test';
  beforeEach(function () {
    resource = new Resources.Resource({ name: testName });
    modelData = { id: 'test' };
  });
  afterEach(function () {
    resource = undefined;
  });
  it('should initialize with the correct properties', () => {
    expect(resource.collections).toEqual({});
    expect(resource.models).toEqual({});
    expect(resource.idKey).toEqual('id');
    expect(resource.name).toEqual(`kolibri:core:${testName}`);
  });

  describe('getModel method', function () {
    it('should return a model instance', function () {
      expect(resource.getModel('test')).toBeInstanceOf(Resources.Model);
    });
    it('should return an existing model from the cache', function () {
      const testModel = new Resources.Model(modelData, {}, resource);
      resource.addModel(testModel);
      expect(resource.getModel('test')).toEqual(testModel);
    });
    it('should call create model if the model is not in the cache', function () {
      const spy = jest.spyOn(resource, 'createModel');
      resource.getModel('test');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
  describe('createModel method', function () {
    it('should return a model instance', function () {
      expect(resource.createModel(modelData)).toBeInstanceOf(Resources.Model);
    });
    it('should call add model', function () {
      const spy = jest.spyOn(resource, 'addModel');
      resource.createModel(modelData);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
  describe('addModel method', function () {
    it('should return a model instance', function () {
      expect(resource.addModel(modelData)).toBeInstanceOf(Resources.Model);
    });
    it('should call createModel if passed an object', function () {
      const spy = jest.spyOn(resource, 'createModel');
      resource.addModel(modelData);
      expect(spy).toHaveBeenCalledTimes(1);
    });
    it('should not call createModel if passed a Model', function () {
      const spy = jest.spyOn(resource, 'createModel');
      resource.addModel(new Resources.Model(modelData, {}, resource));
      expect(spy).not.toHaveBeenCalled();
    });
    it('should add a model to the cache if no id', function () {
      resource.addModel(new Resources.Model({ data: 'data' }, {}, resource));
      expect(Object.keys(resource.models)).toHaveLength(1);
    });
    it('should not return the added model from the cache if no id', function () {
      resource.addModel(new Resources.Model({ data: 'data' }, {}, resource));
      const model = resource.getModel(undefined);
      expect(model.attributes.data).toBeUndefined();
    });
    it('should add a model to the cache if it has an id', function () {
      const model = resource.addModel(new Resources.Model({ id: 'test' }, {}, resource));
      expect(resource.models['default'][Object.keys(resource.models['default'])[0]]).toEqual(model);
    });
    it('should update the model in the cache if a model with matching id is found', function () {
      const model = new Resources.Model({ id: 'test' }, {}, resource);
      resource.addModel(model);
      resource.addModel(new Resources.Model({ id: 'test', example: 'prop' }, {}, resource));
      expect(Object.keys(resource.models)).toHaveLength(1);
      expect(model.attributes.example).toEqual('prop');
    });
  });
  describe('removeModel method', function () {
    it('should remove model from model cache', function () {
      const model = new Resources.Model({ id: 'test' }, {}, resource);
      resource.addModel(model);
      resource.removeModel(model);
      expect(resource.models['default']).toEqual({});
    });
  });
  describe('unCacheModel method', function () {
    it('should set the synced property of the model to false', function () {
      const id = 'test';
      resource.addModel({ id });
      resource.unCacheModel(id);
      expect(resource.getModel(id).synced).toEqual(false);
    });
  });
  describe('clearCache method', function () {
    it('should set the models property of the Resource to an empty object', function () {
      const id = 'test';
      resource.models[id] = {};
      resource.clearCache();
      expect(resource.models).toEqual({});
    });
    it('should set the collections property of the Resource to an empty object', function () {
      const id = 'test';
      resource.collections[id] = {};
      resource.clearCache();
      expect(resource.collections).toEqual({});
    });
  });
  describe('getCollection method', function () {
    it('should return a collection instance', function () {
      expect(resource.getCollection({})).toBeInstanceOf(Resources.Collection);
    });
    it('should return an existing collection from the cache', function () {
      const testCollection = new Resources.Collection({}, [], resource);
      resource.collections['{}'] = testCollection;
      expect(resource.getCollection({})).toEqual(testCollection);
    });
    it('should call create collection if the collection is not in the cache', function () {
      const spy = jest.spyOn(resource, 'createCollection');
      resource.getCollection({});
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
  describe('createCollection method', function () {
    it('should return a collection instance', function () {
      expect(resource.createCollection({})).toBeInstanceOf(Resources.Collection);
    });
    it('should add the collection to the cache', function () {
      resource.createCollection({});
      expect(Object.keys(resource.collections)).toHaveLength(1);
    });
  });
  describe('__cacheKey method', function () {
    it('should return integer to string instance', function () {
      const expected_string = '{"id":"1"}';
      expect(resource.__cacheKey({ ['id']: 1 })).toEqual(expected_string);
    });
  });
});

describe('Collection', function () {
  let resource, params, data, collection, response;
  beforeEach(function () {
    resource = new Resources.Resource({ name: 'test' });
    resource._client = jest.fn();
    Object.defineProperty(resource, 'client', {
      get: () => resource._client,
      set: fn => {
        resource._client = fn;
      },
    });
    resource.logError = jest.fn();
    params = {};
    data = [{ test: 'test', id: 'testing' }];
    collection = new Resources.Collection(params, data, resource);
  });
  afterEach(function () {
    resource = undefined;
    collection = undefined;
  });
  it('should initialize with the correct properties', () => {
    expect(resource).toEqual(collection.resource);
    expect(params).toEqual(collection.getParams);
    expect(collection.models).toHaveLength(1);
    expect(Object.keys(collection._model_map)).toHaveLength(1);
    expect(collection.synced).toEqual(false);
    expect(collection.promises).toEqual([]);
  });
  describe('addModel method', function () {
    it('should be called once', function () {
      const addModelFn = resource.addModel;
      const addModelStub = jest.fn().mockImplementation(addModelFn);
      resource.addModel = addModelStub;
      collection = new Resources.Collection(params, data, resource);
      expect(addModelStub).toHaveBeenCalledTimes(2);
    });
  });
  describe('constructor method', function () {
    describe('if resource is undefined', function () {
      it('should throw a TypeError', function () {
        function testCall() {
          new Resources.Collection(params, data);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
    describe('if data is passed in', function () {
      it('should call the set method once', function () {
        const spy = jest.spyOn(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(params, data, resource);
        expect(testCollection).toBeTruthy();
        expect(spy).toHaveBeenCalledTimes(1);
        Resources.Collection.prototype.set.mockRestore();
      });
      it('should call the set method with the data', function () {
        const spy = jest.spyOn(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(params, data, resource);
        expect(testCollection).toBeTruthy();
        expect(spy).toHaveBeenCalledWith(data);
        Resources.Collection.prototype.set.mockRestore();
      });
    });
    describe('if no data is passed in', function () {
      it('should call the set method once', function () {
        const spy = jest.spyOn(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(params, undefined, resource);
        expect(testCollection).toBeTruthy();
        expect(spy).toHaveBeenCalledTimes(1);
        Resources.Collection.prototype.set.mockRestore();
      });
      it('should call the set method with an empty array', function () {
        const spy = jest.spyOn(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(params, undefined, resource);
        expect(testCollection).toBeTruthy();
        expect(spy).toHaveBeenCalledWith([]);
        Resources.Collection.prototype.set.mockRestore();
      });
    });
  });
  describe('clearCache method', function () {
    beforeEach(function () {
      collection.clearCache();
    });
    it('should set models to an empty array', function () {
      expect(collection.models).toEqual([]);
    });
    it('should set _model_map to an empty object', function () {
      expect(collection._model_map).toEqual({});
    });
  });
  describe('fetch method', function () {
    let setSpy, clearCacheSpy, client;
    describe('if called when Collection.synced = true and force is false', function () {
      it('should return current data immediately', function (done) {
        collection.synced = true;
        collection.models[0].attributes = data[0];
        const promise = collection.fetch();
        promise.then(result => {
          expect(result).toEqual(data);
          done();
        });
      });
    });
    describe('if called when Collection.synced = false', function () {
      describe('and the fetch is successful', function () {
        beforeEach(function () {
          setSpy = jest.spyOn(collection, 'set');
          clearCacheSpy = jest.spyOn(collection, 'clearCache');
          client = jest.fn().mockResolvedValue();
          resource.client = client;
        });
        afterEach(function () {
          collection.set.mockRestore();
        });
        describe('and the returned data is an array', function () {
          beforeEach(function () {
            response = { data: [{ testing: 'testing' }] };
            client = jest.fn().mockResolvedValue(response);
            resource.client = client;
          });
          it('should call the client once', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(client).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call clearCache once', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(clearCacheSpy).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call set once', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(setSpy).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call set with the response data', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(setSpy).toHaveBeenCalledWith(response.data);
              done();
            });
          });
          it('should set synced to true', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.synced).toEqual(true);
              done();
            });
          });
          it('should leave no promises in promises property', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.promises).toEqual([]);
              done();
            });
          });
          it('should set every model synced to true', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              collection.models.forEach(model => {
                expect(model.synced).toEqual(true);
              });
              done();
            });
          });
        });
        describe('and the returned data is paginated', function () {
          beforeEach(function () {
            response = {
              data: {
                results: [{ testing: 'testing' }],
                count: 1,
                next: false,
                previous: false,
              },
            };
            collection.pageSize = 25;
            client = jest.fn().mockResolvedValue(response);
            resource.client = client;
          });
          it('should call the client once', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(client).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call clearCache once', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(clearCacheSpy).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call set once', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(setSpy).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call set with the response data results', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(setSpy).toHaveBeenCalledWith(response.data.results);
              done();
            });
          });
          it('should set synced to true', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.synced).toEqual(true);
              done();
            });
          });
          it('should set every model synced to true', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              collection.models.forEach(model => {
                expect(model.synced).toEqual(true);
              });
              done();
            });
          });
          it('should set the count property to 1', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.data.count).toEqual(1);
              done();
            });
          });
          it('should set the next property to false', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.data.next).toEqual(false);
              done();
            });
          });
          it('should set the previous property to false', function (done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.data.previous).toEqual(false);
              done();
            });
          });
        });
        describe('and the returned data is malformed', function () {
          beforeEach(function () {
            response = {};
            client = jest.fn().mockResolvedValue(response);
            resource.client = client;
          });
          it('should call the client once', function (done) {
            collection.synced = false;
            collection.fetch().catch(() => {
              expect(client).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call resource.logError once', function (done) {
            collection.synced = false;
            collection.fetch().catch(() => {
              expect(resource.logError).toHaveBeenCalledTimes(1);
              done();
            });
          });
        });
      });
      describe('and the fetch is not successful', function () {
        beforeEach(function () {
          response = 'Error';
          client = jest.fn().mockRejectedValue(response);
          resource.client = client;
        });
        it('should call resource.logError once', function (done) {
          collection.synced = false;
          collection.fetch().catch(() => {
            expect(resource.logError).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should return the error', function (done) {
          collection.synced = false;
          collection.fetch().catch(error => {
            expect(error).toEqual(response);
            done();
          });
        });
        it('should leave no promises in promises property', function (done) {
          collection.synced = false;
          collection.fetch().catch(() => {
            expect(collection.promises).toEqual([]);
            done();
          });
        });
      });
    });
    describe('if called with force true and synced is true', function () {
      it('should call the client once', function (done) {
        response = { data: [{ testing: 'testing' }] };
        client = jest.fn().mockResolvedValue(response);
        resource.client = client;
        collection.synced = true;
        collection.fetch({}, true).then(() => {
          expect(client).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });
    describe.skip('if called once', function () {
      it('should add a promise to the promises property', async function () {
        response = { data: [{ testing: 'testing' }] };
        client = jest.fn().mockResolvedValue();
        collection.synced = false;
        const promise = collection.fetch();
        await promise;
        expect(collection.promises).toEqual([promise]);
      });
    });
    describe.skip('if called twice', function () {
      it('should add two promises to the promises property', async function () {
        response = { data: [{ testing: 'testing' }] };
        client = jest.fn().mockResolvedValue();
        collection.synced = false;
        const promise1 = collection.fetch();
        const promise2 = collection.fetch();
        await promise1;
        await promise2;
        expect(collection.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('save method', function () {
    let setSpy, client;
    describe('if called when Collection.new = false', function () {
      it('should reject the promise', async function () {
        collection.new = false;
        try {
          await collection.save();
        } catch (error) {
          expect(error).toEqual('Cannot update collections, only create them');
        }
      });
    });
    describe('if called when Collection.new = true', function () {
      describe('and the save is successful', function () {
        beforeEach(function () {
          setSpy = jest.spyOn(collection, 'set');
          jest.spyOn(collection, 'clearCache');
          client = jest.fn().mockResolvedValue();
          resource.client = client;
        });
        afterEach(function () {
          collection.set.mockRestore();
        });
        describe('and the returned data is an array', function () {
          beforeEach(function () {
            response = { data: [{ testing: 'testing' }] };
            client = jest.fn().mockResolvedValue(response);
            resource.client = client;
          });
          it('should call the client once', async function () {
            await collection.save();
            expect(client).toHaveBeenCalledTimes(1);
          });
          it('should call set once', async function () {
            await collection.save();
            expect(setSpy).toHaveBeenCalledTimes(1);
          });
          it('should call set with the response data', async function () {
            await collection.save();
            expect(setSpy).toHaveBeenCalledWith(response.data);
          });
          it('should set synced to true', async function () {
            await collection.save();
            expect(collection.synced).toEqual(true);
          });
          it('should leave no promises in promises property', async function () {
            await collection.save();
            expect(collection.promises).toEqual([]);
          });
          it('should set every model synced to true', async function () {
            await collection.save();
            collection.models.forEach(model => {
              expect(model.synced).toEqual(true);
            });
          });
        });
        describe.skip('and the returned data is malformed', function () {
          beforeEach(function () {
            response = {};
            client = jest.fn().mockResolvedValue(response);
            resource.client = client;
          });
          it('should call the client once', async function () {
            collection.synced = false;
            await collection.save();
            expect(client).toHaveBeenCalledTimes(1);
          });
          it('should call logging.debug once', async function () {
            collection.synced = false;
            await collection.save();
            expect(resource.logError).toHaveBeenCalledTimes(1);
          });
        });
      });
      describe('and the save is not successful', function () {
        beforeEach(function () {
          response = 'Error';
          client = jest.fn().mockRejectedValue(response);
          resource.client = client;
        });
        it('should call resource.logError once', function (done) {
          collection.synced = false;
          collection.save().catch(() => {
            expect(resource.logError).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should return the error', function (done) {
          collection.synced = false;
          collection.save().catch(error => {
            expect(error).toEqual(response);
            done();
          });
        });
        it('should leave no promises in promises property', function (done) {
          collection.synced = false;
          collection.save().catch(() => {
            expect(collection.promises).toEqual([]);
            done();
          });
        });
      });
    });
    describe.skip('if called once', function () {
      it('should add a promise to the promises property', async function () {
        response = { data: [{ testing: 'testing' }] };
        client = jest.fn().mockResolvedValue();
        collection.synced = false;
        const promise = await collection.save();
        await promise;
        expect(collection.promises).toEqual([promise]);
      });
    });
    describe.skip('if called twice', function () {
      it('should add two promises to the promises property', async function () {
        response = { data: [{ testing: 'testing' }] };
        client = jest.fn().mockResolvedValue();
        collection.synced = false;
        const promise1 = collection.save();
        const promise2 = collection.save();
        await promise1;
        await promise2;
        expect(collection.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('delete method', function () {
    let client;
    describe('if called when Collection has no getParams', function () {
      it('should reject the promise', function (done) {
        collection.getParams = {};
        const promise = collection.delete();
        promise.catch(error => {
          expect(error).toEqual(
            'Can not delete unfiltered collection (collection without any GET params',
          );
          done();
        });
      });
    });
    describe('if called when Collection has getParams', function () {
      beforeEach(function () {
        collection.getParams = { test: 'testing' };
      });
      describe('and the delete is successful', function () {
        beforeEach(function () {
          resource.removeModel = jest.fn();
          resource.removeCollection = jest.fn();
          jest.spyOn(collection, 'set');
          jest.spyOn(collection, 'clearCache');
          client = jest.fn().mockResolvedValue();
          resource.client = client;
        });
        afterEach(function () {
          collection.set.mockRestore();
        });
        it('should call the client once', function (done) {
          collection.delete().then(() => {
            expect(client).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call the client with the DELETE method', function (done) {
          collection.delete().then(() => {
            expect(client.mock.calls[0][0].method).toEqual('delete');
            done();
          });
        });
        it('should call removeCollection on the resource', function (done) {
          collection.delete().then(() => {
            expect(resource.removeCollection).toHaveBeenCalledWith(collection);
            done();
          });
        });
        it('should leave no promises in promises property', function (done) {
          collection.delete().then(() => {
            expect(collection.promises).toEqual([]);
            done();
          });
        });
        it('should set every model deleted to true', function (done) {
          collection.delete().then(() => {
            collection.models.forEach(model => {
              expect(model.deleted).toEqual(true);
            });
            done();
          });
        });
        it('should call removeModel for every Model in the collection', function (done) {
          collection.delete().then(() => {
            expect(resource.removeCollection).toHaveBeenCalledTimes(collection.models.length);
            done();
          });
        });
      });
      describe('and the delete is not successful', function () {
        beforeEach(function () {
          response = 'Error';
          client = jest.fn();
          client.mockRejectedValue(response);
          resource.client = client;
        });
        it('should call resource.logError once', function (done) {
          collection.synced = false;
          collection.delete().catch(() => {
            expect(resource.logError).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should return the error', function (done) {
          collection.delete().catch(error => {
            expect(error).toEqual(response);
            done();
          });
        });
        it('should leave no promises in promises property', function (done) {
          collection.delete().catch(() => {
            expect(collection.promises).toEqual([]);
            done();
          });
        });
      });
    });
    describe.skip('if called once', function () {
      it('should add a promise to the promises property', async function () {
        response = { data: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue();
        collection.synced = false;
        const promise = collection.delete();
        await promise;
        expect(collection.promises).toEqual([promise]);
      });
    });
    describe.skip('if called twice', function () {
      it('should add two promises to the promises property', async function () {
        response = { data: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue();
        collection.synced = false;
        const promise1 = collection.delete();
        const promise2 = collection.delete();
        await promise1;
        await promise2;
        expect(collection.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('set method', function () {
    let model, setModel;
    beforeEach(function () {
      model = { id: 'test' };
      setModel = new Resources.Model(model, {}, resource);
    });
    describe('for a single model', function () {
      it('should add an entry to the models property', function () {
        collection.models = [];
        collection.set(model);
        expect(collection.models).toEqual([setModel]);
      });
      it('should add an entry to the _model_map property', function () {
        collection._model_map = {};
        collection.set(model);
        expect(collection._model_map).toEqual({
          [model.id]: setModel,
        });
      });
    });
    describe('for an array of models', function () {
      it('should add them to the models property', function () {
        collection.models = [];
        collection.set([model]);
        expect(collection.models).toEqual([setModel]);
      });
      it('should add them to the _model_map property', function () {
        collection._model_map = {};
        collection.set([model]);
        expect(collection._model_map).toEqual({
          [model.id]: setModel,
        });
      });
      it('should add only one entry per id to the models property', function () {
        collection.models = [];
        collection.set([model, model]);
        expect(collection.models).toEqual([setModel]);
      });
      it('should add only one entry per id to the _model_map property', function () {
        collection._model_map = {};
        collection.set([model, model]);
        expect(collection._model_map).toEqual({
          [model.id]: setModel,
        });
      });
      describe('that have no ids', function () {
        it('should not overwrite each other in the model cache', function () {
          const idLessModel1 = { test: 'testing' };
          const idLessModel2 = { test: 'testing1' };
          collection._model_map = {};
          collection.models = [];
          collection.set([idLessModel1, idLessModel2]);
          expect(collection.models).toHaveLength(2);
        });
      });
    });
  });
});

describe('Model', function () {
  let resource, model, data, payload, client, setSpy;
  beforeEach(function () {
    resource = {
      modelUrl: () => 'modelUrl',
      collectionUrl: () => 'collectionUrl',
      idKey: 'id',
      client: () => Promise.resolve({ data: {} }),
      removeModel: () => {},
      logError: jest.fn(),
    };
    data = { test: 'test', id: 'testing' };
    model = new Resources.Model(data, {}, resource);
  });
  afterEach(function () {
    resource = undefined;
    model = undefined;
  });
  it('initializes with the correct properties', () => {
    expect(resource).toEqual(model.resource);
    expect(model.attributes).toEqual(data);
    expect(model.synced).toEqual(false);
    expect(model.promises).toEqual([]);
    expect(model.getParams).toEqual({});
  });

  describe('constructor method', function () {
    describe('if resource is undefined', function () {
      it('should throw a TypeError', function () {
        function testCall() {
          new Resources.Model(data);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
    describe('if data is passed in', function () {
      it('should call the set method once', function () {
        const spy = jest.spyOn(Resources.Model.prototype, 'set');
        const testModel = new Resources.Model(data, {}, resource);
        expect(testModel).toBeTruthy();
        expect(spy).toHaveBeenCalledTimes(1);
        Resources.Model.prototype.set.mockRestore();
      });
      it('should call the set method with the data', function () {
        const spy = jest.spyOn(Resources.Model.prototype, 'set');
        const testModel = new Resources.Model(data, {}, resource);
        expect(testModel).toBeTruthy();
        expect(spy).toHaveBeenCalledWith(data);
        Resources.Model.prototype.set.mockRestore();
      });
    });
    describe('if undefined data is passed in', function () {
      it('should throw a TypeError', function () {
        function testCall() {
          new Resources.Model(undefined, {}, resource);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
    describe('if null data is passed in', function () {
      it('should throw a TypeError', function () {
        function testCall() {
          new Resources.Model(null, {}, resource);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
    describe('if no data is passed in', function () {
      it('should throw a TypeError', function () {
        function testCall() {
          new Resources.Model({}, {}, resource);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
  });
  describe('fetch method', function () {
    let response, client, setSpy;
    describe('if called when Model.synced = true and force is false', function () {
      it('should return current data immediately', async function () {
        model.synced = true;
        const result = await model.fetch();
        expect(result).toEqual(data);
      });
    });
    describe('if called when Model.synced = false', function () {
      describe('and the fetch is successful', function () {
        beforeEach(function () {
          setSpy = jest.spyOn(model, 'set');
          response = { data: { testing: 'testing' } };
          client = jest.fn().mockResolvedValue(response);
          resource.client = client;
        });
        afterEach(function () {
          model.set.mockRestore();
        });
        it('should call the client once', async function () {
          model.synced = false;
          await model.fetch();
          expect(client).toHaveBeenCalledTimes(1);
        });
        it('should call set once', function (done) {
          model.synced = false;
          model.fetch().then(() => {
            expect(setSpy).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call set with the response data', function (done) {
          model.synced = false;
          model.fetch().then(() => {
            expect(setSpy).toHaveBeenCalledWith(response.data);
            done();
          });
        });
        it('should set synced to true', function (done) {
          model.synced = false;
          model.fetch().then(() => {
            expect(model.synced).toEqual(true);
            done();
          });
        });
        it('should set new to false', function (done) {
          model.new = true;
          model.fetch().then(() => {
            expect(model.new).toEqual(false);
            done();
          });
        });
        it('should leave no promises in promises property', function (done) {
          model.synced = false;
          model.fetch().then(() => {
            expect(model.promises).toEqual([]);
            done();
          });
        });
      });
      describe('and the fetch is not successful', function () {
        beforeEach(function () {
          response = 'Error';
          client = jest.fn();
          client.mockRejectedValue(response);
          resource.client = client;
        });
        it('should call resource.logError once', function (done) {
          model.synced = false;
          model.fetch().catch(() => {
            expect(resource.logError).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should return the error', function (done) {
          model.synced = false;
          model.fetch().catch(error => {
            expect(error).toEqual(response);
            done();
          });
        });
        it('should leave no promises in promises property', function (done) {
          model.synced = false;
          model.fetch().catch(() => {
            expect(model.promises).toEqual([]);
            done();
          });
        });
      });
    });
    describe('if called with force true and synced is true', function () {
      it('should call the client once', function (done) {
        response = { data: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue(response);
        resource.client = client;
        model.synced = true;
        model.fetch({}, true).then(() => {
          expect(client).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });
    describe.skip('if called once', function () {
      it('should add a promise to the promises property', async function () {
        response = { data: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue();
        resource.client = client;
        model.synced = false;
        const promise = model.fetch();
        await promise;
        expect(model.promises).toEqual([promise]);
      });
    });
    describe.skip('if called twice', function () {
      it('should add two promises to the promises property', async function () {
        response = { data: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue();
        resource.client = client;
        model.synced = false;
        const promise1 = model.fetch();
        const promise2 = model.fetch();
        await promise1;
        await promise2;
        expect(model.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('save method', function () {
    describe('if called when Model.synced = true and no attrs are different', function () {
      it('should return current data immediately', function (done) {
        model.synced = true;
        const promise = model.save(model.attributes);
        promise.then(result => {
          expect(result).toEqual(data);
          done();
        });
      });
    });
    describe('if called when Model.synced = true and attrs are different', function () {
      it('should should call the client once', function (done) {
        model.synced = true;
        const payload = { somethingNew: 'new' };
        const data = {};
        Object.assign(data, model.attributes, payload);
        const response = { data };
        const client = jest.fn();
        client.mockResolvedValue(response);
        resource.client = client;
        model.save(payload).then(() => {
          expect(client).toHaveBeenCalledTimes(1);
          done();
        });
      });
      it('should should call set once with the changed attributes', function (done) {
        model.synced = true;
        const payload = { somethingNew: 'new' };
        const data = {};
        Object.assign(data, model.attributes, payload);
        const response = { data };
        const client = jest.fn();
        client.mockResolvedValue(response);
        resource.client = client;
        model.save(payload).then(() => {
          expect(model.attributes.somethingNew).toEqual('new');
          done();
        });
      });
    });
    describe('if called when Model.synced = false', function () {
      let payload, client, response;
      describe('and the save is successful', function () {
        beforeEach(function () {
          setSpy = jest.spyOn(model, 'set');
          payload = { somethingNew: 'new' };
          response = { data: payload };
          client = jest.fn();
          client.mockResolvedValue(response);
          resource.client = client;
        });
        afterEach(function () {
          model.set.mockRestore();
        });
        it('should call the client once', function (done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(client).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call set once', function (done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(setSpy).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call set with the response data', function (done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(setSpy).toHaveBeenCalledWith(response.data);
            done();
          });
        });
        it('should set synced to true', function (done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(model.synced).toEqual(true);
            done();
          });
        });
        it('should leave no promises in promises property', function (done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(model.promises).toEqual([]);
            done();
          });
        });
      });
      describe('and the model has new set to true', function () {
        beforeEach(function () {
          setSpy = jest.spyOn(model, 'set');
          payload = { somethingNew: 'new' };
          response = { data: payload };
          client = jest.fn();
          client.mockResolvedValue(response);
          resource.client = client;
        });
        afterEach(function () {
          model.set.mockRestore();
        });
        it('should call the client once', function (done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(client).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call the client with no explicit method', function (done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(client.mock.calls[0]['method']).toBeUndefined();
            done();
          });
        });
        it('should call the client with the collection url', function (done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(client.mock.calls[0][0]['url']).toEqual(resource.collectionUrl());
            done();
          });
        });
      });
      describe('and the save is not successful', function () {
        beforeEach(function () {
          response = 'Error';
          client = jest.fn();
          client.mockRejectedValue(response);
          resource.client = client;
        });
        it('should call resource.logError once', function (done) {
          model.synced = false;
          model.save().catch(() => {
            expect(resource.logError).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should return the error', function (done) {
          model.synced = false;
          model.save().catch(error => {
            expect(error).toEqual(response);
            done();
          });
        });
        it('should leave no promises in promises property', function (done) {
          model.synced = false;
          model.save().catch(() => {
            expect(model.promises).toEqual([]);
            done();
          });
        });
        it('should not set data on the model', function (done) {
          model.synced = false;
          model.attributes.test = 'notatest';
          model.save({ test: 'test' }).catch(() => {
            expect(model.attributes.test).toEqual('notatest');
            done();
          });
        });
      });
      describe('and model has no id', function () {
        it('should call the client with no explicit method', function (done) {
          payload = { somethingNew: 'new' };
          response = { data: payload };
          client = jest.fn();
          client.mockResolvedValue(response);
          resource.client = client;
          resource.collectionUrl = () => '';
          model = new Resources.Model(payload, {}, resource);
          model.synced = false;
          model.save(payload).then(() => {
            expect(typeof client.mock.calls[0].method).toEqual('undefined');
            done();
          });
        });
        describe('but returns with an id', function () {
          it('should call the resource addModel method', function (done) {
            payload = { somethingNew: 'new' };
            response = { data: { id: 'test' } };
            client = jest.fn();
            client.mockResolvedValue(response);
            resource.client = client;
            resource.collectionUrl = () => '';
            model = new Resources.Model(payload, {}, resource);
            model.synced = false;
            resource.addModel = jest.fn();
            model.save(payload).then(() => {
              expect(resource.addModel).toHaveBeenCalledWith(model, {});
              done();
            });
          });
        });
      });
      describe('and model is not new', function () {
        it('should call the client with a PATCH method', function (done) {
          payload = { somethingNew: 'new' };
          response = { data: payload };
          client = jest.fn();
          client.mockResolvedValue(response);
          resource.client = client;
          model.synced = false;
          model.new = false;
          model.save(payload).then(() => {
            expect(client.mock.calls[0][0].method).toEqual('patch');
            done();
          });
        });
      });
    });
    describe('if called once', function () {
      it('should add a promise to the promises property', function () {
        client = jest.fn();
        client.mockResolvedValue();
        model.synced = false;
        const promise = model.save({});
        expect(model.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function () {
      it('should add two promises to the promises property', function () {
        client = jest.fn();
        client.mockResolvedValue();
        model.synced = false;
        const promise1 = model.save({});
        const promise2 = model.save({});
        expect(model.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('delete method', function () {
    let response, client;
    describe('if called when it has an id', function () {
      describe('and the delete is successful', function () {
        beforeEach(function () {
          resource.removeModel = jest.fn();
          response = { data: { testing: 'testing' } };
          client = jest.fn();
          client.mockResolvedValue(response);
          resource.client = client;
        });
        it('should call the client once', function (done) {
          model.delete().then(() => {
            expect(client).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call the client with the DELETE method', function (done) {
          model.delete().then(() => {
            expect(client.mock.calls[0][0].method).toEqual('delete');
            done();
          });
        });
        it('should call removeModel on the resource', function (done) {
          model.delete().then(() => {
            expect(resource.removeModel).toHaveBeenCalledWith(model);
            done();
          });
        });
        it('should resolve the id of the model', function (done) {
          model.delete().then(id => {
            expect(model.id).toEqual(id);
            done();
          });
        });
        it('should leave no promises in promises property', function (done) {
          model.delete().then(() => {
            expect(model.promises).toEqual([]);
            done();
          });
        });
      });
      describe('and the delete is not successful', function () {
        beforeEach(function () {
          response = 'Error';
          client = jest.fn();
          client.mockRejectedValue(response);
          resource.client = client;
        });
        it('should call resource.logError once', function (done) {
          model.delete().catch(() => {
            expect(resource.logError).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should return the error', function (done) {
          model.delete().catch(error => {
            expect(error).toEqual(response);
            done();
          });
        });
        it('should leave no promises in promises property', function (done) {
          model.delete().catch(() => {
            expect(model.promises).toEqual([]);
            done();
          });
        });
      });
    });
    describe('if called when model has no id', function () {
      it('should reject the deletion', function (done) {
        payload = { somethingNew: 'new' };
        response = {};
        client = jest.fn().mockResolvedValue(response);
        resource.client = client;
        model = new Resources.Model(payload, {}, resource);
        model.delete().catch(error => {
          expect(error).toBeTruthy();
          done();
        });
      });
    });
    describe('if called once', function () {
      it('should add a promise to the promises property', function () {
        response = { data: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue();
        const promise = model.delete();
        expect(model.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function () {
      it('should add two promises to the promises property', function () {
        response = { data: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue();
        const promise1 = model.delete();
        const promise2 = model.delete();
        expect(model.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('set method', function () {
    it('should add new attributes', function () {
      model.set({ new: 'new' });
      expect(model.attributes.new).toEqual('new');
    });
    it('should overwrite previous attributes', function () {
      model.attributes.new = 'old';
      model.set({ new: 'new' });
      expect(model.attributes.new).toEqual('new');
    });
    it('should coerce and id to a string', function () {
      model.set({ id: 123 });
      expect(model.attributes.id).toEqual('123');
    });
  });
});

describe('Resource REST methods', function () {
  let resource, client;

  beforeEach(function () {
    resource = new Resources.Resource({ name: 'test' });
    client = jest.fn().mockResolvedValue({ data: {} });
    resource.client = client;
    resource.getUrlFunction = jest.fn(action =>
      action === 'missing' ? undefined : urlFunctionFor(action),
    );
  });

  describe('request method', function () {
    it('should resolve the URL from the action and named route params', async function () {
      await resource.request({ action: 'detail', routeParams: { pk: 'abc' } });
      expect(client).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/detail/abc' }));
    });

    it('should spread array route params as positional arguments', async function () {
      await resource.request({ action: 'nested', routeParams: ['session', 'unit'] });
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/api/nested/session/unit' }),
      );
    });

    it('should pass a scalar route param as a single positional argument', async function () {
      await resource.request({ action: 'detail', routeParams: 'abc' });
      expect(client).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/detail/abc' }));
    });

    it('should resolve a URL with no route params', async function () {
      await resource.request({ action: 'list' });
      expect(client).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/list/' }));
    });

    it('should throw when no URL is registered for the action', function () {
      expect(() => resource.request({ action: 'missing' })).toThrow(ReferenceError);
    });

    it('should send query params and no body for a GET', async function () {
      await resource.request({ params: { queue: 'content' } });
      expect(client).toHaveBeenCalledWith({
        url: '/api/list/',
        method: 'GET',
        params: { queue: 'content' },
      });
    });

    it('should send a body for a write', async function () {
      await resource.request({ method: 'POST', data: { name: 'test' } });
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST', data: { name: 'test' } }),
      );
    });

    it('should forward the multipart flag for a write', async function () {
      await resource.request({ method: 'POST', data: {}, multipart: true });
      expect(client).toHaveBeenCalledWith(expect.objectContaining({ multipart: true }));
    });
  });

  describe('request de-duplication', function () {
    it('should share a single in-flight request between identical concurrent GETs', async function () {
      const { promise, resolve } = deferred();
      client.mockReturnValue(promise);

      const first = resource.request({ params: { queue: 'content' } });
      const second = resource.request({ params: { queue: 'content' } });

      expect(client).toHaveBeenCalledTimes(1);
      resolve({ data: [{ id: 'task' }] });
      const [firstResponse, secondResponse] = await Promise.all([first, second]);
      expect(firstResponse).toEqual(secondResponse);
    });

    it('should ignore query param ordering when matching in-flight requests', async function () {
      const { promise, resolve } = deferred();
      client.mockReturnValue(promise);

      const first = resource.request({ params: { a: 1, b: 2 } });
      const second = resource.request({ params: { b: 2, a: 1 } });

      expect(client).toHaveBeenCalledTimes(1);
      resolve({ data: [] });
      await Promise.all([first, second]);
    });

    it('should not de-duplicate GETs with different query params', async function () {
      const { promise, resolve } = deferred();
      client.mockReturnValue(promise);

      const requests = Promise.all([
        resource.request({ params: { queue: 'content' } }),
        resource.request({ params: { queue: 'facility' } }),
      ]);

      expect(client).toHaveBeenCalledTimes(2);
      resolve({ data: [] });
      await requests;
    });

    it('should not de-duplicate GETs against different URLs', async function () {
      const { promise, resolve } = deferred();
      client.mockReturnValue(promise);

      const requests = Promise.all([
        resource.request({ action: 'detail', routeParams: 'one' }),
        resource.request({ action: 'detail', routeParams: 'two' }),
      ]);

      expect(client).toHaveBeenCalledTimes(2);
      resolve({ data: {} });
      await requests;
    });

    it('should not de-duplicate writes', async function () {
      const { promise, resolve } = deferred();
      client.mockReturnValue(promise);

      const requests = Promise.all([
        resource.request({ method: 'POST', data: { name: 'test' } }),
        resource.request({ method: 'POST', data: { name: 'test' } }),
      ]);

      expect(client).toHaveBeenCalledTimes(2);
      resolve({ data: {} });
      await requests;
    });

    it('should fire a new request once the previous one has resolved', async function () {
      await resource.request({ params: { queue: 'content' } });
      await resource.request({ params: { queue: 'content' } });
      expect(client).toHaveBeenCalledTimes(2);
    });

    it('should fire a new request once the previous one has failed', async function () {
      client.mockRejectedValue(new Error('nope'));
      await expect(resource.request({ params: { queue: 'content' } })).rejects.toThrow();
      await expect(resource.request({ params: { queue: 'content' } })).rejects.toThrow();
      expect(client).toHaveBeenCalledTimes(2);
    });
  });

  describe('retrieve method', function () {
    it('should GET the detail URL and resolve with the response data', async function () {
      client.mockResolvedValue({ data: { id: 'abc', name: 'test' } });
      const data = await resource.retrieve('abc');
      expect(client).toHaveBeenCalledWith({
        url: '/api/detail/abc',
        method: 'GET',
        params: undefined,
      });
      expect(data).toEqual({ id: 'abc', name: 'test' });
    });

    it('should pass query params through', async function () {
      await resource.retrieve('abc', { params: { fields: 'name' } });
      expect(client).toHaveBeenCalledWith(expect.objectContaining({ params: { fields: 'name' } }));
    });

    it('should reject if no id is specified', async function () {
      await expect(resource.retrieve()).rejects.toThrow(TypeError);
    });
  });

  describe('list method', function () {
    it('should resolve with an array from an unpaginated endpoint', async function () {
      client.mockResolvedValue({ data: [{ id: 'one' }, { id: 'two' }] });
      const data = await resource.list();
      expect(data).toEqual([{ id: 'one' }, { id: 'two' }]);
    });

    it('should resolve with the pagination object from a paginated endpoint', async function () {
      const paginated = { results: [{ id: 'one' }], more: { offset: 25 }, count: 90 };
      client.mockResolvedValue({ data: paginated });
      const data = await resource.list();
      expect(data).toEqual(paginated);
    });

    it('should pass query params through', async function () {
      client.mockResolvedValue({ data: [] });
      await resource.list({ queue: 'content' });
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/api/list/', params: { queue: 'content' } }),
      );
    });
  });

  describe('create method', function () {
    it('should POST the data and resolve with the created object', async function () {
      client.mockResolvedValue({ data: { id: 'abc', name: 'test' } });
      const data = await resource.create({ name: 'test' });
      expect(client).toHaveBeenCalledWith({
        url: '/api/list/',
        method: 'POST',
        params: undefined,
        data: { name: 'test' },
        multipart: false,
      });
      expect(data).toEqual({ id: 'abc', name: 'test' });
    });

    it('should forward the multipart flag', async function () {
      await resource.create({ name: 'test' }, { multipart: true });
      expect(client).toHaveBeenCalledWith(expect.objectContaining({ multipart: true }));
    });
  });

  describe('update method', function () {
    it('should PATCH the given fields as-is when there is no baseline', async function () {
      client.mockResolvedValue({ data: { id: 'abc', name: 'new' } });
      const data = await resource.update('abc', { name: 'new' });
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/detail/abc',
          method: 'PATCH',
          data: { name: 'new' },
        }),
      );
      expect(data).toEqual({ id: 'abc', name: 'new' });
    });

    it('should PATCH only the changed fields when a baseline is known', async function () {
      client.mockResolvedValue({ data: { id: 'abc', name: 'old', description: 'same' } });
      await resource.retrieve('abc');

      client.mockClear();
      client.mockResolvedValue({ data: { id: 'abc', name: 'new', description: 'same' } });
      await resource.update('abc', { name: 'new', description: 'same' });

      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PATCH', data: { name: 'new' } }),
      );
    });

    it('should not make a request when nothing has changed', async function () {
      const object = { id: 'abc', name: 'old' };
      client.mockResolvedValue({ data: object });
      await resource.retrieve('abc');

      client.mockClear();
      const data = await resource.update('abc', { name: 'old' });

      expect(client).not.toHaveBeenCalled();
      expect(data).toEqual(object);
    });

    it('should refresh the baseline from the update response', async function () {
      client.mockResolvedValue({ data: { id: 'abc', name: 'old' } });
      await resource.retrieve('abc');

      client.mockResolvedValue({ data: { id: 'abc', name: 'new' } });
      await resource.update('abc', { name: 'new' });

      client.mockClear();
      await resource.update('abc', { name: 'new' });

      expect(client).not.toHaveBeenCalled();
    });

    it('should diff against a baseline recorded by list', async function () {
      client.mockResolvedValue({ data: [{ id: 'abc', name: 'old', description: 'same' }] });
      await resource.list();

      client.mockClear();
      client.mockResolvedValue({ data: { id: 'abc', name: 'new', description: 'same' } });
      await resource.update('abc', { name: 'new', description: 'same' });

      expect(client).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'new' } }));
    });

    it('should diff against a baseline recorded from a paginated list', async function () {
      client.mockResolvedValue({
        data: { results: [{ id: 'abc', name: 'old' }], more: null, count: 1 },
      });
      await resource.list();

      client.mockClear();
      await resource.update('abc', { name: 'old' });

      expect(client).not.toHaveBeenCalled();
    });

    it('should reject if no id is specified', async function () {
      await expect(resource.update()).rejects.toThrow(TypeError);
    });
  });

  describe('delete method', function () {
    it('should DELETE the detail URL and resolve with the id', async function () {
      const id = await resource.delete('abc');
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/api/detail/abc', method: 'DELETE' }),
      );
      expect(id).toEqual('abc');
    });

    it('should discard the baseline for the deleted object', async function () {
      client.mockResolvedValue({ data: { id: 'abc', name: 'old' } });
      await resource.retrieve('abc');
      await resource.delete('abc');

      client.mockClear();
      await resource.update('abc', { name: 'old' });

      // With no baseline left, the fields are sent as-is rather than diffed away.
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PATCH', data: { name: 'old' } }),
      );
    });

    it('should reject if no id is specified', async function () {
      await expect(resource.delete()).rejects.toThrow(TypeError);
    });
  });

  describe('bulkCreate method', function () {
    it('should POST the array and resolve with the created objects', async function () {
      const created = [{ id: 'one' }, { id: 'two' }];
      client.mockResolvedValue({ data: created });
      const data = await resource.bulkCreate([{ name: 'one' }, { name: 'two' }]);
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/list/',
          method: 'POST',
          data: [{ name: 'one' }, { name: 'two' }],
        }),
      );
      expect(data).toEqual(created);
    });

    it('should reject if not given an array', async function () {
      await expect(resource.bulkCreate({ name: 'one' })).rejects.toThrow(TypeError);
    });
  });

  describe('bulkDelete method', function () {
    it('should DELETE with the given query params', async function () {
      await resource.bulkDelete({ collection: 'abc' });
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/list/',
          method: 'DELETE',
          params: { collection: 'abc' },
        }),
      );
    });

    it('should reject if no params are specified, to prevent an unfiltered delete', async function () {
      await expect(resource.bulkDelete()).rejects.toThrow(TypeError);
      await expect(resource.bulkDelete({})).rejects.toThrow(TypeError);
    });
  });
});

describe('Resource.useRetrieve', () => {
  let resource;

  beforeEach(() => {
    resource = new Resources.Resource({ name: 'test' });
    resource.retrieve = jest.fn().mockResolvedValue({ id: 'abc', name: 'test' });
  });

  it('should not fetch until fetchData is called', () => {
    const { data, loading } = resource.useRetrieve('abc');

    expect(resource.retrieve).not.toHaveBeenCalled();
    expect(data.value).toBe(null);
    expect(loading.value).toBe(false);
  });

  it('should retrieve the object by id and expose it as data', async () => {
    const { data, fetchData } = resource.useRetrieve('abc');

    await fetchData();

    expect(resource.retrieve).toHaveBeenCalledWith('abc', undefined);
    expect(data.value).toEqual({ id: 'abc', name: 'test' });
  });

  it('should pass options through to retrieve', async () => {
    const { fetchData } = resource.useRetrieve('abc', { params: { fields: 'name' } });

    await fetchData();

    expect(resource.retrieve).toHaveBeenCalledWith('abc', { params: { fields: 'name' } });
  });

  it('should read the current value of a ref id at fetch time', async () => {
    const id = ref('abc');
    const { fetchData } = resource.useRetrieve(id);

    await fetchData();
    expect(resource.retrieve).toHaveBeenLastCalledWith('abc', undefined);

    id.value = 'def';
    await fetchData();
    expect(resource.retrieve).toHaveBeenLastCalledWith('def', undefined);
  });

  it('should read the current value of a getter id at fetch time', async () => {
    let id = 'abc';
    const { fetchData } = resource.useRetrieve(() => id);

    await fetchData();
    expect(resource.retrieve).toHaveBeenLastCalledWith('abc', undefined);

    id = 'def';
    await fetchData();
    expect(resource.retrieve).toHaveBeenLastCalledWith('def', undefined);
  });

  it('should expose a failure as error', async () => {
    const failure = new Error('nope');
    resource.retrieve.mockRejectedValue(failure);
    const { data, error, fetchData } = resource.useRetrieve('abc');

    await fetchData();

    expect(error.value).toBe(failure);
    expect(data.value).toBe(null);
  });
});

describe('Resource.useList', () => {
  let resource;

  beforeEach(() => {
    resource = new Resources.Resource({ name: 'test' });
    resource.list = jest.fn().mockResolvedValue([{ id: 'one' }, { id: 'two' }]);
  });

  it('should not fetch until fetchData is called', () => {
    const { data, loading } = resource.useList();

    expect(resource.list).not.toHaveBeenCalled();
    expect(data.value).toBe(null);
    expect(loading.value).toBe(false);
  });

  it('should expose an unpaginated array response as data', async () => {
    const { data, hasMore, fetchData } = resource.useList();

    await fetchData();

    expect(resource.list).toHaveBeenCalledWith(undefined);
    expect(data.value).toEqual([{ id: 'one' }, { id: 'two' }]);
    expect(hasMore.value).toBe(false);
  });

  it('should pass params through to list', async () => {
    const params = { member_of: 'facility' };
    const { fetchData } = resource.useList(params);

    await fetchData();

    expect(resource.list).toHaveBeenCalledWith(params);
  });

  it('should read the current value of ref params at fetch time', async () => {
    const params = ref({ member_of: 'one' });
    const { fetchData } = resource.useList(params);

    await fetchData();
    expect(resource.list).toHaveBeenLastCalledWith({ member_of: 'one' });

    params.value = { member_of: 'two' };
    await fetchData();
    expect(resource.list).toHaveBeenLastCalledWith({ member_of: 'two' });
  });

  describe('pagination', () => {
    beforeEach(() => {
      resource.list = jest.fn().mockResolvedValue({
        results: [{ id: 'one' }],
        more: { limit: 1, offset: 1 },
        count: 2,
      });
    });

    it('should expose the results, count and hasMore of a paginated response', async () => {
      const { data, count, hasMore, fetchData } = resource.useList();

      await fetchData();

      expect(data.value).toEqual([{ id: 'one' }]);
      expect(count.value).toBe(2);
      expect(hasMore.value).toBe(true);
    });

    it('should fetch the next page using the servers more params and append the results', async () => {
      const { data, hasMore, fetchData, fetchMore } = resource.useList({ limit: 1 });

      await fetchData();

      resource.list.mockResolvedValue({ results: [{ id: 'two' }], more: null, count: 2 });
      await fetchMore();

      expect(resource.list).toHaveBeenLastCalledWith({ limit: 1, offset: 1 });
      expect(data.value).toEqual([{ id: 'one' }, { id: 'two' }]);
      expect(hasMore.value).toBe(false);
    });

    it('should not fetch more when there is no more data', async () => {
      resource.list.mockResolvedValue({ results: [{ id: 'one' }], more: null, count: 1 });
      const { hasMore, fetchData, fetchMore } = resource.useList();

      await fetchData();
      resource.list.mockClear();
      await fetchMore();

      expect(hasMore.value).toBe(false);
      expect(resource.list).not.toHaveBeenCalled();
    });
  });
});
