import { mount, RouterLinkStub } from '@vue/test-utils';
import makeStore from '../../../../test/makeStore';
import UserPage from '../index';

UserPage.computed.newUserLink = () => ({});

function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(UserPage, {
    store,
    stubs: {
      RouterLink: RouterLinkStub,
    },
  });
  return { wrapper, store };
}

// Intentionally made to not match any 'kind' filter
const unicornUser = { id: '1', kind: 'UNICORN', username: 'unicorn', full_name: 'unicorn' };
const coachUser = { id: '1', kind: 'coach', username: 'coach', full_name: 'coach' };

describe('UserPage component', () => {
  describe('message in empty states', () => {
    function getUserTableEmptyMessage(wrapper) {
      return wrapper.findComponent({ name: 'UserTable' }).props().emptyMessage;
    }

    it('when there are no users', () => {
      const { wrapper } = makeWrapper();
      expect(getUserTableEmptyMessage(wrapper)).toEqual('No users exist');
    });

    const testCases = [
      ['learner', 'No learners exist'],
      ['coach', 'No coaches exist'],
      ['superuser', 'No super admins exist'],
      ['coach', 'No coaches exist'],
      ['admin', 'No admins exist'],
    ];

    test.each(testCases)('when filter is %s', async (kind, expected) => {
      const { wrapper, store } = makeWrapper();
      store.state.userManagement.facilityUsers = [{ ...unicornUser }];
      wrapper.setData({ roleFilter: { value: kind } });
      await wrapper.vm.$nextTick();
      expect(getUserTableEmptyMessage(wrapper)).toEqual(expected);
    });

    it('if a keyword filter is applied, the empty message is "no users match..."', async () => {
      const { wrapper, store } = makeWrapper();
      store.state.userManagement.facilityUsers = [{ ...coachUser }];
      wrapper.setData({ roleFilter: { value: 'coach' } });
      wrapper.findComponent({ name: 'PaginatedListContainer' }).setData({ filterInput: 'coachy' });
      await wrapper.vm.$nextTick();
      expect(getUserTableEmptyMessage(wrapper)).toEqual("No users match the filter: 'coachy'");
    });
  });
});
