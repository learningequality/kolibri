/* eslint-env mocha */
const assert = require('assert');
const kolibri = require('kolibri');
const sinon = require('sinon');
const prepareLearnApp = require('../../src/state/prepareLearnApp');
const makeStore = require('../util/makeStore');

const { MembershipResource } = kolibri.resources;

describe('prepareLearnApp action', () => {
  let store;

  const getMemberships = ({ state }) => state.learnAppState.memberships;
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
      assert.deepEqual(getMemberships(store), []);
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
      assert.deepEqual(getMemberships(store), []);
    });
  });
});
