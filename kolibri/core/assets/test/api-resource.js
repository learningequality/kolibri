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
    this.resource = new Resources.Resource({});
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
    it('should return the client variable in module scope', function () {
      const testClient = { test: 'this' };
      Resources.__set__('client', testClient);
      assert.equal(this.resource.client, testClient);
    });
  });
});
