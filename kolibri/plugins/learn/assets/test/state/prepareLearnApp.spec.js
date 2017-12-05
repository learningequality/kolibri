/* eslint-env mocha */
import assert from 'assert';
import sinon from 'sinon';
import prepareLearnApp from '../../src/state/prepareLearnApp';
import makeStore from '../util/makeStore';
import { mockResource } from 'testUtils'; // eslint-disable-line import/no-unresolved

import { MembershipResource } from 'kolibri.resources';

mockResource(MembershipResource);

describe('prepareLearnApp action', () => {
  let store;

  const getMemberships = ({ state }) => state.learnAppState.memberships;
  const setSessionUserId = userId => {
    store.state.core.session.user_id = userId;
  };

  beforeEach(() => {
    store = makeStore();
    MembershipResource.__resetMocks();
  });

  it('does not modify state for guest user', () => {
    setSessionUserId(null);

    return prepareLearnApp(store).then(() => {
      sinon.assert.notCalled(MembershipResource.getCollection);
      assert.deepEqual(getMemberships(store), []);
    });
  });

  it('adds memberships to state for logged-in user', () => {
    setSessionUserId(101);
    const fakeMemberships = [{ id: 'membership_1' }, { id: 'membership_2' }];
    MembershipResource.__getCollectionFetchReturns(fakeMemberships);

    return prepareLearnApp(store).then(() => {
      sinon.assert.calledWith(MembershipResource.getCollection, {
        user: 101,
      });
      assert.deepEqual(getMemberships(store), fakeMemberships);
    });
  });

  it('handles errors', () => {
    setSessionUserId(102);
    MembershipResource.__getCollectionFetchReturns('fetch error', true);

    return prepareLearnApp(store).catch(() => {
      sinon.assert.calledWith(MembershipResource.getCollection, {
        user: 102,
      });
      assert.deepEqual(store.state.core.error, 'fetch error');
      assert.deepEqual(getMemberships(store), []);
    });
  });
});
