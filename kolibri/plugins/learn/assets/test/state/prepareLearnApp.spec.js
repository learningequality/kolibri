import { jestMockResource } from 'testUtils'; // eslint-disable-line import/no-unresolved
import { MembershipResource } from 'kolibri.resources';
import { prepareLearnApp } from '../../src/modules/coreLearn/actions';
import makeStore from '../makeStore';

jestMockResource(MembershipResource);

describe('prepareLearnApp action', () => {
  let store;

  const getMemberships = ({ state }) => state.memberships;
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
      expect(MembershipResource.getCollection).not.toHaveBeenCalled();
      expect(getMemberships(store)).toEqual([]);
    });
  });

  it('adds memberships to state for logged-in user', () => {
    setSessionUserId(101);
    const fakeMemberships = [{ id: 'membership_1' }, { id: 'membership_2' }];
    MembershipResource.__getCollectionFetchReturns(fakeMemberships);

    return prepareLearnApp(store).then(() => {
      expect(MembershipResource.getCollection).toHaveBeenCalledWith({
        user: 101,
      });
      expect(getMemberships(store)).toEqual(fakeMemberships);
    });
  });

  it('handles errors', () => {
    setSessionUserId(102);
    MembershipResource.__getCollectionFetchReturns('fetch error', true);

    return prepareLearnApp(store).catch(() => {
      expect(MembershipResource.getCollection).toHaveBeenCalledWith({
        user: 102,
      });
      expect(store.state.core.error).toEqual('fetch error');
      expect(getMemberships(store)).toEqual([]);
    });
  });
});
