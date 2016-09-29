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
