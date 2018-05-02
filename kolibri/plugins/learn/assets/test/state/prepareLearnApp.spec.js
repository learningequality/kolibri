/* eslint-env mocha */
import sinon from 'sinon';
import { expect } from 'chai';
import { mockResource } from 'testUtils'; // eslint-disable-line import/no-unresolved
import { MembershipResource } from 'kolibri.resources';
import prepareLearnApp from '../../src/state/prepareLearnApp';
import makeStore from '../util/makeStore';

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
      expect(getMemberships(store)).to.deep.equal([]);
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
      expect(getMemberships(store)).to.deep.equal(fakeMemberships);
    });
  });

  it('handles errors', () => {
    setSessionUserId(102);
    MembershipResource.__getCollectionFetchReturns('fetch error', true);

    return prepareLearnApp(store).catch(() => {
      sinon.assert.calledWith(MembershipResource.getCollection, {
        user: 102,
      });
      expect(store.state.core.error).to.deep.equal('fetch error');
      expect(getMemberships(store)).to.deep.equal([]);
    });
  });
});
