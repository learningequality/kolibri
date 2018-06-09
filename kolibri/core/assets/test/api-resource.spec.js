import sinon from 'sinon';
import * as Resources from '../src/api-resource';

if (!Object.prototype.hasOwnProperty.call(global, 'Intl')) {
  global.Intl = require('intl');
}

describe('Resource', function() {
  let resource, modelData;
  beforeEach(function() {
    resource = new Resources.Resource();
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
  describe('resourceName method', function() {
    it('should throw a ReferenceError', function() {
      expect(Resources.Resource.resourceName).toThrow(ReferenceError);
    });
  });
  describe('static idKey method', function() {
    it('should be "id" by default', function() {
      expect(Resources.Resource.idKey()).toEqual('id');
    });
  });
  describe('idKey property', function() {
    it('should be "id" by default', function() {
      expect(resource.idKey).toEqual('id');
    });
  });
  describe('name property', function() {
    it('should return the resourceName static method of the Resource class', function() {
      const testName = 'test';
      Resources.Resource.resourceName = function() {
        return testName;
      };
      expect(resource.name).toEqual(testName);
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
      const spy = sinon.spy(resource, 'createModel');
      resource.getModel('test');
      sinon.assert.calledOnce(spy);
    });
  });
  describe('createModel method', function() {
    it('should return a model instance', function() {
      expect(resource.createModel(modelData)).toBeInstanceOf(Resources.Model);
    });
    it('should call add model', function() {
      const spy = sinon.spy(resource, 'addModel');
      resource.createModel(modelData);
      sinon.assert.calledOnce(spy);
    });
  });
  describe('addModel method', function() {
    it('should return a model instance', function() {
      expect(resource.addModel(modelData)).toBeInstanceOf(Resources.Model);
    });
    it('should call createModel if passed an object', function() {
      const spy = sinon.spy(resource, 'createModel');
      resource.addModel(modelData);
      sinon.assert.calledOnce(spy);
    });
    it('should not call createModel if passed a Model', function() {
      const spy = sinon.spy(resource, 'createModel');
      resource.addModel(new Resources.Model(modelData, {}, resource));
      sinon.assert.notCalled(spy);
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
      expect(resource.models[Object.keys(resource.models)[0]]).toEqual(model);
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
      expect(resource.models).toEqual({});
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
      const testCollection = new Resources.Collection({}, {}, [], resource);
      resource.collections['{}'] = testCollection;
      expect(resource.getCollection({})).toEqual(testCollection);
    });
    it('should call create collection if the collection is not in the cache', function() {
      const spy = sinon.spy(resource, 'createCollection');
      resource.getCollection({});
      sinon.assert.calledOnce(spy);
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
  describe('filterAndCheckResourceIds method', function() {
    it('should return an empty object when there are no resourceIds', function() {
      expect(resource.filterAndCheckResourceIds({ test: 'test' })).toEqual({});
    });
    it('should throw a TypeError when resourceIds are missing', function() {
      const stub = sinon.stub(Resources.Resource, 'resourceIdentifiers');
      stub.returns(['thisisatest']);
      function testCall() {
        resource.filterAndCheckResourceIds({ test: 'test' });
      }
      expect(testCall).toThrow(TypeError);
      stub.restore();
    });
    it('should return an object with only resourceIds', function() {
      const stub = sinon.stub(Resources.Resource, 'resourceIdentifiers');
      stub.returns(['thisisatest']);
      const filtered = resource.filterAndCheckResourceIds({
        test: 'test',
        thisisatest: 'testtest',
      });
      expect(Object.keys(filtered)).toHaveLength(1);
      expect(filtered.thisisatest).toEqual('testtest');
      stub.restore();
    });
  });
});

describe('Collection', function() {
  let addModelStub, resource, params, data, collection, response, resourceIds;
  beforeEach(function() {
    addModelStub = sinon.spy(model => ({
      id: model.id,
      attributes: model,
    }));
    resource = {
      addModel: addModelStub,
      collectionUrl: () => '',
      client: () => Promise.resolve({ entity: [] }),
      filterAndCheckResourceIds: params => params,
      resourceIds: [],
      cacheKey: (...params) => {
        const allParams = Object.assign({}, ...params);
        // Sort keys in order, then assign those keys to an empty object in that order.
        // Then stringify to create a cache key.
        return JSON.stringify(
          Object.assign(
            {},
            ...Object.keys(allParams)
              .sort()
              .map(paramKey => ({ [paramKey]: allParams[paramKey] }))
          )
        );
      },
    };
    resourceIds = {};
    params = {};
    data = [{ test: 'test', id: 'testing' }];
    collection = new Resources.Collection(resourceIds, params, data, resource);
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
        sinon.assert.calledOnce(addModelStub);
      });
    });
  });
  describe('constructor method', function() {
    describe('if resource is undefined', function() {
      it('should throw a TypeError', function() {
        function testCall() {
          new Resources.Collection(resourceIds, params, data);
        }
        expect(testCall).toThrow(TypeError);
      });
    });
    describe('if data is passed in', function() {
      it('should call the set method once', function() {
        const spy = sinon.spy(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(resourceIds, params, data, resource);
        expect(testCollection).toBeTruthy();
        sinon.assert.calledOnce(spy);
        Resources.Collection.prototype.set.restore();
      });
      it('should call the set method with the data', function() {
        const spy = sinon.spy(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(resourceIds, params, data, resource);
        expect(testCollection).toBeTruthy();
        sinon.assert.calledWithExactly(spy, data);
        Resources.Collection.prototype.set.restore();
      });
    });
    describe('if no data is passed in', function() {
      it('should call the set method once', function() {
        const spy = sinon.spy(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(resourceIds, params, undefined, resource);
        expect(testCollection).toBeTruthy();
        sinon.assert.calledOnce(spy);
        Resources.Collection.prototype.set.restore();
      });
      it('should call the set method with an empty array', function() {
        const spy = sinon.spy(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(resourceIds, params, undefined, resource);
        expect(testCollection).toBeTruthy();
        sinon.assert.calledWithExactly(spy, []);
        Resources.Collection.prototype.set.restore();
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
          setSpy = sinon.stub(collection, 'set');
          clearCacheSpy = sinon.stub(collection, 'clearCache');
          client = sinon.stub();
          resource.client = client;
          client.returns(Promise.resolve());
        });
        afterEach(function() {
          collection.set.restore();
        });
        describe('and the returned data is an array', function() {
          beforeEach(function() {
            response = { entity: [{ testing: 'testing' }] };
            client.returns(Promise.resolve(response));
          });
          it('should call the client once', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              sinon.assert.calledOnce(client);
              done();
            });
          });
          it('should call clearCache once', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              sinon.assert.calledOnce(clearCacheSpy);
              done();
            });
          });
          it('should call set once', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              sinon.assert.calledOnce(setSpy);
              done();
            });
          });
          it('should call set with the response entity', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              sinon.assert.calledWithExactly(setSpy, response.entity);
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
            client = sinon.stub();
            client.returns(Promise.resolve(response));
            resource.client = client;
          });
          it('should call the client once', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              sinon.assert.calledOnce(client);
              done();
            });
          });
          it('should call clearCache once', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              sinon.assert.calledOnce(clearCacheSpy);
              done();
            });
          });
          it('should call set once', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              sinon.assert.calledOnce(setSpy);
              done();
            });
          });
          it('should call set with the response entity results', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              sinon.assert.calledWithExactly(setSpy, response.entity.results);
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
          it('should set the pageCount property to 1', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.pageCount).toEqual(1);
              done();
            });
          });
          it('should set the hasNext property to false', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.hasNext).toEqual(false);
              done();
            });
          });
          it('should set the hasPrev property to false', function(done) {
            collection.synced = false;
            collection.fetch().then(() => {
              expect(collection.hasPrev).toEqual(false);
              done();
            });
          });
        });
        describe('and the returned data is malformed', function() {
          beforeEach(function() {
            response = {};
            client = sinon.stub();
            client.returns(Promise.resolve(response));
            resource.client = client;
            logstub = sinon.stub(Resources.logging, 'debug');
          });
          afterEach(function() {
            logstub.restore();
          });
          it('should call the client once', function(done) {
            collection.synced = false;
            collection.fetch().catch(() => {
              sinon.assert.calledOnce(client);
              done();
            });
          });
          it('should call logging.debug once', function(done) {
            collection.synced = false;
            collection.fetch().catch(() => {
              sinon.assert.calledOnce(logstub);
              done();
            });
          });
        });
      });
      describe('and the fetch is not successful', function() {
        beforeEach(function() {
          response = 'Error';
          client = sinon.stub();
          client.returns(Promise.reject(response));
          resource.client = client;
          logstub = sinon.stub(Resources.logging, 'error');
        });
        afterEach(function() {
          logstub.restore();
        });
        it('should call logging.error once', function(done) {
          collection.synced = false;
          collection.fetch().catch(() => {
            sinon.assert.calledOnce(logstub);
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
        client = sinon.stub();
        client.returns(Promise.resolve(response));
        resource.client = client;
        collection.synced = true;
        collection.fetch({}, true).then(() => {
          sinon.assert.calledOnce(client);
          done();
        });
      });
    });
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = sinon.stub();
        client.returns(new Promise(() => {}));
        collection.synced = false;
        const promise = collection.fetch();
        expect(collection.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = sinon.stub();
        client.returns(new Promise(() => {}));
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
        collection.synced = true;
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
          setSpy = sinon.stub(collection, 'set');
          sinon.stub(collection, 'clearCache');
          client = sinon.stub();
          resource.client = client;
          client.returns(Promise.resolve());
        });
        afterEach(function() {
          collection.set.restore();
        });
        describe('and the returned data is an array', function() {
          beforeEach(function() {
            response = { entity: [{ testing: 'testing' }] };
            client.returns(Promise.resolve(response));
          });
          it('should call the client once', function(done) {
            collection.synced = false;
            collection.save().then(() => {
              sinon.assert.calledOnce(client);
              done();
            });
          });
          it('should call set once', function(done) {
            collection.synced = false;
            collection.save().then(() => {
              sinon.assert.calledOnce(setSpy);
              done();
            });
          });
          it('should call set with the response entity', function(done) {
            collection.synced = false;
            collection.save().then(() => {
              sinon.assert.calledWithExactly(setSpy, response.entity);
              done();
            });
          });
          it('should set synced to true', function(done) {
            collection.synced = false;
            collection.save().then(() => {
              expect(collection.synced).toEqual(true);
              done();
            });
          });
          it('should leave no promises in promises property', function(done) {
            collection.synced = false;
            collection.save().then(() => {
              expect(collection.promises).toEqual([]);
              done();
            });
          });
          it('should set every model synced to true', function(done) {
            collection.synced = false;
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
            client = sinon.stub();
            client.returns(Promise.resolve(response));
            resource.client = client;
            logstub = sinon.stub(Resources.logging, 'debug');
          });
          afterEach(function() {
            logstub.restore();
          });
          it('should call the client once', function(done) {
            collection.synced = false;
            collection.save().catch(() => {
              sinon.assert.calledOnce(client);
              done();
            });
          });
          it('should call logging.debug once', function(done) {
            collection.synced = false;
            collection.save().catch(() => {
              sinon.assert.calledOnce(logstub);
              done();
            });
          });
        });
      });
      describe('and the save is not successful', function() {
        beforeEach(function() {
          response = 'Error';
          client = sinon.stub();
          client.returns(Promise.reject(response));
          resource.client = client;
          logstub = sinon.stub(Resources.logging, 'error');
        });
        afterEach(function() {
          logstub.restore();
        });
        it('should call logging.error once', function(done) {
          collection.synced = false;
          collection.save().catch(() => {
            sinon.assert.calledOnce(logstub);
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
        client = sinon.stub();
        client.returns(new Promise(() => {}));
        collection.synced = false;
        const promise = collection.save();
        expect(collection.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = sinon.stub();
        client.returns(new Promise(() => {}));
        collection.synced = false;
        const promise1 = collection.save();
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
          resource.removeModel = sinon.spy();
          resource.removeCollection = sinon.spy();
          sinon.stub(collection, 'set');
          sinon.stub(collection, 'clearCache');
          client = sinon.stub();
          resource.client = client;
          client.returns(Promise.resolve());
        });
        afterEach(function() {
          collection.set.restore();
        });
        it('should call the client once', function(done) {
          collection.delete().then(() => {
            sinon.assert.calledOnce(client);
            done();
          });
        });
        it('should call the client with the DELETE method', function(done) {
          collection.delete().then(() => {
            expect(client.args[0][0].method).toEqual('DELETE');
            done();
          });
        });
        it('should call removeCollection on the resource', function(done) {
          collection.delete().then(() => {
            sinon.assert.calledWithExactly(resource.removeCollection, collection);
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
            expect(resource.removeCollection.callCount).toEqual(collection.models.length);
            done();
          });
        });
      });
      describe('and the delete is not successful', function() {
        beforeEach(function() {
          response = 'Error';
          client = sinon.stub();
          client.returns(Promise.reject(response));
          resource.client = client;
          logstub = sinon.stub(Resources.logging, 'error');
        });
        afterEach(function() {
          logstub.restore();
        });
        it('should call logging.error once', function(done) {
          collection.synced = false;
          collection.delete().catch(() => {
            sinon.assert.calledOnce(logstub);
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
        client = sinon.stub();
        client.returns(new Promise(() => {}));
        collection.synced = false;
        const promise = collection.delete();
        expect(collection.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = sinon.stub();
        client.returns(new Promise(() => {}));
        collection.synced = false;
        const promise1 = collection.delete();
        const promise2 = collection.delete();
        expect(collection.promises).toEqual([promise1, promise2]);
      });
    });
  });
  describe('set method', function() {
    let model, setModel;
    beforeEach(function() {
      model = { id: 'test' };
      setModel = { id: model.id, attributes: model };
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
  let resource, model, resourceIds, data, payload, client, logstub, setSpy;
  beforeEach(function() {
    resource = {
      modelUrl: () => '',
      idKey: 'id',
      client: () => Promise.resolve({ entity: {} }),
      removeModel: () => {},
      filterAndCheckResourceIds: params => params,
      resourceIds: [],
    };
    resourceIds = {};
    data = { test: 'test', id: 'testing' };
    model = new Resources.Model(data, resourceIds, resource);
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
  });
  describe('constructor method', function() {
    describe('if resource is undefined', function() {
      it('should throw a TypeError', function() {
        function testCall() {
          new Resources.Model(data, {});
        }
        expect(testCall).toThrow(TypeError);
      });
    });
    describe('if data is passed in', function() {
      it('should call the set method once', function() {
        const spy = sinon.spy(Resources.Model.prototype, 'set');
        const testModel = new Resources.Model(data, {}, resource);
        expect(testModel).toBeTruthy();
        sinon.assert.calledOnce(spy);
        Resources.Model.prototype.set.restore();
      });
      it('should call the set method with the data', function() {
        const spy = sinon.spy(Resources.Model.prototype, 'set');
        const testModel = new Resources.Model(data, {}, resource);
        expect(testModel).toBeTruthy();
        sinon.assert.calledWithExactly(spy, data);
        Resources.Model.prototype.set.restore();
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
          setSpy = sinon.stub(model, 'set');
          response = { entity: { testing: 'testing' } };
          client = sinon.stub();
          client.returns(Promise.resolve(response));
          resource.client = client;
        });
        afterEach(function() {
          model.set.restore();
        });
        it('should call the client once', function(done) {
          model.synced = false;
          model.fetch().then(() => {
            sinon.assert.calledOnce(client);
            done();
          });
        });
        it('should call set once', function(done) {
          model.synced = false;
          model.fetch().then(() => {
            sinon.assert.calledOnce(setSpy);
            done();
          });
        });
        it('should call set with the response entity', function(done) {
          model.synced = false;
          model.fetch().then(() => {
            sinon.assert.calledWithExactly(setSpy, response.entity);
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
          client = sinon.stub();
          client.returns(Promise.reject(response));
          resource.client = client;
          logstub = sinon.stub(Resources.logging, 'error');
        });
        afterEach(function() {
          logstub.restore();
        });
        it('should call logging.error once', function(done) {
          model.synced = false;
          model.fetch().catch(() => {
            sinon.assert.calledOnce(logstub);
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
        client = sinon.stub();
        client.returns(Promise.resolve(response));
        resource.client = client;
        model.synced = true;
        model.fetch({}, true).then(() => {
          sinon.assert.calledOnce(client);
          done();
        });
      });
    });
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = sinon.stub();
        client.returns(new Promise(() => {}));
        resource.client = client;
        model.synced = false;
        const promise = model.fetch();
        expect(model.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = sinon.stub();
        client.returns(new Promise(() => {}));
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
        const client = sinon.stub();
        client.returns(Promise.resolve(response));
        resource.client = client;
        model.save(payload).then(() => {
          sinon.assert.calledOnce(client);
          done();
        });
      });
      it('should should call set once with the changed attributes', function(done) {
        model.synced = true;
        const payload = { somethingNew: 'new' };
        const entity = {};
        Object.assign(entity, model.attributes, payload);
        const response = { entity };
        const client = sinon.stub();
        client.returns(Promise.resolve(response));
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
          setSpy = sinon.stub(model, 'set');
          payload = { somethingNew: 'new' };
          response = { entity: payload };
          client = sinon.stub();
          client.returns(Promise.resolve(response));
          resource.client = client;
        });
        afterEach(function() {
          model.set.restore();
        });
        it('should call the client once', function(done) {
          model.synced = false;
          model.save(payload).then(() => {
            sinon.assert.calledOnce(client);
            done();
          });
        });
        it('should call set twice', function(done) {
          model.synced = false;
          model.save(payload).then(() => {
            sinon.assert.calledTwice(setSpy);
            done();
          });
        });
        it('should call set with the response entity', function(done) {
          model.synced = false;
          model.save(payload).then(() => {
            sinon.assert.calledWithExactly(setSpy, response.entity);
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
      describe('and the save is not successful', function() {
        beforeEach(function() {
          response = 'Error';
          client = sinon.stub();
          client.returns(Promise.reject(response));
          resource.client = client;
          logstub = sinon.stub(Resources.logging, 'error');
        });
        afterEach(function() {
          logstub.restore();
        });
        it('should call logging.error once', function(done) {
          model.synced = false;
          model.save().catch(() => {
            sinon.assert.calledOnce(logstub);
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
      });
      describe('and model has no id', function() {
        it('should call the client with no explicit method', function(done) {
          payload = { somethingNew: 'new' };
          response = { entity: payload };
          client = sinon.stub();
          client.returns(Promise.resolve(response));
          resource.client = client;
          resource.collectionUrl = () => '';
          model = new Resources.Model(payload, {}, resource);
          model.synced = false;
          model.save(payload).then(() => {
            expect(typeof client.args[0].method).toEqual('undefined');
            done();
          });
        });
        describe('but returns with an id', function() {
          it('should call the resource addModel method', function(done) {
            payload = { somethingNew: 'new' };
            response = { entity: { id: 'test' } };
            client = sinon.stub();
            client.returns(Promise.resolve(response));
            resource.client = client;
            resource.collectionUrl = () => '';
            model = new Resources.Model(payload, {}, resource);
            model.synced = false;
            resource.addModel = sinon.spy();
            model.save(payload).then(() => {
              sinon.assert.calledWithExactly(resource.addModel, model);
              done();
            });
          });
        });
      });
      describe('and model has an id', function() {
        it('should call the client with a PATCH method', function(done) {
          payload = { somethingNew: 'new' };
          response = { entity: payload };
          client = sinon.stub();
          client.returns(Promise.resolve(response));
          resource.client = client;
          model.synced = false;
          model.save(payload).then(() => {
            expect(client.args[0][0].method).toEqual('PATCH');
            done();
          });
        });
      });
    });
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        client = sinon.stub();
        client.returns(new Promise(() => {}));
        model.synced = false;
        const promise = model.save({});
        expect(model.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        client = sinon.stub();
        client.returns(new Promise(() => {}));
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
          resource.removeModel = sinon.spy();
          response = { entity: { testing: 'testing' } };
          client = sinon.stub();
          client.returns(Promise.resolve(response));
          resource.client = client;
        });
        it('should call the client once', function(done) {
          model.delete().then(() => {
            sinon.assert.calledOnce(client);
            done();
          });
        });
        it('should call the client with the DELETE method', function(done) {
          model.delete().then(() => {
            expect(client.args[0][0].method).toEqual('DELETE');
            done();
          });
        });
        it('should call removeModel on the resource', function(done) {
          model.delete().then(() => {
            sinon.assert.calledWithExactly(resource.removeModel, model);
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
          client = sinon.stub();
          client.returns(Promise.reject(response));
          resource.client = client;
          logstub = sinon.stub(Resources.logging, 'error');
        });
        afterEach(function() {
          logstub.restore();
        });
        it('should call logging.error once', function(done) {
          model.delete().catch(() => {
            sinon.assert.calledOnce(logstub);
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
        client = sinon.stub();
        client.returns(Promise.resolve(response));
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
        client = sinon.stub();
        client.returns(new Promise(() => {}));
        const promise = model.delete();
        expect(model.promises).toEqual([promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        response = { entity: [{ testing: 'testing' }] };
        client = sinon.stub();
        client.returns(new Promise(() => {}));
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
