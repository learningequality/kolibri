import * as Resources from '../src/api-resource';

jest.mock('kolibri.urls');

describe('Resource', function() {
  let resource, modelData;
  const testName = 'test';
  beforeEach(function() {
    resource = new Resources.Resource({ name: testName });
    modelData = { id: 'test' };
  });
  afterEach(function() {
    resource = undefined;
  });
  describe('collections property', function() {
    it('should be empty object', function() {
      expect(resource.collections).toEqual({});
    });
  });
  describe('models property', function() {
    it('should be empty object', function() {
      expect(resource.models).toEqual({});
    });
  });
  describe('idKey property', function() {
    it('should be "id" by default', function() {
      expect(resource.idKey).toEqual('id');
    });
  });
  describe('name property', function() {
    it('should return the kolibri: plus the namespace, plus the passed in name property of the Resource', function() {
      expect(resource.name).toEqual(`kolibri:core:${testName}`);
    });
  });
  describe('getModel method', function() {
    it('should return a model instance', function() {
      expect(resource.getModel('test')).toBeInstanceOf(Resources.Model);
    });
    it('should return an existing model from the cache', function() {
      const testModel = new Resources.Model(modelData, {}, resource);
      resource.addModel(testModel);
      expect(resource.getModel('test')).toEqual(testModel);
    });
    it('should call create model if the model is not in the cache', function() {
      const spy = jest.spyOn(resource, 'createModel');
      resource.getModel('test');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
  describe('createModel method', function() {
    it('should return a model instance', function() {
      expect(resource.createModel(modelData)).toBeInstanceOf(Resources.Model);
    });
    it('should call add model', function() {
      const spy = jest.spyOn(resource, 'addModel');
      resource.createModel(modelData);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
  describe('addModel method', function() {
    it('should return a model instance', function() {
      expect(resource.addModel(modelData)).toBeInstanceOf(Resources.Model);
    });
    it('should call createModel if passed an object', function() {
      const spy = jest.spyOn(resource, 'createModel');
      resource.addModel(modelData);
      expect(spy).toHaveBeenCalledTimes(1);
    });
    it('should not call createModel if passed a Model', function() {
      const spy = jest.spyOn(resource, 'createModel');
      resource.addModel(new Resources.Model(modelData, {}, resource));
      expect(spy).not.toHaveBeenCalled();
    });
    it('should add a model to the cache if no id', function() {
      resource.addModel(new Resources.Model({ data: 'data' }, {}, resource));
      expect(Object.keys(resource.models)).toHaveLength(1);
    });
    it('should not return the added model from the cache if no id', function() {
      resource.addModel(new Resources.Model({ data: 'data' }, {}, resource));
      const model = resource.getModel(undefined);
      expect(model.attributes.data).toBeUndefined();
    });
    it('should add a model to the cache if it has an id', function() {
      const model = resource.addModel(new Resources.Model({ id: 'test' }, {}, resource));
      expect(resource.models['default'][Object.keys(resource.models['default'])[0]]).toEqual(model);
    });
    it('should update the model in the cache if a model with matching id is found', function() {
      const model = new Resources.Model({ id: 'test' }, {}, resource);
      resource.addModel(model);
      resource.addModel(new Resources.Model({ id: 'test', example: 'prop' }, {}, resource));
      expect(Object.keys(resource.models)).toHaveLength(1);
      expect(model.attributes.example).toEqual('prop');
    });
  });
  describe('removeModel method', function() {
    it('should remove model from model cache', function() {
      const model = new Resources.Model({ id: 'test' }, {}, resource);
      resource.addModel(model);
      resource.removeModel(model);
      expect(resource.models['default']).toEqual({});
    });
  });
  describe('unCacheModel method', function() {
    it('should set the synced property of the model to false', function() {
      const id = 'test';
      resource.addModel({ id });
      resource.unCacheModel(id);
      expect(resource.getModel(id).synced).toEqual(false);
    });
  });
  describe('clearCache method', function() {
    it('should set the models property of the Resource to an empty object', function() {
      const id = 'test';
      resource.models[id] = {};
      resource.clearCache();
      expect(resource.models).toEqual({});
    });
    it('should set the collections property of the Resource to an empty object', function() {
      const id = 'test';
      resource.collections[id] = {};
      resource.clearCache();
      expect(resource.collections).toEqual({});
    });
  });
  describe('getCollection method', function() {
    it('should return a collection instance', function() {
      expect(resource.getCollection({})).toBeInstanceOf(Resources.Collection);
    });
    it('should return an existing collection from the cache', function() {
      const testCollection = new Resources.Collection({}, [], resource);
      resource.collections['{}'] = testCollection;
      expect(resource.getCollection({})).toEqual(testCollection);
    });
    it('should call create collection if the collection is not in the cache', function() {
      const spy = jest.spyOn(resource, 'createCollection');
      resource.getCollection({});
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
  describe('createCollection method', function() {
    it('should return a collection instance', function() {
      expect(resource.createCollection({})).toBeInstanceOf(Resources.Collection);
    });
    it('should add the collection to the cache', function() {
      resource.createCollection({});
      expect(Object.keys(resource.collections)).toHaveLength(1);
    });
  });
  describe('__cacheKey method', function() {
    it('should return integer to string instance', function() {
      const expected_string = '{"id":"1"}';
      expect(resource.__cacheKey({ ['id']: 1 })).toEqual(expected_string);
    });
  });
});

describe('Collection', function() {
  let resource, params, data, collection, response;
  beforeEach(function() {
    resource = new Resources.Resource({ name: 'test' });
    resource._client = jest.fn();
    Object.defineProperty(resource, 'client', {
      get: () => resource._client,
      set: fn => {
        resource._client = fn;
      },
    });
    params = {};
    data = [{ test: 'test', id: 'testing' }];
    collection = new Resources.Collection(params, data, resource);
  });
  afterEach(function() {
    resource = undefined;
    collection = undefined;
  });
  describe('constructor set properties:', function() {
    describe('resource property', function() {
      it('should be the passed in resource', function() {
        expect(resource).toEqual(collection.resource);
      });
    });
    describe('getParams property', function() {
      it('should be the passed in params', function() {
        expect(params).toEqual(collection.getParams);
      });
    });
    describe('models property', function() {
      it('should be an array of length 1', function() {
        expect(collection.models).toHaveLength(1);
      });
    });
    describe('_model_map property', function() {
      it('should have one entry', function() {
        expect(Object.keys(collection._model_map)).toHaveLength(1);
      });
    });
    describe('synced property', function() {
      it('should be false', function() {
        expect(collection.synced).toEqual(false);
      });
    });
    describe('promises property', function() {
      it('should be an empty array', function() {
        expect(collection.promises).toEqual([]);
      });
    });
    describe('addModel method', function() {
      it('should be called once', function() {
        const addModelFn = resource.addModel;
        const addModelStub = jest.fn().mockImplementation(addModelFn);
        resource.addModel = addModelStub;
        collection = new Resources.Collection(params, data, resource);
        expect(addModelStub).toHaveBeenCalledTimes(2);
      });
    });
  });
  describe('constructor method', function() {
    describe('if resource is undefined', function() {
      it('should throw a TypeError', function() {
        function testCall() {
          new Resources.Collection(params, data);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
    describe('if data is passed in', function() {
      it('should call the set method once', function() {
        const spy = jest.spyOn(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(params, data, resource);
        expect(testCollection).toBeTruthy();
        expect(spy).toHaveBeenCalledTimes(1);
        Resources.Collection.prototype.set.mockRestore();
      });
      it('should call the set method with the data', function() {
        const spy = jest.spyOn(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(params, data, resource);
        expect(testCollection).toBeTruthy();
        expect(spy).toHaveBeenCalledWith(data);
        Resources.Collection.prototype.set.mockRestore();
      });
    });
    describe('if no data is passed in', function() {
      it('should call the set method once', function() {
        const spy = jest.spyOn(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(params, undefined, resource);
        expect(testCollection).toBeTruthy();
        expect(spy).toHaveBeenCalledTimes(1);
        Resources.Collection.prototype.set.mockRestore();
      });
      it('should call the set method with an empty array', function() {
        const spy = jest.spyOn(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(params, undefined, resource);
        expect(testCollection).toBeTruthy();
        expect(spy).toHaveBeenCalledWith([]);
        Resources.Collection.prototype.set.mockRestore();
      });
    });
  });
  describe('clearCache method', function() {
    beforeEach(function() {
      collection.clearCache();
    });
    it('should set models to an empty array', function() {
      expect(collection.models).toEqual([]);
    });
    it('should set _model_map to an empty object', function() {
      expect(collection._model_map).toEqual({});
    });
  });
  describe('fetch method', function() {
    let setSpy, clearCacheSpy, client, logstub;
    describe('if called when Collection.synced = true and force is false', function() {
      it('should return current data immediately', function(done) {
        collection.synced = true;
        collection.models[0].attributes = data[0];
        const promise = collection.fetch();
        promise.then(result => {
          expect(result).toEqual(data);
          done();
        });
      });
    });
    describe('if called when Collection.synced = false', function() {
      describe('and the fetch is successful', function() {
        beforeEach(function() {
          setSpy = jest.spyOn(collection, 'set');
          clearCacheSpy = jest.spyOn(collection, 'clearCache');
          client = jest.fn().mockResolvedValue();
          resource.client = client;
        });
        afterEach(function() {
          collection.set.mockRestore();
        });
        describe('and the returned data is an array', function() {
          beforeEach(function() {
            response = { entity: [{ testing: 'testing' }] };
            client = jest.fn().mockResolvedValue(response);
            resource.client = client;
          });
          it('should call the client once', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(client).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call clearCache once', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(clearCacheSpy).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call set once', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(setSpy).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call set with the response entity', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(setSpy).toHaveBeenCalledWith(response.entity);
              done();
            });
          });
          it('should set synced to true', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.synced).toEqual(true);
              done();
            });
          });
          it('should leave no promises in promises property', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.promises).toEqual([]);
              done();
            });
          });
          it('should set every model synced to true', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              collection.models.forEach(model => {
                expect(model.synced).toEqual(true);
              });
              done();
            });
          });
        });
        describe('and the returned data is paginated', function() {
          beforeEach(function() {
            response = {
              entity: {
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
          it('should call the client once', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(client).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call clearCache once', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(clearCacheSpy).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call set once', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(setSpy).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call set with the response entity results', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(setSpy).toHaveBeenCalledWith(response.entity.results);
              done();
            });
          });
          it('should set synced to true', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.synced).toEqual(true);
              done();
            });
          });
          it('should set every model synced to true', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              collection.models.forEach(model => {
                expect(model.synced).toEqual(true);
              });
              done();
            });
          });
          it('should set the count property to 1', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.data.count).toEqual(1);
              done();
            });
          });
          it('should set the next property to false', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.data.next).toEqual(false);
              done();
            });
          });
          it('should set the previous property to false', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.data.previous).toEqual(false);
              done();
            });
          });
        });
        describe('and the returned data is malformed', function() {
          beforeEach(function() {
            response = {};
            client = jest.fn().mockResolvedValue(response);
            resource.client = client;
            logstub = jest.spyOn(Resources.logging, 'error').mockImplementation(() => {});
          });
          afterEach(function() {
            logstub.mockRestore();
          });
          it('should call the client once', function(done) {
            collection.synced = false;
            collection.fetch().catch(() => {
              expect(client).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call logging.error once', function(done) {
            collection.synced = false;
            collection.fetch().catch(() => {
              expect(logstub).toHaveBeenCalledTimes(1);
              done();
            });
          });
        });
      });
      describe('and the fetch is not successful', function() {
        beforeEach(function() {
          response = 'Error';
          client = jest.fn().mockRejectedValue(response);
          resource.client = client;
          logstub = jest.spyOn(Resources.logging, 'error').mockImplementation(() => {});
        });
        afterEach(function() {
          logstub.mockRestore();
        });
        it('should call logging.error once', function(done) {
          collection.synced = false;
          collection.fetch().catch(() => {
            expect(logstub).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should return the error', function(done) {
          collection.synced = false;
          collection.fetch().catch(error => {
            expect(error).toEqual(response);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          collection.synced = false;
          collection.fetch().catch(() => {
            expect(collection.promises).toEqual([]);
            done();
          });
        });
      });
    });
    describe('if called with force true and synced is true', function() {
      it('should call the client once', function(done) {
        response = { entity: [{ testing: 'testing' }] };
        client = jest.fn().mockResolvedValue(response);
        resource.client = client;
        collection.synced = true;
        collection.fetch({}, true).then(() => {
          expect(client).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = jest.fn().mockResolvedValue();
        collection.synced = false;
        const promise = collection.fetch();
        expect(collection.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = jest.fn().mockResolvedValue();
        collection.synced = false;
        const promise1 = collection.fetch();
        const promise2 = collection.fetch();
        expect(collection.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('save method', function() {
    let setSpy, client, logstub;
    describe('if called when Collection.new = false', function() {
      it('should reject the promise', function(done) {
        collection.new = false;
        const promise = collection.save();
        promise.catch(error => {
          expect(error).toEqual('Cannot update collections, only create them');
          done();
        });
      });
    });
    describe('if called when Collection.new = true', function() {
      describe('and the save is successful', function() {
        beforeEach(function() {
          setSpy = jest.spyOn(collection, 'set');
          jest.spyOn(collection, 'clearCache');
          client = jest.fn().mockResolvedValue();
          resource.client = client;
        });
        afterEach(function() {
          collection.set.mockRestore();
        });
        describe('and the returned data is an array', function() {
          beforeEach(function() {
            response = { entity: [{ testing: 'testing' }] };
            client = jest.fn().mockResolvedValue(response);
            resource.client = client;
          });
          it('should call the client once', function(done) {
            collection.save().then(() => {
              expect(client).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call set once', function(done) {
            collection.save().then(() => {
              expect(setSpy).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call set with the response entity', function(done) {
            collection.save().then(() => {
              expect(setSpy).toHaveBeenCalledWith(response.entity);
              done();
            });
          });
          it('should set synced to true', function(done) {
            collection.save().then(() => {
              expect(collection.synced).toEqual(true);
              done();
            });
          });
          it('should leave no promises in promises property', function(done) {
            collection.save().then(() => {
              expect(collection.promises).toEqual([]);
              done();
            });
          });
          it('should set every model synced to true', function(done) {
            collection.save().then(() => {
              collection.models.forEach(model => {
                expect(model.synced).toEqual(true);
              });
              done();
            });
          });
        });
        describe('and the returned data is malformed', function() {
          beforeEach(function() {
            response = {};
            client = jest.fn().mockResolvedValue(response);
            resource.client = client;
            logstub = jest.spyOn(Resources.logging, 'debug').mockImplementation(() => {});
          });
          afterEach(function() {
            logstub.mockRestore();
          });
          it('should call the client once', function(done) {
            collection.synced = false;
            collection.save().catch(() => {
              expect(client).toHaveBeenCalledTimes(1);
              done();
            });
          });
          it('should call logging.debug once', function(done) {
            collection.synced = false;
            collection.save().catch(() => {
              expect(logstub).toHaveBeenCalledTimes(1);
              done();
            });
          });
        });
      });
      describe('and the save is not successful', function() {
        beforeEach(function() {
          response = 'Error';
          client = jest.fn().mockRejectedValue(response);
          resource.client = client;
          logstub = jest.spyOn(Resources.logging, 'error').mockImplementation(() => {});
        });
        afterEach(function() {
          logstub.mockRestore();
        });
        it('should call logging.error once', function(done) {
          collection.synced = false;
          collection.save().catch(() => {
            expect(logstub).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should return the error', function(done) {
          collection.synced = false;
          collection.save().catch(error => {
            expect(error).toEqual(response);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          collection.synced = false;
          collection.save().catch(() => {
            expect(collection.promises).toEqual([]);
            done();
          });
        });
      });
    });
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = jest.fn().mockResolvedValue();
        collection.synced = false;
        const promise = collection.save();
        expect(collection.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = jest.fn().mockResolvedValue();
        collection.synced = false;
        const promise1 = collection.save();
        // NOTE: unhandled promise rejection here
        const promise2 = collection.save();
        expect(collection.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('delete method', function() {
    let client, logstub;
    describe('if called when Collection has no getParams', function() {
      it('should reject the promise', function(done) {
        collection.getParams = {};
        const promise = collection.delete();
        promise.catch(error => {
          expect(error).toEqual(
            'Can not delete unfiltered collection (collection without any GET params'
          );
          done();
        });
      });
    });
    describe('if called when Collection has getParams', function() {
      beforeEach(function() {
        collection.getParams = { test: 'testing' };
      });
      describe('and the delete is successful', function() {
        beforeEach(function() {
          resource.removeModel = jest.fn();
          resource.removeCollection = jest.fn();
          jest.spyOn(collection, 'set');
          jest.spyOn(collection, 'clearCache');
          client = jest.fn().mockResolvedValue();
          resource.client = client;
        });
        afterEach(function() {
          collection.set.mockRestore();
        });
        it('should call the client once', function(done) {
          collection.delete().then(() => {
            expect(client).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call the client with the DELETE method', function(done) {
          collection.delete().then(() => {
            expect(client.mock.calls[0][0].method).toEqual('DELETE');
            done();
          });
        });
        it('should call removeCollection on the resource', function(done) {
          collection.delete().then(() => {
            expect(resource.removeCollection).toHaveBeenCalledWith(collection);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          collection.delete().then(() => {
            expect(collection.promises).toEqual([]);
            done();
          });
        });
        it('should set every model deleted to true', function(done) {
          collection.delete().then(() => {
            collection.models.forEach(model => {
              expect(model.deleted).toEqual(true);
            });
            done();
          });
        });
        it('should call removeModel for every Model in the collection', function(done) {
          collection.delete().then(() => {
            expect(resource.removeCollection).toHaveBeenCalledTimes(collection.models.length);
            done();
          });
        });
      });
      describe('and the delete is not successful', function() {
        beforeEach(function() {
          response = 'Error';
          client = jest.fn();
          client.mockRejectedValue(response);
          resource.client = client;
          logstub = jest.spyOn(Resources.logging, 'error').mockImplementation(() => {});
        });
        afterEach(function() {
          logstub.mockRestore();
        });
        it('should call logging.error once', function(done) {
          collection.synced = false;
          collection.delete().catch(() => {
            expect(logstub).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should return the error', function(done) {
          collection.delete().catch(error => {
            expect(error).toEqual(response);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          collection.delete().catch(() => {
            expect(collection.promises).toEqual([]);
            done();
          });
        });
      });
    });
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue();
        collection.synced = false;
        // NOTE unhandled promise rejection here
        const promise = collection.delete();
        expect(collection.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue();
        collection.synced = false;
        const promise1 = collection.delete();
        // NOTE unhandled promise rejection here
        const promise2 = collection.delete();
        expect(collection.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('set method', function() {
    let model, setModel;
    beforeEach(function() {
      model = { id: 'test' };
      setModel = new Resources.Model(model, {}, resource);
    });
    describe('for a single model', function() {
      it('should add an entry to the models property', function() {
        collection.models = [];
        collection.set(model);
        expect(collection.models).toEqual([setModel]);
      });
      it('should add an entry to the _model_map property', function() {
        collection._model_map = {};
        collection.set(model);
        expect(collection._model_map).toEqual({
          [model.id]: setModel,
        });
      });
    });
    describe('for an array of models', function() {
      it('should add them to the models property', function() {
        collection.models = [];
        collection.set([model]);
        expect(collection.models).toEqual([setModel]);
      });
      it('should add them to the _model_map property', function() {
        collection._model_map = {};
        collection.set([model]);
        expect(collection._model_map).toEqual({
          [model.id]: setModel,
        });
      });
      it('should add only one entry per id to the models property', function() {
        collection.models = [];
        collection.set([model, model]);
        expect(collection.models).toEqual([setModel]);
      });
      it('should add only one entry per id to the _model_map property', function() {
        collection._model_map = {};
        collection.set([model, model]);
        expect(collection._model_map).toEqual({
          [model.id]: setModel,
        });
      });
      describe('that have no ids', function() {
        it('should not overwrite each other in the model cache', function() {
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

describe('Model', function() {
  let resource, model, data, payload, client, logstub, setSpy;
  beforeEach(function() {
    resource = {
      modelUrl: () => 'modelUrl',
      collectionUrl: () => 'collectionUrl',
      idKey: 'id',
      client: () => Promise.resolve({ entity: {} }),
      removeModel: () => {},
    };
    data = { test: 'test', id: 'testing' };
    model = new Resources.Model(data, {}, resource);
  });
  afterEach(function() {
    resource = undefined;
    model = undefined;
  });
  describe('constructor set properties:', function() {
    describe('resource property', function() {
      it('should be the passed in resource', function() {
        expect(resource).toEqual(model.resource);
      });
    });
    describe('attributes property', function() {
      it('should be the data', function() {
        expect(model.attributes).toEqual(data);
      });
    });
    describe('synced property', function() {
      it('should be false', function() {
        expect(model.synced).toEqual(false);
      });
    });
    describe('promises property', function() {
      it('should be an empty array', function() {
        expect(model.promises).toEqual([]);
      });
    });
    describe('getParams property', function() {
      it('should be an empty array', function() {
        expect(model.getParams).toEqual({});
      });
    });
  });
  describe('constructor method', function() {
    describe('if resource is undefined', function() {
      it('should throw a TypeError', function() {
        function testCall() {
          new Resources.Model(data);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
    describe('if data is passed in', function() {
      it('should call the set method once', function() {
        const spy = jest.spyOn(Resources.Model.prototype, 'set');
        const testModel = new Resources.Model(data, {}, resource);
        expect(testModel).toBeTruthy();
        expect(spy).toHaveBeenCalledTimes(1);
        Resources.Model.prototype.set.mockRestore();
      });
      it('should call the set method with the data', function() {
        const spy = jest.spyOn(Resources.Model.prototype, 'set');
        const testModel = new Resources.Model(data, {}, resource);
        expect(testModel).toBeTruthy();
        expect(spy).toHaveBeenCalledWith(data);
        Resources.Model.prototype.set.mockRestore();
      });
    });
    describe('if undefined data is passed in', function() {
      it('should throw a TypeError', function() {
        function testCall() {
          new Resources.Model(undefined, {}, resource);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
    describe('if null data is passed in', function() {
      it('should throw a TypeError', function() {
        function testCall() {
          new Resources.Model(null, {}, resource);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
    describe('if no data is passed in', function() {
      it('should throw a TypeError', function() {
        function testCall() {
          new Resources.Model({}, {}, resource);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
  });
  describe('fetch method', function() {
    let response, client, setSpy, logstub;
    describe('if called when Model.synced = true and force is false', function() {
      it('should return current data immediately', function(done) {
        model.synced = true;
        const promise = model.fetch();
        promise.then(result => {
          expect(result).toEqual(data);
          done();
        });
      });
    });
    describe('if called when Model.synced = false', function() {
      describe('and the fetch is successful', function() {
        beforeEach(function() {
          setSpy = jest.spyOn(model, 'set');
          response = { entity: { testing: 'testing' } };
          client = jest.fn().mockResolvedValue(response);
          resource.client = client;
        });
        afterEach(function() {
          model.set.mockRestore();
        });
        it('should call the client once', function(done) {
          model.synced = false;
          model.fetch().then(() => {
            expect(client).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call set once', function(done) {
          model.synced = false;
          model.fetch().then(() => {
            expect(setSpy).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call set with the response entity', function(done) {
          model.synced = false;
          model.fetch().then(() => {
            expect(setSpy).toHaveBeenCalledWith(response.entity);
            done();
          });
        });
        it('should set synced to true', function(done) {
          model.synced = false;
          model.fetch().then(() => {
            expect(model.synced).toEqual(true);
            done();
          });
        });
        it('should set new to false', function(done) {
          model.new = true;
          model.fetch().then(() => {
            expect(model.new).toEqual(false);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          model.synced = false;
          model.fetch().then(() => {
            expect(model.promises).toEqual([]);
            done();
          });
        });
      });
      describe('and the fetch is not successful', function() {
        beforeEach(function() {
          response = 'Error';
          client = jest.fn();
          client.mockRejectedValue(response);
          resource.client = client;
          logstub = jest.spyOn(Resources.logging, 'error').mockImplementation(() => {});
        });
        afterEach(function() {
          logstub.mockRestore();
        });
        it('should call logging.error once', function(done) {
          model.synced = false;
          model.fetch().catch(() => {
            expect(logstub).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should return the error', function(done) {
          model.synced = false;
          model.fetch().catch(error => {
            expect(error).toEqual(response);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          model.synced = false;
          model.fetch().catch(() => {
            expect(model.promises).toEqual([]);
            done();
          });
        });
      });
    });
    describe('if called with force true and synced is true', function() {
      it('should call the client once', function(done) {
        response = { entity: [{ testing: 'testing' }] };
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
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue();
        resource.client = client;
        model.synced = false;
        const promise = model.fetch();
        expect(model.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue();
        resource.client = client;
        model.synced = false;
        const promise1 = model.fetch();
        const promise2 = model.fetch();
        expect(model.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('save method', function() {
    describe('if called when Model.synced = true and no attrs are different', function() {
      it('should return current data immediately', function(done) {
        model.synced = true;
        const promise = model.save(model.attributes);
        promise.then(result => {
          expect(result).toEqual(data);
          done();
        });
      });
    });
    describe('if called when Model.synced = true and attrs are different', function() {
      it('should should call the client once', function(done) {
        model.synced = true;
        const payload = { somethingNew: 'new' };
        const entity = {};
        Object.assign(entity, model.attributes, payload);
        const response = { entity };
        const client = jest.fn();
        client.mockResolvedValue(response);
        resource.client = client;
        model.save(payload).then(() => {
          expect(client).toHaveBeenCalledTimes(1);
          done();
        });
      });
      it('should should call set once with the changed attributes', function(done) {
        model.synced = true;
        const payload = { somethingNew: 'new' };
        const entity = {};
        Object.assign(entity, model.attributes, payload);
        const response = { entity };
        const client = jest.fn();
        client.mockResolvedValue(response);
        resource.client = client;
        model.save(payload).then(() => {
          expect(model.attributes.somethingNew).toEqual('new');
          done();
        });
      });
    });
    describe('if called when Model.synced = false', function() {
      let payload, client, response;
      describe('and the save is successful', function() {
        beforeEach(function() {
          setSpy = jest.spyOn(model, 'set');
          payload = { somethingNew: 'new' };
          response = { entity: payload };
          client = jest.fn();
          client.mockResolvedValue(response);
          resource.client = client;
        });
        afterEach(function() {
          model.set.mockRestore();
        });
        it('should call the client once', function(done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(client).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call set once', function(done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(setSpy).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call set with the response entity', function(done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(setSpy).toHaveBeenCalledWith(response.entity);
            done();
          });
        });
        it('should set synced to true', function(done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(model.synced).toEqual(true);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(model.promises).toEqual([]);
            done();
          });
        });
      });
      describe('and the model has new set to true', function() {
        beforeEach(function() {
          setSpy = jest.spyOn(model, 'set');
          payload = { somethingNew: 'new' };
          response = { entity: payload };
          client = jest.fn();
          client.mockResolvedValue(response);
          resource.client = client;
        });
        afterEach(function() {
          model.set.mockRestore();
        });
        it('should call the client once', function(done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(client).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call the client with no explicit method', function(done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(client.mock.calls[0]['method']).toBeUndefined();
            done();
          });
        });
        it('should call the client with the collection url', function(done) {
          model.synced = false;
          model.save(payload).then(() => {
            expect(client.mock.calls[0][0]['path']).toEqual(resource.collectionUrl());
            done();
          });
        });
      });
      describe('and the save is not successful', function() {
        beforeEach(function() {
          response = 'Error';
          client = jest.fn();
          client.mockRejectedValue(response);
          resource.client = client;
          logstub = jest.spyOn(Resources.logging, 'error').mockImplementation(() => {});
        });
        afterEach(function() {
          logstub.mockRestore();
        });
        it('should call logging.error once', function(done) {
          model.synced = false;
          model.save().catch(() => {
            expect(logstub).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should return the error', function(done) {
          model.synced = false;
          model.save().catch(error => {
            expect(error).toEqual(response);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          model.synced = false;
          model.save().catch(() => {
            expect(model.promises).toEqual([]);
            done();
          });
        });
        it('should not set data on the model', function(done) {
          model.synced = false;
          model.attributes.test = 'notatest';
          model.save({ test: 'test' }).catch(() => {
            expect(model.attributes.test).toEqual('notatest');
            done();
          });
        });
      });
      describe('and model has no id', function() {
        it('should call the client with no explicit method', function(done) {
          payload = { somethingNew: 'new' };
          response = { entity: payload };
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
        describe('but returns with an id', function() {
          it('should call the resource addModel method', function(done) {
            payload = { somethingNew: 'new' };
            response = { entity: { id: 'test' } };
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
      describe('and model is not new', function() {
        it('should call the client with a PATCH method', function(done) {
          payload = { somethingNew: 'new' };
          response = { entity: payload };
          client = jest.fn();
          client.mockResolvedValue(response);
          resource.client = client;
          model.synced = false;
          model.new = false;
          model.save(payload).then(() => {
            expect(client.mock.calls[0][0].method).toEqual('PATCH');
            done();
          });
        });
      });
    });
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        client = jest.fn();
        client.mockResolvedValue();
        model.synced = false;
        const promise = model.save({});
        expect(model.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        client = jest.fn();
        client.mockResolvedValue();
        model.synced = false;
        const promise1 = model.save({});
        const promise2 = model.save({});
        expect(model.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('delete method', function() {
    let response, client;
    describe('if called when it has an id', function() {
      describe('and the delete is successful', function() {
        beforeEach(function() {
          resource.removeModel = jest.fn();
          response = { entity: { testing: 'testing' } };
          client = jest.fn();
          client.mockResolvedValue(response);
          resource.client = client;
        });
        it('should call the client once', function(done) {
          model.delete().then(() => {
            expect(client).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should call the client with the DELETE method', function(done) {
          model.delete().then(() => {
            expect(client.mock.calls[0][0].method).toEqual('DELETE');
            done();
          });
        });
        it('should call removeModel on the resource', function(done) {
          model.delete().then(() => {
            expect(resource.removeModel).toHaveBeenCalledWith(model);
            done();
          });
        });
        it('should resolve the id of the model', function(done) {
          model.delete().then(id => {
            expect(model.id).toEqual(id);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          model.delete().then(() => {
            expect(model.promises).toEqual([]);
            done();
          });
        });
      });
      describe('and the delete is not successful', function() {
        beforeEach(function() {
          response = 'Error';
          client = jest.fn();
          client.mockRejectedValue(response);
          resource.client = client;
          logstub = jest.spyOn(Resources.logging, 'error').mockImplementation(() => {});
        });
        afterEach(function() {
          logstub.mockRestore();
        });
        it('should call logging.error once', function(done) {
          model.delete().catch(() => {
            expect(logstub).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should return the error', function(done) {
          model.delete().catch(error => {
            expect(error).toEqual(response);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          model.delete().catch(() => {
            expect(model.promises).toEqual([]);
            done();
          });
        });
      });
    });
    describe('if called when model has no id', function() {
      it('should reject the deletion', function(done) {
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
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue();
        const promise = model.delete();
        expect(model.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = jest.fn();
        client.mockResolvedValue();
        const promise1 = model.delete();
        const promise2 = model.delete();
        expect(model.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('set method', function() {
    it('should add new attributes', function() {
      model.set({ new: 'new' });
      expect(model.attributes.new).toEqual('new');
    });
    it('should overwrite previous attributes', function() {
      model.attributes.new = 'old';
      model.set({ new: 'new' });
      expect(model.attributes.new).toEqual('new');
    });
    it('should coerce and id to a string', function() {
      model.set({ id: 123 });
      expect(model.attributes.id).toEqual('123');
    });
  });
});
