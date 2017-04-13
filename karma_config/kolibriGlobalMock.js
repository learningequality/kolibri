const sinon = require('sinon');

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

  __getSavable(payload, willReject = false) {
    const fetchable = {};
    if (willReject) {
      fetchable.save = () => Promise.reject(payload);
    } else {
      fetchable.save = () => Promise.resolve(payload);
    }
    return fetchable;
  }

  __getModelFetchReturns(payload, willReject = false) {
    this.getModel.returns(this.__getFetchable(payload, willReject));
  }

  __getModelSaveReturns(payload, willReject = false) {
    this.getModel.returns(this.__getSavable(payload, willReject));
  }

  __getCollectionFetchReturns(payload, willReject = false) {
    this.getCollection.returns(this.__getFetchable(payload, willReject));
  }
}

class KolibriMock {
  constructor() {
    this.resources = {
      RoleResource: {},
      FacilityDatasetResource: new MockResource(),
      FacilityResource: new MockResource(),
    };

    this.__resetMocks = this.__resetMocks.bind(this);
  }

  __resetMocks() {
    this.resources.FacilityResource.__resetMocks();
    this.resources.FacilityDatasetResource.__resetMocks();
  }
}

module.exports = global.kolibriGlobal = new KolibriMock(); // eslint-disable-line
