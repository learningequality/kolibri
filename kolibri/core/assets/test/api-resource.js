/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

import assert from 'assert';
import sinon from 'sinon';

if (!Object.prototype.hasOwnProperty.call(global, 'Intl')) {
  global.Intl = require('intl');
}

import * as Resources from '../src/api-resource';

describe('Resource', function() {
  beforeEach(function() {
    this.resource = new Resources.Resource();
    this.modelData = { id: 'test' };
  });
  afterEach(function() {
    delete this.resource;
  });
  describe('collections property', function() {
    it('should be empty object', function() {
      assert.deepEqual(this.resource.collections, {});
    });
  });
  describe('models property', function() {
    it('should be empty object', function() {
      assert.deepEqual(this.resource.models, {});
    });
  });
  describe('resourceName method', function() {
    it('should throw a ReferenceError', function() {
      assert.throws(Resources.Resource.resourceName, ReferenceError);
    });
  });
  describe('static idKey method', function() {
    it('should be "id" by default', function() {
      assert.equal(Resources.Resource.idKey(), 'id');
    });
  });
  describe('idKey property', function() {
    it('should be "id" by default', function() {
      assert.equal(this.resource.idKey, 'id');
    });
  });
  describe('name property', function() {
    it('should return the resourceName static method of the Resource class', function() {
      const testName = 'test';
      Resources.Resource.resourceName = function() {
        return testName;
      };
      assert.equal(this.resource.name, testName);
    });
  });
  describe('getModel method', function() {
    it('should return a model instance', function() {
      assert.ok(this.resource.getModel('test') instanceof Resources.Model);
    });
    it('should return an existing model from the cache', function() {
      const testModel = new Resources.Model(this.modelData, {}, this.resource);
      this.resource.addModel(testModel);
      assert.equal(this.resource.getModel('test'), testModel);
    });
    it('should call create model if the model is not in the cache', function() {
      const spy = sinon.spy(this.resource, 'createModel');
      this.resource.getModel('test');
      assert.ok(spy.calledOnce);
    });
  });
  describe('createModel method', function() {
    it('should return a model instance', function() {
      assert.ok(this.resource.createModel(this.modelData) instanceof Resources.Model);
    });
    it('should call add model', function() {
      const spy = sinon.spy(this.resource, 'addModel');
      this.resource.createModel(this.modelData);
      assert.ok(spy.calledOnce);
    });
  });
  describe('addModel method', function() {
    it('should return a model instance', function() {
      assert.ok(this.resource.addModel(this.modelData) instanceof Resources.Model);
    });
    it('should call createModel if passed an object', function() {
      const spy = sinon.spy(this.resource, 'createModel');
      this.resource.addModel(this.modelData);
      assert.ok(spy.calledOnce);
    });
    it('should not call createModel if passed a Model', function() {
      const spy = sinon.spy(this.resource, 'createModel');
      this.resource.addModel(new Resources.Model(this.modelData, {}, this.resource));
      assert.ok(!spy.called);
    });
    it('should add a model to the cache if no id', function() {
      this.resource.addModel(new Resources.Model({ data: 'data' }, {}, this.resource));
      assert.equal(1, Object.keys(this.resource.models).length);
    });
    it('should not return the added model from the cache if no id', function() {
      this.resource.addModel(new Resources.Model({ data: 'data' }, {}, this.resource));
      const model = this.resource.getModel(undefined);
      assert.ok(!model.attributes.data);
    });
    it('should add a model to the cache if it has an id', function() {
      const model = this.resource.addModel(new Resources.Model({ id: 'test' }, {}, this.resource));
      assert.equal(model, this.resource.models[Object.keys(this.resource.models)[0]]);
    });
    it('should update the model in the cache if a model with matching id is found', function() {
      const model = new Resources.Model({ id: 'test' }, {}, this.resource);
      this.resource.addModel(model);
      this.resource.addModel(
        new Resources.Model({ id: 'test', example: 'prop' }, {}, this.resource)
      );
      assert.equal(1, Object.keys(this.resource.models).length);
      assert.equal(model.attributes.example, 'prop');
    });
  });
  describe('removeModel method', function() {
    it('should remove model from model cache', function() {
      const model = new Resources.Model({ id: 'test' }, {}, this.resource);
      this.resource.addModel(model);
      this.resource.removeModel(model);
      assert.equal(Object.keys(this.resource.models).length, 0);
    });
  });
  describe('unCacheModel method', function() {
    it('should set the synced property of the model to false', function() {
      const id = 'test';
      this.resource.addModel({ id });
      this.resource.unCacheModel(id);
      assert.equal(this.resource.getModel(id).synced, false);
    });
  });
  describe('clearCache method', function() {
    it('should set the models property of the Resource to an empty object', function() {
      const id = 'test';
      this.resource.models[id] = {};
      this.resource.clearCache();
      assert.deepEqual(this.resource.models, {});
    });
    it('should set the collections property of the Resource to an empty object', function() {
      const id = 'test';
      this.resource.collections[id] = {};
      this.resource.clearCache();
      assert.deepEqual(this.resource.collections, {});
    });
  });
  describe('getCollection method', function() {
    it('should return a collection instance', function() {
      assert.ok(this.resource.getCollection({}) instanceof Resources.Collection);
    });
    it('should return an existing collection from the cache', function() {
      const testCollection = new Resources.Collection({}, {}, [], this.resource);
      this.resource.collections['{}'] = testCollection;
      assert.equal(this.resource.getCollection({}), testCollection);
    });
    it('should call create collection if the collection is not in the cache', function() {
      const spy = sinon.spy(this.resource, 'createCollection');
      this.resource.getCollection({});
      assert.ok(spy.calledOnce);
    });
  });
  describe('createCollection method', function() {
    it('should return a collection instance', function() {
      assert.ok(this.resource.createCollection({}) instanceof Resources.Collection);
    });
    it('should add the collection to the cache', function() {
      this.resource.createCollection({});
      assert.equal(Object.keys(this.resource.collections).length, 1);
    });
  });
  describe('filterAndCheckResourceIds method', function() {
    it('should return an empty object when there are no resourceIds', function() {
      assert.deepEqual(this.resource.filterAndCheckResourceIds({ test: 'test' }), {});
    });
    it('should throw a TypeError when resourceIds are missing', function() {
      const stub = sinon.stub(Resources.Resource, 'resourceIdentifiers');
      stub.returns(['thisisatest']);
      assert.throws(() => this.resource.filterAndCheckResourceIds({ test: 'test' }));
      stub.restore();
    });
    it('should return an object with only resourceIds', function() {
      const stub = sinon.stub(Resources.Resource, 'resourceIdentifiers');
      stub.returns(['thisisatest']);
      const filtered = this.resource.filterAndCheckResourceIds({
        test: 'test',
        thisisatest: 'testtest',
      });
      assert.equal(Object.keys(filtered).length, 1);
      assert.equal(filtered.thisisatest, 'testtest');
      stub.restore();
    });
  });
});

describe('Collection', function() {
  beforeEach(function() {
    this.addModelStub = sinon.spy(model => ({
      id: model.id,
      attributes: model,
    }));
    this.resource = {
      addModel: this.addModelStub,
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
    this.resourceIds = {};
    this.params = {};
    this.data = [{ test: 'test', id: 'testing' }];
    this.collection = new Resources.Collection(
      this.resourceIds,
      this.params,
      this.data,
      this.resource
    );
  });
  afterEach(function() {
    delete this.resource;
    delete this.collection;
  });
  describe('constructor set properties:', function() {
    describe('resource property', function() {
      it('should be the passed in resource', function() {
        assert.equal(this.resource, this.collection.resource);
      });
    });
    describe('getParams property', function() {
      it('should be the passed in params', function() {
        assert.equal(this.params, this.collection.getParams);
      });
    });
    describe('models property', function() {
      it('should be an array of length 1', function() {
        assert.equal(this.collection.models.length, 1);
      });
    });
    describe('_model_map property', function() {
      it('should have one entry', function() {
        assert.equal(Object.keys(this.collection._model_map).length, 1);
      });
    });
    describe('synced property', function() {
      it('should be false', function() {
        assert.equal(this.collection.synced, false);
      });
    });
    describe('promises property', function() {
      it('should be an empty array', function() {
        assert.deepEqual(this.collection.promises, []);
      });
    });
    describe('addModel method', function() {
      it('should be called once', function() {
        assert.ok(this.addModelStub.calledOnce);
      });
    });
  });
  describe('constructor method', function() {
    describe('if resource is undefined', function() {
      it('should throw a TypeError', function() {
        assert.throws(
          () => new Resources.Collection(this.resourceIds, this.params, this.data),
          TypeError
        );
      });
    });
    describe('if data is passed in', function() {
      it('should call the set method once', function() {
        const spy = sinon.spy(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(
          this.resourceIds,
          this.params,
          this.data,
          this.resource
        );
        assert.ok(testCollection);
        assert.ok(spy.calledOnce);
        Resources.Collection.prototype.set.restore();
      });
      it('should call the set method with the data', function() {
        const spy = sinon.spy(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(
          this.resourceIds,
          this.params,
          this.data,
          this.resource
        );
        assert.ok(testCollection);
        assert.ok(spy.calledWithExactly(this.data));
        Resources.Collection.prototype.set.restore();
      });
    });
    describe('if no data is passed in', function() {
      it('should call the set method once', function() {
        const spy = sinon.spy(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(
          this.resourceIds,
          this.params,
          undefined,
          this.resource
        );
        assert.ok(testCollection);
        assert.ok(spy.calledOnce);
        Resources.Collection.prototype.set.restore();
      });
      it('should call the set method with an empty array', function() {
        const spy = sinon.spy(Resources.Collection.prototype, 'set');
        const testCollection = new Resources.Collection(
          this.resourceIds,
          this.params,
          undefined,
          this.resource
        );
        assert.ok(testCollection);
        assert.ok(spy.calledWithExactly([]));
        Resources.Collection.prototype.set.restore();
      });
    });
  });
  describe('clearCache method', function() {
    beforeEach(function() {
      this.collection.clearCache();
    });
    it('should set models to an empty array', function() {
      assert.deepEqual(this.collection.models, []);
    });
    it('should set _model_map to an empty object', function() {
      assert.deepEqual(this.collection._model_map, {});
    });
  });
  describe('fetch method', function() {
    describe('if called when Collection.synced = true and force is false', function() {
      it('should return current data immediately', function(done) {
        this.collection.synced = true;
        const promise = this.collection.fetch();
        promise.then(result => {
          assert.deepEqual(result, this.data);
          done();
        });
      });
    });
    describe('if called when Collection.synced = false', function() {
      describe('and the fetch is successful', function() {
        beforeEach(function() {
          this.setSpy = sinon.stub(this.collection, 'set');
          this.clearCacheSpy = sinon.stub(this.collection, 'clearCache');
          this.client = sinon.stub();
          this.resource.client = this.client;
          this.client.returns(Promise.resolve());
        });
        afterEach(function() {
          this.collection.set.restore();
        });
        describe('and the returned data is an array', function() {
          beforeEach(function() {
            this.response = { entity: [{ testing: 'testing' }] };
            this.client.returns(Promise.resolve(this.response));
          });
          it('should call the client once', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.client.calledOnce);
              done();
            });
          });
          it('should call clearCache once', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.clearCacheSpy.calledOnce);
              done();
            });
          });
          it('should call set once', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.setSpy.calledOnce);
              done();
            });
          });
          it('should call set with the response entity', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.setSpy.calledWithExactly(this.response.entity));
              done();
            });
          });
          it('should set synced to true', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.collection.synced);
              done();
            });
          });
          it('should leave no promises in promises property', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.deepEqual(this.collection.promises, []);
              done();
            });
          });
          it('should set every model synced to true', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              this.collection.models.forEach(model => {
                assert.ok(model.synced);
              });
              done();
            });
          });
        });
        describe('and the returned data is paginated', function() {
          beforeEach(function() {
            this.response = {
              entity: {
                results: [{ testing: 'testing' }],
                count: 1,
                next: false,
                previous: false,
              },
            };
            this.collection.pageSize = 25;
            this.client = sinon.stub();
            this.client.returns(Promise.resolve(this.response));
            this.resource.client = this.client;
          });
          it('should call the client once', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.client.calledOnce);
              done();
            });
          });
          it('should call clearCache once', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.clearCacheSpy.calledOnce);
              done();
            });
          });
          it('should call set once', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.setSpy.calledOnce);
              done();
            });
          });
          it('should call set with the response entity results', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.setSpy.calledWithExactly(this.response.entity.results));
              done();
            });
          });
          it('should set synced to true', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.ok(this.collection.synced);
              done();
            });
          });
          it('should set every model synced to true', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              this.collection.models.forEach(model => {
                assert.ok(model.synced);
              });
              done();
            });
          });
          it('should set the pageCount property to 1', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.equal(this.collection.pageCount, 1);
              done();
            });
          });
          it('should set the hasNext property to false', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.equal(this.collection.hasNext, false);
              done();
            });
          });
          it('should set the hasPrev property to false', function(done) {
            this.collection.synced = false;
            this.collection.fetch().then(() => {
              assert.equal(this.collection.hasPrev, false);
              done();
            });
          });
        });
        describe('and the returned data is malformed', function() {
          beforeEach(function() {
            this.response = {};
            this.client = sinon.stub();
            this.client.returns(Promise.resolve(this.response));
            this.resource.client = this.client;
            this.logstub = sinon.stub(Resources.logging, 'debug');
          });
          afterEach(function() {
            this.logstub.restore();
          });
          it('should call the client once', function(done) {
            this.collection.synced = false;
            this.collection.fetch().catch(() => {
              assert.ok(this.client.calledOnce);
              done();
            });
          });
          it('should call logging.debug once', function(done) {
            this.collection.synced = false;
            this.collection.fetch().catch(() => {
              assert.ok(this.logstub.calledOnce);
              done();
            });
          });
        });
      });
      describe('and the fetch is not successful', function() {
        beforeEach(function() {
          this.response = 'Error';
          this.client = sinon.stub();
          this.client.returns(Promise.reject(this.response));
          this.resource.client = this.client;
          this.logstub = sinon.stub(Resources.logging, 'error');
        });
        afterEach(function() {
          this.logstub.restore();
        });
        it('should call logging.error once', function(done) {
          this.collection.synced = false;
          this.collection.fetch().catch(() => {
            assert.ok(this.logstub.calledOnce);
            done();
          });
        });
        it('should return the error', function(done) {
          this.collection.synced = false;
          this.collection.fetch().catch(error => {
            assert.equal(error, this.response);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          this.collection.synced = false;
          this.collection.fetch().catch(() => {
            assert.deepEqual(this.collection.promises, []);
            done();
          });
        });
      });
    });
    describe('if called with force true and synced is true', function() {
      it('should call the client once', function(done) {
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
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        this.collection.synced = false;
        const promise = this.collection.fetch();
        assert.deepEqual(this.collection.promises, [promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
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
  describe('save method', function() {
    describe('if called when Collection.new = false', function() {
      it('should reject the promise', function(done) {
        this.collection.synced = true;
        const promise = this.collection.save();
        promise.catch(error => {
          assert.equal(error, 'Cannot update collections, only create them');
          done();
        });
      });
    });
    describe('if called when Collection.new = true', function() {
      describe('and the save is successful', function() {
        beforeEach(function() {
          this.setSpy = sinon.stub(this.collection, 'set');
          this.clearCacheSpy = sinon.stub(this.collection, 'clearCache');
          this.client = sinon.stub();
          this.resource.client = this.client;
          this.client.returns(Promise.resolve());
        });
        afterEach(function() {
          this.collection.set.restore();
        });
        describe('and the returned data is an array', function() {
          beforeEach(function() {
            this.response = { entity: [{ testing: 'testing' }] };
            this.client.returns(Promise.resolve(this.response));
          });
          it('should call the client once', function(done) {
            this.collection.synced = false;
            this.collection.save().then(() => {
              assert.ok(this.client.calledOnce);
              done();
            });
          });
          it('should call set once', function(done) {
            this.collection.synced = false;
            this.collection.save().then(() => {
              assert.ok(this.setSpy.calledOnce);
              done();
            });
          });
          it('should call set with the response entity', function(done) {
            this.collection.synced = false;
            this.collection.save().then(() => {
              assert.ok(this.setSpy.calledWithExactly(this.response.entity));
              done();
            });
          });
          it('should set synced to true', function(done) {
            this.collection.synced = false;
            this.collection.save().then(() => {
              assert.ok(this.collection.synced);
              done();
            });
          });
          it('should leave no promises in promises property', function(done) {
            this.collection.synced = false;
            this.collection.save().then(() => {
              assert.deepEqual(this.collection.promises, []);
              done();
            });
          });
          it('should set every model synced to true', function(done) {
            this.collection.synced = false;
            this.collection.save().then(() => {
              this.collection.models.forEach(model => {
                assert.ok(model.synced);
              });
              done();
            });
          });
        });
        describe('and the returned data is malformed', function() {
          beforeEach(function() {
            this.response = {};
            this.client = sinon.stub();
            this.client.returns(Promise.resolve(this.response));
            this.resource.client = this.client;
            this.logstub = sinon.stub(Resources.logging, 'debug');
          });
          afterEach(function() {
            this.logstub.restore();
          });
          it('should call the client once', function(done) {
            this.collection.synced = false;
            this.collection.save().catch(() => {
              assert.ok(this.client.calledOnce);
              done();
            });
          });
          it('should call logging.debug once', function(done) {
            this.collection.synced = false;
            this.collection.save().catch(() => {
              assert.ok(this.logstub.calledOnce);
              done();
            });
          });
        });
      });
      describe('and the save is not successful', function() {
        beforeEach(function() {
          this.response = 'Error';
          this.client = sinon.stub();
          this.client.returns(Promise.reject(this.response));
          this.resource.client = this.client;
          this.logstub = sinon.stub(Resources.logging, 'error');
        });
        afterEach(function() {
          this.logstub.restore();
        });
        it('should call logging.error once', function(done) {
          this.collection.synced = false;
          this.collection.save().catch(() => {
            assert.ok(this.logstub.calledOnce);
            done();
          });
        });
        it('should return the error', function(done) {
          this.collection.synced = false;
          this.collection.save().catch(error => {
            assert.equal(error, this.response);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          this.collection.synced = false;
          this.collection.save().catch(() => {
            assert.deepEqual(this.collection.promises, []);
            done();
          });
        });
      });
    });
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        this.collection.synced = false;
        const promise = this.collection.save();
        assert.deepEqual(this.collection.promises, [promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        this.collection.synced = false;
        const promise1 = this.collection.save();
        const promise2 = this.collection.save();
        assert.deepEqual(this.collection.promises, [promise1, promise2]);
      });
    });
  });
  describe('delete method', function() {
    describe('if called when Collection has no getParams', function() {
      it('should reject the promise', function(done) {
        this.collection.getParams = {};
        const promise = this.collection.delete();
        promise.catch(error => {
          assert.equal(
            error,
            'Can not delete unfiltered collection (collection without any GET params'
          );
          done();
        });
      });
    });
    describe('if called when Collection has getParams', function() {
      beforeEach(function() {
        this.collection.getParams = { test: 'testing' };
      });
      describe('and the delete is successful', function() {
        beforeEach(function() {
          this.resource.removeModel = sinon.spy();
          this.resource.removeCollection = sinon.spy();
          this.setSpy = sinon.stub(this.collection, 'set');
          this.clearCacheSpy = sinon.stub(this.collection, 'clearCache');
          this.client = sinon.stub();
          this.resource.client = this.client;
          this.client.returns(Promise.resolve());
        });
        afterEach(function() {
          this.collection.set.restore();
        });
        it('should call the client once', function(done) {
          this.collection.delete().then(() => {
            assert.ok(this.client.calledOnce);
            done();
          });
        });
        it('should call the client with the DELETE method', function(done) {
          this.collection.delete().then(() => {
            assert.equal(this.client.args[0][0].method, 'DELETE');
            done();
          });
        });
        it('should call removeCollection on the resource', function(done) {
          this.collection.delete().then(() => {
            assert.ok(this.resource.removeCollection.calledWithExactly(this.collection));
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          this.collection.delete().then(() => {
            assert.deepEqual(this.collection.promises, []);
            done();
          });
        });
        it('should set every model deleted to true', function(done) {
          this.collection.delete().then(() => {
            this.collection.models.forEach(model => {
              assert.ok(model.deleted);
            });
            done();
          });
        });
        it('should call removeModel for every Model in the collection', function(done) {
          this.collection.delete().then(() => {
            assert.equal(this.resource.removeCollection.callCount, this.collection.models.length);
            done();
          });
        });
      });
      describe('and the delete is not successful', function() {
        beforeEach(function() {
          this.response = 'Error';
          this.client = sinon.stub();
          this.client.returns(Promise.reject(this.response));
          this.resource.client = this.client;
          this.logstub = sinon.stub(Resources.logging, 'error');
        });
        afterEach(function() {
          this.logstub.restore();
        });
        it('should call logging.error once', function(done) {
          this.collection.synced = false;
          this.collection.delete().catch(() => {
            assert.ok(this.logstub.calledOnce);
            done();
          });
        });
        it('should return the error', function(done) {
          this.collection.delete().catch(error => {
            assert.equal(error, this.response);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          this.collection.delete().catch(() => {
            assert.deepEqual(this.collection.promises, []);
            done();
          });
        });
      });
    });
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        this.collection.synced = false;
        const promise = this.collection.delete();
        assert.deepEqual(this.collection.promises, [promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        this.collection.synced = false;
        const promise1 = this.collection.delete();
        const promise2 = this.collection.delete();
        assert.deepEqual(this.collection.promises, [promise1, promise2]);
      });
    });
  });
  describe('set method', function() {
    beforeEach(function() {
      this.model = { id: 'test' };
      this.setModel = { id: this.model.id, attributes: this.model };
    });
    describe('for a single model', function() {
      it('should add an entry to the models property', function() {
        this.collection.models = [];
        this.collection.set(this.model);
        assert.deepEqual(this.collection.models, [this.setModel]);
      });
      it('should add an entry to the _model_map property', function() {
        this.collection._model_map = {};
        this.collection.set(this.model);
        assert.deepEqual(this.collection._model_map, {
          [this.model.id]: this.setModel,
        });
      });
    });
    describe('for an array of models', function() {
      it('should add them to the models property', function() {
        this.collection.models = [];
        this.collection.set([this.model]);
        assert.deepEqual(this.collection.models, [this.setModel]);
      });
      it('should add them to the _model_map property', function() {
        this.collection._model_map = {};
        this.collection.set([this.model]);
        assert.deepEqual(this.collection._model_map, {
          [this.model.id]: this.setModel,
        });
      });
      it('should add only one entry per id to the models property', function() {
        this.collection.models = [];
        this.collection.set([this.model, this.model]);
        assert.deepEqual(this.collection.models, [this.setModel]);
      });
      it('should add only one entry per id to the _model_map property', function() {
        this.collection._model_map = {};
        this.collection.set([this.model, this.model]);
        assert.deepEqual(this.collection._model_map, {
          [this.model.id]: this.setModel,
        });
      });
      describe('that have no ids', function() {
        it(' should not overwrite each other in the model cache', function() {
          const idLessModel1 = { test: 'testing' };
          const idLessModel2 = { test: 'testing1' };
          this.collection._model_map = {};
          this.collection.models = [];
          this.collection.set([idLessModel1, idLessModel2]);
          assert.equal(this.collection.models.length, 2);
        });
      });
    });
  });
});

describe('Model', function() {
  beforeEach(function() {
    this.resource = {
      modelUrl: () => '',
      idKey: 'id',
      client: () => Promise.resolve({ entity: {} }),
      removeModel: () => {},
      filterAndCheckResourceIds: params => params,
      resourceIds: [],
    };
    this.resourceIds = {};
    this.data = { test: 'test', id: 'testing' };
    this.model = new Resources.Model(this.data, this.resourceIds, this.resource);
  });
  afterEach(function() {
    delete this.resource;
    delete this.model;
  });
  describe('constructor set properties:', function() {
    describe('resource property', function() {
      it('should be the passed in resource', function() {
        assert.equal(this.resource, this.model.resource);
      });
    });
    describe('attributes property', function() {
      it('should be the data', function() {
        assert.deepEqual(this.model.attributes, this.data);
      });
    });
    describe('synced property', function() {
      it('should be false', function() {
        assert.equal(this.model.synced, false);
      });
    });
    describe('promises property', function() {
      it('should be an empty array', function() {
        assert.deepEqual(this.model.promises, []);
      });
    });
  });
  describe('constructor method', function() {
    describe('if resource is undefined', function() {
      it('should throw a TypeError', function() {
        assert.throws(() => new Resources.Model(this.data, {}), TypeError);
      });
    });
    describe('if data is passed in', function() {
      it('should call the set method once', function() {
        const spy = sinon.spy(Resources.Model.prototype, 'set');
        const testModel = new Resources.Model(this.data, {}, this.resource);
        assert.ok(testModel);
        assert.ok(spy.calledOnce);
        Resources.Model.prototype.set.restore();
      });
      it('should call the set method with the data', function() {
        const spy = sinon.spy(Resources.Model.prototype, 'set');
        const testModel = new Resources.Model(this.data, {}, this.resource);
        assert.ok(testModel);
        assert.ok(spy.calledWithExactly(this.data));
        Resources.Model.prototype.set.restore();
      });
    });
    describe('if undefined data is passed in', function() {
      it('should throw a TypeError', function() {
        assert.throws(() => new Resources.Model(undefined, {}, this.resource), TypeError);
      });
    });
    describe('if null data is passed in', function() {
      it('should throw a TypeError', function() {
        assert.throws(() => new Resources.Model(null, {}, this.resource), TypeError);
      });
    });
    describe('if no data is passed in', function() {
      it('should throw a TypeError', function() {
        assert.throws(() => new Resources.Model({}, {}, this.resource), TypeError);
      });
    });
  });
  describe('fetch method', function() {
    describe('if called when Model.synced = true and force is false', function() {
      it('should return current data immediately', function(done) {
        this.model.synced = true;
        const promise = this.model.fetch();
        promise.then(result => {
          assert.deepEqual(result, this.data);
          done();
        });
      });
    });
    describe('if called when Model.synced = false', function() {
      describe('and the fetch is successful', function() {
        beforeEach(function() {
          this.setSpy = sinon.stub(this.model, 'set');
          this.response = { entity: { testing: 'testing' } };
          this.client = sinon.stub();
          this.client.returns(Promise.resolve(this.response));
          this.resource.client = this.client;
        });
        afterEach(function() {
          this.model.set.restore();
        });
        it('should call the client once', function(done) {
          this.model.synced = false;
          this.model.fetch().then(() => {
            assert.ok(this.client.calledOnce);
            done();
          });
        });
        it('should call set once', function(done) {
          this.model.synced = false;
          this.model.fetch().then(() => {
            assert.ok(this.setSpy.calledOnce);
            done();
          });
        });
        it('should call set with the response entity', function(done) {
          this.model.synced = false;
          this.model.fetch().then(() => {
            assert.ok(this.setSpy.calledWithExactly(this.response.entity));
            done();
          });
        });
        it('should set synced to true', function(done) {
          this.model.synced = false;
          this.model.fetch().then(() => {
            assert.ok(this.model.synced);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          this.model.synced = false;
          this.model.fetch().then(() => {
            assert.deepEqual(this.model.promises, []);
            done();
          });
        });
      });
      describe('and the fetch is not successful', function() {
        beforeEach(function() {
          this.response = 'Error';
          this.client = sinon.stub();
          this.client.returns(Promise.reject(this.response));
          this.resource.client = this.client;
          this.logstub = sinon.stub(Resources.logging, 'error');
        });
        afterEach(function() {
          this.logstub.restore();
        });
        it('should call logging.error once', function(done) {
          this.model.synced = false;
          this.model.fetch().catch(() => {
            assert.ok(this.logstub.calledOnce);
            done();
          });
        });
        it('should return the error', function(done) {
          this.model.synced = false;
          this.model.fetch().catch(error => {
            assert.equal(error, this.response);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          this.model.synced = false;
          this.model.fetch().catch(() => {
            assert.deepEqual(this.model.promises, []);
            done();
          });
        });
      });
    });
    describe('if called with force true and synced is true', function() {
      it('should call the client once', function(done) {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(Promise.resolve(this.response));
        this.resource.client = this.client;
        this.model.synced = true;
        this.model.fetch({}, true).then(() => {
          assert.ok(this.client.calledOnce);
          done();
        });
      });
    });
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        this.resource.client = this.client;
        this.model.synced = false;
        const promise = this.model.fetch();
        assert.deepEqual(this.model.promises, [promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        this.resource.client = this.client;
        this.model.synced = false;
        const promise1 = this.model.fetch();
        const promise2 = this.model.fetch();
        assert.deepEqual(this.model.promises, [promise1, promise2]);
      });
    });
  });
  describe('save method', function() {
    describe('if called when Model.synced = true and no attrs are different', function() {
      it('should return current data immediately', function(done) {
        this.model.synced = true;
        const promise = this.model.save(this.model.attributes);
        promise.then(result => {
          assert.deepEqual(result, this.data);
          done();
        });
      });
    });
    describe('if called when Model.synced = true and attrs are different', function() {
      it('should should call the client once', function(done) {
        this.model.synced = true;
        const payload = { somethingNew: 'new' };
        const entity = {};
        Object.assign(entity, this.model.attributes, payload);
        this.response = { entity };
        this.client = sinon.stub();
        this.client.returns(Promise.resolve(this.response));
        this.resource.client = this.client;
        this.model.save(payload).then(() => {
          assert.ok(this.client.calledOnce);
          done();
        });
      });
      it('should should call set once with the changed attributes', function(done) {
        this.model.synced = true;
        const payload = { somethingNew: 'new' };
        const entity = {};
        Object.assign(entity, this.model.attributes, payload);
        this.response = { entity };
        this.client = sinon.stub();
        this.client.returns(Promise.resolve(this.response));
        this.resource.client = this.client;
        this.model.save(payload).then(() => {
          assert.equal(this.model.attributes.somethingNew, 'new');
          done();
        });
      });
    });
    describe('if called when Model.synced = false', function() {
      describe('and the save is successful', function() {
        beforeEach(function() {
          this.setSpy = sinon.stub(this.model, 'set');
          this.payload = { somethingNew: 'new' };
          this.response = { entity: this.payload };
          this.client = sinon.stub();
          this.client.returns(Promise.resolve(this.response));
          this.resource.client = this.client;
        });
        afterEach(function() {
          this.model.set.restore();
        });
        it('should call the client once', function(done) {
          this.model.synced = false;
          this.model.save(this.payload).then(() => {
            assert.ok(this.client.calledOnce);
            done();
          });
        });
        it('should call set twice', function(done) {
          this.model.synced = false;
          this.model.save(this.payload).then(() => {
            assert.ok(this.setSpy.calledTwice);
            done();
          });
        });
        it('should call set with the response entity', function(done) {
          this.model.synced = false;
          this.model.save(this.payload).then(() => {
            assert.ok(this.setSpy.calledWithExactly(this.response.entity));
            done();
          });
        });
        it('should set synced to true', function(done) {
          this.model.synced = false;
          this.model.save(this.payload).then(() => {
            assert.ok(this.model.synced);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          this.model.synced = false;
          this.model.save(this.payload).then(() => {
            assert.deepEqual(this.model.promises, []);
            done();
          });
        });
      });
      describe('and the save is not successful', function() {
        beforeEach(function() {
          this.response = 'Error';
          this.client = sinon.stub();
          this.client.returns(Promise.reject(this.response));
          this.resource.client = this.client;
          this.logstub = sinon.stub(Resources.logging, 'error');
        });
        afterEach(function() {
          this.logstub.restore();
        });
        it('should call logging.error once', function(done) {
          this.model.synced = false;
          this.model.save().catch(() => {
            assert.ok(this.logstub.calledOnce);
            done();
          });
        });
        it('should return the error', function(done) {
          this.model.synced = false;
          this.model.save().catch(error => {
            assert.equal(error, this.response);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          this.model.synced = false;
          this.model.save().catch(() => {
            assert.deepEqual(this.model.promises, []);
            done();
          });
        });
      });
      describe('and model has no id', function() {
        it('should call the client with no explicit method', function(done) {
          this.payload = { somethingNew: 'new' };
          this.response = { entity: this.payload };
          this.client = sinon.stub();
          this.client.returns(Promise.resolve(this.response));
          this.resource.client = this.client;
          this.resource.collectionUrl = () => '';
          this.model = new Resources.Model(this.payload, {}, this.resource);
          this.model.synced = false;
          this.model.save(this.payload).then(() => {
            assert.equal(typeof this.client.args[0].method, 'undefined');
            done();
          });
        });
        describe('but returns with an id', function() {
          it('should call the resource addModel method', function(done) {
            this.payload = { somethingNew: 'new' };
            this.response = { entity: { id: 'test' } };
            this.client = sinon.stub();
            this.client.returns(Promise.resolve(this.response));
            this.resource.client = this.client;
            this.resource.collectionUrl = () => '';
            this.model = new Resources.Model(this.payload, {}, this.resource);
            this.model.synced = false;
            this.resource.addModel = sinon.spy();
            this.model.save(this.payload).then(() => {
              assert.ok(this.resource.addModel.calledWithExactly(this.model));
              done();
            });
          });
        });
      });
      describe('and model has an id', function() {
        it('should call the client with a PATCH method', function(done) {
          this.payload = { somethingNew: 'new' };
          this.response = { entity: this.payload };
          this.client = sinon.stub();
          this.client.returns(Promise.resolve(this.response));
          this.resource.client = this.client;
          this.model.synced = false;
          this.model.save(this.payload).then(() => {
            assert.equal(this.client.args[0][0].method, 'PATCH');
            done();
          });
        });
      });
    });
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        this.model.synced = false;
        const promise = this.model.save({});
        assert.deepEqual(this.model.promises, [promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        this.model.synced = false;
        const promise1 = this.model.save({});
        const promise2 = this.model.save({});
        assert.deepEqual(this.model.promises, [promise1, promise2]);
      });
    });
  });
  describe('delete method', function() {
    describe('if called when it has an id', function() {
      describe('and the delete is successful', function() {
        beforeEach(function() {
          this.resource.removeModel = sinon.spy();
          this.response = { entity: { testing: 'testing' } };
          this.client = sinon.stub();
          this.client.returns(Promise.resolve(this.response));
          this.resource.client = this.client;
        });
        it('should call the client once', function(done) {
          this.model.delete().then(() => {
            assert.ok(this.client.calledOnce);
            done();
          });
        });
        it('should call the client with the DELETE method', function(done) {
          this.model.delete().then(() => {
            assert.equal(this.client.args[0][0].method, 'DELETE');
            done();
          });
        });
        it('should call removeModel on the resource', function(done) {
          this.model.delete().then(() => {
            assert.ok(this.resource.removeModel.calledWithExactly(this.model));
            done();
          });
        });
        it('should resolve the id of the model', function(done) {
          this.model.delete().then(id => {
            assert.equal(this.model.id, id);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          this.model.delete().then(() => {
            assert.deepEqual(this.model.promises, []);
            done();
          });
        });
      });
      describe('and the delete is not successful', function() {
        beforeEach(function() {
          this.response = 'Error';
          this.client = sinon.stub();
          this.client.returns(Promise.reject(this.response));
          this.resource.client = this.client;
          this.logstub = sinon.stub(Resources.logging, 'error');
        });
        afterEach(function() {
          this.logstub.restore();
        });
        it('should call logging.error once', function(done) {
          this.model.delete().catch(() => {
            assert.ok(this.logstub.calledOnce);
            done();
          });
        });
        it('should return the error', function(done) {
          this.model.delete().catch(error => {
            assert.equal(error, this.response);
            done();
          });
        });
        it('should leave no promises in promises property', function(done) {
          this.model.delete().catch(() => {
            assert.deepEqual(this.model.promises, []);
            done();
          });
        });
      });
    });
    describe('if called when model has no id', function() {
      it('should reject the deletion', function(done) {
        this.payload = { somethingNew: 'new' };
        this.response = {};
        this.client = sinon.stub();
        this.client.returns(Promise.resolve(this.response));
        this.resource.client = this.client;
        this.model = new Resources.Model(this.payload, {}, this.resource);
        this.model.delete().catch(error => {
          assert.ok(error);
          done();
        });
      });
    });
    describe('if called once', function() {
      it('should add a promise to the promises property', function() {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        const promise = this.model.delete();
        assert.deepEqual(this.model.promises, [promise]);
      });
    });
    describe('if called twice', function() {
      it('should add two promises to the promises property', function() {
        this.response = { entity: [{ testing: 'testing' }] };
        this.client = sinon.stub();
        this.client.returns(new Promise(() => {}));
        const promise1 = this.model.delete();
        const promise2 = this.model.delete();
        assert.deepEqual(this.model.promises, [promise1, promise2]);
      });
    });
  });
  describe('set method', function() {
    it('should add new attributes', function() {
      this.model.set({ new: 'new' });
      assert.equal(this.model.attributes.new, 'new');
    });
    it('should overwrite previous attributes', function() {
      this.model.attributes.new = 'old';
      this.model.set({ new: 'new' });
      assert.equal(this.model.attributes.new, 'new');
    });
    it('should coerce and id to a string', function() {
      this.model.set({ id: 123 });
      assert.equal(this.model.attributes.id, '123');
    });
  });
});
