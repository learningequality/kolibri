/* eslint-env mocha */
const prepareLearnApp = require('../../src/state/prepareLearnApp');
const sinon = require('sinon');
const kolibri = require('kolibri');

const { MembershipResource } = kolibri.resources;

describe.only('prepareLearnApp action', () => {
  const mockStore = {
    dispatch: sinon.spy(),
    state: {
      core: {
        session: {}
      },
    },
  };

  const dispatchSpy = mockStore.dispatch;

  beforeEach(() => {
    dispatchSpy.reset();
    mockStore.state.core.session = {};
    MembershipResource.__resetMocks();
  });

  it('prepares app state for guest user', () => {
    mockStore.state.core.session.user_id = null;

    return prepareLearnApp(mockStore)
    .then(() => {
      sinon.assert.notCalled(MembershipResource.getCollection);
      sinon.assert.calledWith(dispatchSpy, 'LEARN_SET_MEMBERSHIPS', []);
    });
  });

  it('prepares app state for logged-in user', () => {
    mockStore.state.core.session.user_id = 101;
    const fakeMemberships = [
      { id: 'membership_1' },
      { id: 'membership_2' },
    ];
    MembershipResource.__getCollectionFetchReturns(fakeMemberships);

    return prepareLearnApp(mockStore)
    .then(() => {
      sinon.assert.calledWith(MembershipResource.getCollection, { user_id: 101 });
    });
  });
});
