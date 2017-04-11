/* eslint-env mocha */
const kolibri = require('kolibri');
const sinon = require('sinon');
const assert = require('assert');

// need to mock all this stuff before loading the module
kolibri.resources.RoleResource = { createModel: () => {} };

const addCoachRoleAction = require('../../src/state/addCoachRoleAction').default;

describe('addCoachRoleAction', () => {
  const storeMock = {
    dispatch: sinon.spy(),
    state: { core: { pageId: '1' } } };
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
      done();
    });
  });

  it('handles when saving Role fails', (done) => {
    createUserModelStub.returns({
      save: () => Promise.reject({ entity: 'save error' })
    });
    addCoachRoleAction(storeMock, { classId: '1', userId: '5000' })
    .catch(() => {
      assert.deepEqual(storeMock.dispatch.getCall(0).args[1], {
        newRole: 'coach',
        userId: '5000',
      });
      assert.deepEqual(storeMock.dispatch.getCall(1).args[1], {
        newRole: 'learner',
        userId: '5000',
      });
      assert.deepEqual(storeMock.dispatch.getCall(2).args, [
        'CORE_SET_ERROR', '"save error"',
      ]);
      done();
    });
  });
});
