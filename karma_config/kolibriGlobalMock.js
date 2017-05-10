const sinon = require('sinon');
const resources = require('../kolibri/core/assets/src/api-resources');

class MockResource {
  constructor() {
    this.getCollection = sinon.stub();
    this.getModel = sinon.stub();
    this.__resetMocks = this.__resetMocks.bind(this);
    this.__getCollectionFetchReturns = this.__getCollectionFetchReturns.bind(this);
    this.__getModelFetchReturns = this.__getModelFetchReturns.bind(this);
  }

  __resetMocks() {
    this.getCollection.reset();
    this.getModel.reset();
  }

  __getFetchable(payload, willReject = false) {
    const fetchable = {};
    if (willReject) {
      fetchable.fetch = () => Promise.reject(payload);
    } else {
      fetchable.fetch = () => Promise.resolve(payload);
    }
    return fetchable;
  }

  __getSavable(payload, saveStub, willReject = false) {
    const saveable = {};
    if (willReject) {
      saveable.save = saveStub.returns(Promise.reject(payload));
    } else {
      saveable.save = saveStub.returns(Promise.resolve(payload));
    }
    return saveable;
  }

  // allowable verbs: 'delete', 'fetch', 'save'
  // TODO DRY up rest of methods after merged in
  __getCrudable(payload, stub, verb, willReject = false) {
    const model = {};
    if (willReject) {
      model[verb] = stub.returns(Promise.reject(payload));
    } else {
      model[verb] = stub.returns(Promise.resolve(payload));
    }
    return model;
  }

  __getModelFetchReturns(payload, willReject = false) {
    this.getModel.returns(this.__getFetchable(payload, willReject));
  }

  __getModelDeleteReturns(payload, willReject = false) {
    const stub = sinon.stub();
    this.getModel.returns(this.__getCrudable(payload, stub, 'delete', willReject));
    return stub;
  }

  __getModelSaveReturns(payload, willReject = false) {
    const saveStub = sinon.stub();
    this.getModel.returns(this.__getSavable(payload, saveStub, willReject));
    return saveStub;
  }

  __getCollectionFetchReturns(payload, willReject = false) {
    this.getCollection.returns(this.__getFetchable(payload, willReject));
  }
}

class KolibriMock {
  constructor() {
    this.resources = {};

    this.resourceNames = Object.keys(resources);

    this.resourceNames.forEach((resource) => {
      this.resources[resource] = new MockResource();
    });

    this.__resetMocks = this.__resetMocks.bind(this);
  }

  __resetMocks() {
    this.resourceNames.forEach((resource) => {
      this.resources[resource].__resetMocks();
    });
  }
}

module.exports = global.kolibriGlobal = new KolibriMock(); // eslint-disable-line
