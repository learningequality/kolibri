/* eslint-env mocha */
const kolibri = require('kolibri');
const sinon = require('sinon');

// need to mock all this stuff before loading the module
kolibri.resources.RoleResource = {
  createModel: () => ({
    save: () => {},
  }),
};

const addCoachRoleAction = require('../src/state/addCoachRoleAction').default;

describe.only('addCoachRoleAction', () => {
  const storeMock = {
    dispatch: sinon.spy(),
  };

  afterEach(() => {
    storeMock.dispatch.reset();
  });

  after(() => { kolibri.resources.RoleResource = {}; });

  it('sends the correct payload to RoleResource.createModel', (done) => {
    const spy = sinon.stub(kolibri.resources.RoleResource, 'createModel');
    spy.returns({
      save: () => Promise.resolve()
    });
    addCoachRoleAction(storeMock, { classId: '1', userId: '5000' })
    .then(() => {
      sinon.assert.calledWith(spy, { collection: '1', kind: 'coach', user: '5000' });
    })
    .then(done, done);
  });
});
