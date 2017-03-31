/* eslint-env mocha */
const kolibri = require('kolibri');
const sinon = require('sinon');

// need to mock all this stuff before loading the module
kolibri.resources.RoleResource = { createModel: () => {} };

const addCoachRoleAction = require('../../src/state/addCoachRoleAction').default;

describe('addCoachRoleAction', () => {
  const storeMock = { dispatch: sinon.spy() };
  const createUserModelStub = sinon.stub(kolibri.resources.RoleResource, 'createModel');

  afterEach(() => {
    createUserModelStub.reset();
    storeMock.dispatch.reset();
  });

  after(() => { kolibri.resources = {}; });

  it('successfully adds Role on server and client', (done) => {
    createUserModelStub.returns({ save: () => Promise.resolve() });
    addCoachRoleAction(storeMock, { classId: '1', userId: '5000' })
    .then(() => {
      sinon.assert.calledWith(createUserModelStub, { collection: '1', kind: 'coach', user: '5000' });
      sinon.assert.calledOnce(storeMock.dispatch);
      sinon.assert.calledWith(storeMock.dispatch, 'UPDATE_LEARNER_ROLE_FOR_CLASS', {
        newRole: 'coach',
        userId: '5000',
      });
    })
    .then(done, done);
  });

  it('handles when saving Role fails', (done) => {
    createUserModelStub.returns({
      save: () => Promise.reject({ entity: 'save error' })
    });
    addCoachRoleAction(storeMock, { classId: '1', userId: '5000' })
    .then(() => {
      sinon.assert.calledOnce(storeMock.dispatch);
      sinon.assert.calledWith(storeMock.dispatch, 'CORE_SET_ERROR', '"save error"');
    })
    .then(done, done);
  });
});
