/* eslint-env mocha */
const kolibri = require('kolibri');
const sinon = require('sinon');

// need to mock all this stuff before loading the module
kolibri.resources.FacilityUserResource = {
  getModel: () => {},
};

kolibri.resources.RoleResource = {
  getModel: () => {},
};

const removeCoachRoleAction = require('../../src/state/removeCoachRoleAction').default;

const fakeUser = {
  roles: [
    { id: 'role_1', collection: 'facility_1' },
    { id: 'role_2', collection: 'class_2' },
    { id: 'role_3', collection: 'class_3' },
  ]
};

describe('removeCoachRoleAction', () => {
  const storeMock = {
    dispatch: sinon.spy(),
  };

  afterEach(() => {
    storeMock.dispatch.reset();
  });

  after(() => { kolibri.resources = {}; });

  it('successfully removes the correct role on server and client', (done) => {
    const fetchUserStub = sinon.stub().returns({
      _promise: Promise.resolve(fakeUser),
    });
    const getUserModelStub = sinon.stub(kolibri.resources.FacilityUserResource, 'getModel')
      .returns({ fetch: fetchUserStub });

    const deleteRoleSpy = sinon.spy();
    const getRoleModelStub = sinon.stub(kolibri.resources.RoleResource, 'getModel')
      .returns({ delete: deleteRoleSpy });


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
      getUserModelStub.restore();
      getRoleModelStub.restore();
    })
    .then(done, done);
  });

  it('handles errors from the server', (done) => {
    const fetchUserStub = () => ({
      _promise: Promise.reject({ entities: 'I don\'t think so' }),
    });
    const getUserModelStub = sinon.stub(kolibri.resources.FacilityUserResource, 'getModel')
      .returns({ fetch: fetchUserStub });
    removeCoachRoleAction(storeMock, { userId: 'user_1', classId: 'class_3' })
    .then(() => {
      sinon.assert.calledOnce(storeMock.dispatch);
      sinon.assert.calledWith(storeMock.dispatch, 'CORE_SET_ERROR');
      getUserModelStub.restore();
    })
    .then(done, done);
  });
});
