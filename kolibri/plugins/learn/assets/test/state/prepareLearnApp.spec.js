/* eslint-env mocha */
const prepareLearnApp = require('../../src/state/prepareLearnApp');
const Vue = require('vue');
const Vuex = require('vuex');
const sinon = require('sinon');
const assert = require('assert');
const kolibri = require('kolibri');

Vue.use(Vuex);

const { MembershipResource } = kolibri.resources;

function makeStore() {
  return new Vuex.Store({
    state: {
      learnAppState: {},
      core: {
        session: {}
      },
    },
  });
}

describe.only('prepareLearnApp action', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = makeStore();
    mockStore.state.core.session = {};
    MembershipResource.__resetMocks();
  });

  it('prepares app state for guest user', () => {
    mockStore.state.core.session.user_id = null;

    return prepareLearnApp(mockStore)
    .then(() => {
      sinon.assert.notCalled(MembershipResource.getCollection);
      assert.equal(mockStore.state.learnAppState.userMemberships, []);
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
