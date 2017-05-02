/* eslint-env mocha */
const prepareLearnApp = require('../../src/state/prepareLearnApp');
const Vue = require('vue');
const Vuex = require('vuex');
const sinon = require('sinon');
const assert = require('assert');
const kolibri = require('kolibri');
const coreMutations = require('kolibri.coreVue.vuex.store').mutations;
const mutations = require('../../src/state/mutations');

Vue.use(Vuex);

const { MembershipResource } = kolibri.resources;

function getMemberships(store) {
  return store.state.learnAppState.memberships;
}

function makeStore() {
  return new Vuex.Store({
    mutations: Object.assign({}, coreMutations, mutations),
    state: {
      learnAppState: {},
      core: {
        session: {}
      },
    },
  });
}

describe('prepareLearnApp action', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = makeStore();
    MembershipResource.__resetMocks();
  });

  it('prepares app state for guest user', () => {
    mockStore.state.core.session.user_id = null;

    return prepareLearnApp(mockStore)
    .then(() => {
      sinon.assert.notCalled(MembershipResource.getCollection);
      assert.deepEqual(getMemberships(mockStore), []);
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
      assert.deepEqual(getMemberships(mockStore), fakeMemberships);
    });
  });

  it('handles errors', () => {
    mockStore.state.core.session.user_id = 102;
    MembershipResource.__getCollectionFetchReturns('fetch error', true);

    return prepareLearnApp(mockStore)
    .catch(() => {
      sinon.assert.calledWith(MembershipResource.getCollection, { user_id: 102 });
      assert.deepEqual(mockStore.state.core.error, 'fetch error');
      assert.equal(getMemberships(mockStore), undefined);
    });
  });
});
