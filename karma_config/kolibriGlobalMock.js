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

  __getSavable(payload, saveStub, willReject = false) {
    const saveable = {};
    if (willReject) {
      saveable.save = saveStub.returns(Promise.reject(payload));
    } else {
      saveable.save = saveStub.returns(Promise.resolve(payload));
    }
    return saveable;
  }

  __getModelFetchReturns(payload, willReject = false) {
    this.getModel.returns(this.__getFetchable(payload, willReject));
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
    this.resources = {
      RoleResource: {},
      FacilityDatasetResource: new MockResource(),
      FacilityResource: new MockResource(),
      MembershipResource: new MockResource(),
    };

    this.__resetMocks = this.__resetMocks.bind(this);

    this.urls = {};
  }

  __resetMocks() {
    this.resources.FacilityResource.__resetMocks();
    this.resources.FacilityDatasetResource.__resetMocks();
    this.resources.MembershipResource.__resetMocks();
  }
}

module.exports = global.kolibriGlobal = new KolibriMock(); // eslint-disable-line
