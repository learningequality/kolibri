const sinon = require('sinon');

class MockResource {
  constructor() {
    this.getCollection = sinon.stub();
    this.getModel = sinon.stub();
    this.__resetMocks = this.__resetMocks.bind(this);
  }

  __resetMocks() {
    this.getCollection.reset();
    this.getModel.reset();
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
