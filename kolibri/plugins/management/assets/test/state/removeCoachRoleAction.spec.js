/* eslint-env mocha */
const kolibri = require('kolibri');
const sinon = require('sinon');

// need to mock all this stuff before loading the module
kolibri.resources.FacilityUserResource = { getModel: () => {} };
kolibri.resources.RoleResource = { getModel: () => {} };

const removeCoachRoleAction = require('../../src/state/removeCoachRoleAction').default;

const fakeUser = {
  roles: [
    { id: 'role_1', collection: 'facility_1' },
    { id: 'role_3', collection: 'class_3' },
  ]
};

describe('removeCoachRoleAction', () => {
  const storeMock = { dispatch: sinon.spy() };
  const getUserModelStub = sinon.stub(kolibri.resources.FacilityUserResource, 'getModel');
  const getRoleModelStub = sinon.stub(kolibri.resources.RoleResource, 'getModel');

  afterEach(() => {
    getUserModelStub.reset();
    getRoleModelStub.reset();
    storeMock.dispatch.reset();
  });

  after(() => { kolibri.resources = {}; });

  it('successfully removes the correct Role on server and client', (done) => {
    const fetchUserStub = sinon.stub().returns({
      _promise: Promise.resolve(fakeUser),
    });
    const deleteRoleSpy = sinon.spy();
    getUserModelStub.returns({ fetch: fetchUserStub });
    getRoleModelStub.returns({ delete: deleteRoleSpy });
    removeCoachRoleAction(storeMock, { userId: 'user_1', classId: 'class_3' })
    .then(() => {
      sinon.assert.calledWith(fetchUserStub, {}, true); // was force fetched
      sinon.assert.calledWith(getUserModelStub, 'user_1');
      sinon.assert.calledWith(getRoleModelStub, 'role_3');
      sinon.assert.calledOnce(storeMock.dispatch);
      sinon.assert.calledWith(storeMock.dispatch, 'UPDATE_LEARNER_ROLE_FOR_CLASS', {
        userId: 'user_1',
        newRole: 'learner',
      });
    })
    .then(done, done);
  });

  it('if no (coach) Role is found, it is a noop', (done) => {
    const deleteRoleSpy = sinon.spy();
    getUserModelStub.returns({
      fetch: () => ({ _promise: Promise.resolve(fakeUser) })
    });
    getRoleModelStub.returns({ delete: deleteRoleSpy });
    // no Role entry for class_2
    removeCoachRoleAction(storeMock, { userId: 'user_1', classId: 'class_2' })
    .then(() => {
      sinon.assert.notCalled(deleteRoleSpy);
      sinon.assert.notCalled(storeMock.dispatch);
    })
    .then(done, done);
  });

  it('handles when fetching User fails', (done) => {
    getUserModelStub.returns({
      fetch: () => ({ _promise: Promise.reject({ entity: 'fetch error' }) }),
    });
    removeCoachRoleAction(storeMock, { userId: 'user_1', classId: 'class_3' })
    .then(() => {
      sinon.assert.calledOnce(storeMock.dispatch);
      sinon.assert.calledWith(storeMock.dispatch, 'CORE_SET_ERROR', '"fetch error"');
    })
    .then(done, done);
  });

  it('handles when deleting Role fails', (done) => {
    getUserModelStub.returns({
      fetch: () => ({ _promise: Promise.resolve(fakeUser) }),
    });
    getRoleModelStub.returns({
      delete: () => Promise.reject({ entity: 'delete error' })
    });
    removeCoachRoleAction(storeMock, { userId: 'user_1', classId: 'class_3' })
    .then(() => {
      sinon.assert.calledOnce(storeMock.dispatch);
      sinon.assert.calledWith(storeMock.dispatch, 'CORE_SET_ERROR', '"delete error"');
    })
    .then(done, done);
  });
});
