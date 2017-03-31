/* eslint-env mocha */
const kolibri = require('kolibri');
const sinon = require('sinon');

// need to mock all this stuff before loading the module
kolibri.resources.RoleResource = {
  createModel: () => ({
    save: () => {},
  }),
};

const addCoachRoleAction = require('../../src/state/addCoachRoleAction').default;

describe('addCoachRoleAction', () => {
  const storeMock = {
    dispatch: sinon.spy(),
  };

  afterEach(() => {
    storeMock.dispatch.reset();
  });

  after(() => { kolibri.resources.RoleResource = {}; });

  it('successfully adds role on server and client', (done) => {
    const createModelStub = sinon.stub(kolibri.resources.RoleResource, 'createModel');
    createModelStub.returns({ save: () => Promise.resolve() });
    addCoachRoleAction(storeMock, { classId: '1', userId: '5000' })
    .then(() => {
      sinon.assert.calledWith(createModelStub, { collection: '1', kind: 'coach', user: '5000' });
      sinon.assert.calledOnce(storeMock.dispatch);
      sinon.assert.calledWith(storeMock.dispatch, 'UPDATE_LEARNER_ROLE_FOR_CLASS', {
        newRole: 'coach',
        userId: '5000',
      });
      createModelStub.restore();
    })
    .then(done, done);
  });

  it('handles errors from server', (done) => {
    const createModelStub = sinon.stub(kolibri.resources.RoleResource, 'createModel');
    createModelStub.returns({ save: () => Promise.reject({ entity: 'you can\'t handle the truth!' }) });
    addCoachRoleAction(storeMock, { classId: '1', userId: '5000' })
    .then(() => {
      sinon.assert.calledOnce(storeMock.dispatch);
      sinon.assert.calledWith(storeMock.dispatch, 'CORE_SET_ERROR');
      createModelStub.restore();
    })
    .then(done, done);
  });
});
