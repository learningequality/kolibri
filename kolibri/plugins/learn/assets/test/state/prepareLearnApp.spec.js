/* eslint-env mocha */
const Vue = require('vue');
const Vuex = require('vuex');
const assert = require('assert');
const get = require('lodash/fp/get');
const kolibri = require('kolibri');
const sinon = require('sinon');
const mutations = require('../../src/state/mutations');
const prepareLearnApp = require('../../src/state/prepareLearnApp');

Vue.use(Vuex);

const { MembershipResource } = kolibri.resources;

function makeStore() {
  return new Vuex.Store({
    mutations,
    state: {
      learnAppState: {},
      core: {
        session: {}
      },
    },
  });
}

describe('prepareLearnApp action', () => {
  let store;

  const getMemberships = get('state.learnAppState.memberships');
  const setSessionUserId = (userId) => {
    store.state.core.session.user_id = userId;
  };

  beforeEach(() => {
    store = makeStore();
    MembershipResource.__resetMocks();
  });

  it('does not modify state for guest user', () => {
    setSessionUserId(null);

    return prepareLearnApp(store)
    .then(() => {
      sinon.assert.notCalled(MembershipResource.getCollection);
      assert.equal(getMemberships(store), undefined);
    });
  });

  it('adds memberships to state for logged-in user', () => {
    setSessionUserId(101);
    const fakeMemberships = [
      { id: 'membership_1' },
      { id: 'membership_2' },
    ];
    MembershipResource.__getCollectionFetchReturns(fakeMemberships);

    return prepareLearnApp(store)
    .then(() => {
      sinon.assert.calledWith(MembershipResource.getCollection, { user_id: 101 });
      assert.deepEqual(getMemberships(store), fakeMemberships);
    });
  });

  it('handles errors', () => {
    setSessionUserId(102);
    MembershipResource.__getCollectionFetchReturns('fetch error', true);

    return prepareLearnApp(store)
    .catch(() => {
      sinon.assert.calledWith(MembershipResource.getCollection, { user_id: 102 });
      assert.deepEqual(store.state.core.error, 'fetch error');
      assert.equal(getMemberships(store), undefined);
    });
  });
});
