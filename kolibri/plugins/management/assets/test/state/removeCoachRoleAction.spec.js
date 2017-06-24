/* eslint-env mocha */
import sinon from 'sinon';
import assert from 'assert';
import {
  FacilityUserResource,
  RoleResource
} from 'kolibri.resources';

// need to mock all this stuff before loading the module
Object.assign(FacilityUserResource, { getModel: () => {} });
Object.assign(RoleResource, { getModel: () => {} });

import removeCoachRoleAction from '../../src/state/removeCoachRoleAction';

const fakeUser = {
  roles: [
    { id: 'role_1', collection: 'facility_1' },
    { id: 'role_3', collection: 'class_3' },
  ]
};

describe('removeCoachRoleAction', () => {
  const storeMock = {
    dispatch: sinon.spy(),
    state: { core: { pageId: '1' } }
  };

  const getUserModelStub = sinon.stub(FacilityUserResource, 'getModel');
  const getRoleModelStub = sinon.stub(RoleResource, 'getModel');

  afterEach(() => {
    getUserModelStub.reset();
    getRoleModelStub.reset();
    storeMock.dispatch.reset();
  });

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
      done();
    });
  });

  it('if no (coach) Role is found, it is a noop', (done) => {
    const deleteRoleSpy = sinon.spy();
    getUserModelStub.returns({
      fetch: () => ({ _promise: Promise.resolve(fakeUser) })
    });
    getRoleModelStub.returns({ delete: deleteRoleSpy });
    // no Role entry for class_2
    removeCoachRoleAction(storeMock, { userId: 'user_1', classId: 'class_2' })
    .catch(() => {
      sinon.assert.notCalled(deleteRoleSpy);
      done();
    });
  });

  it('handles when fetching User fails', (done) => {
    getUserModelStub.returns({
      fetch: () => ({ _promise: Promise.reject({ entity: 'fetch error' }) }),
    });
    removeCoachRoleAction(storeMock, { userId: 'user_1', classId: 'class_3' })
    .catch(() => {
      assert.deepEqual(storeMock.dispatch.getCall(0).args[1], {
        newRole: 'learner',
        userId: 'user_1',
      });
      assert.deepEqual(storeMock.dispatch.getCall(1).args[1], {
        newRole: 'coach',
        userId: 'user_1',
      });
      assert.deepEqual(storeMock.dispatch.getCall(2).args, [
        'CORE_SET_ERROR', '"fetch error"',
      ]);
      done();
    });
  });

  it('handles when deleting Role fails', (done) => {
    getUserModelStub.returns({
      fetch: () => ({ _promise: Promise.resolve(fakeUser) }),
    });
    getRoleModelStub.returns({
      delete: () => Promise.reject({ entity: 'delete error' })
    });
    removeCoachRoleAction(storeMock, { userId: 'user_1', classId: 'class_3' })
    .catch(() => {
      assert.deepEqual(storeMock.dispatch.getCall(0).args[1], {
        newRole: 'learner',
        userId: 'user_1',
      });
      assert.deepEqual(storeMock.dispatch.getCall(1).args[1], {
        newRole: 'coach',
        userId: 'user_1',
      });
      assert.deepEqual(storeMock.dispatch.getCall(2).args, [
        'CORE_SET_ERROR', '"delete error"',
      ]);
      done();
    });
  });
});
