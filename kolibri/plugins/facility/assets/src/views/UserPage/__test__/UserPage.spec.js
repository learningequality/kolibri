import mock from 'xhr-mock';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import makeStore from '../../../../test/makeStore';
import UserPage from '../index';

jest.mock('kolibri/urls');
jest.mock('lockr');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');

const router = new VueRouter({
  routes: [
    {
      path: '/userpage/',
      name: 'UserPage',
    },
  ],
});

UserPage.computed.newUserLink = () => ({});

function makeWrapper() {
  const store = makeStore();
  store.dispatch('notLoading');
  const wrapper = mount(UserPage, {
    store,
    router,
    stubs: ['RouterLinkStub'],
  });
  return { wrapper, store };
}

// Intentionally made to not match any 'kind' filter
const unicornUser = { id: '1', kind: 'UNICORN', username: 'unicorn', full_name: 'unicorn' };
const coachUser = { id: '1', kind: 'coach', username: 'coach', full_name: 'coach' };

describe('UserPage component', () => {
  beforeAll(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
    }));
  });
  // replace the real XHR object with the mock XHR object before each test
  beforeEach(() => mock.setup());

  // put the real XHR object back and clear the mocks after each test
  afterEach(() => mock.teardown());

  describe('message in empty states', () => {
    function getUserTableEmptyMessage(wrapper) {
      return wrapper.findComponent({ name: 'UserTable' }).props().emptyMessage;
    }

    it('when there are no users', () => {
      const { wrapper } = makeWrapper();
      expect(getUserTableEmptyMessage(wrapper)).toEqual('No users exist');
    });

    const testCases = [
      ['learner', 'There are no learners in this facility'],
      ['coach', 'There are no coaches in this facility'],
      ['superuser', 'There are no super admins in this facility'],
      ['admin', 'There are no admins in this facility'],
    ];

    test.each(testCases)('when filter is %s', async (kind, expected) => {
      const { wrapper, store } = makeWrapper();
      store.state.userManagement.facilityUsers = [{ ...unicornUser }];
      wrapper.setData({ roleFilter: { value: kind } });
      await wrapper.vm.$nextTick();
      expect(getUserTableEmptyMessage(wrapper)).toEqual(expected);
    });

    it('if a keyword filter is applied, the empty message is "no users match..."', async () => {
      mock.get(/.*/, {
        status: 200,
        body: JSON.stringify({ results: [], page: 1, total_pages: 1, count: 0 }),
        headers: { 'Content-Type': 'application/json' },
      });

      setTimeout(async () => {
        const { wrapper, store } = makeWrapper();
        store.state.userManagement.facilityUsers = [{ ...coachUser }];
        wrapper.setData({ roleFilter: { value: 'coach' } });
        wrapper
          .findComponent({ name: 'PaginatedListContainer' })
          .setData({ filterInput: 'coachy' });
        await wrapper.vm.$nextTick();
        expect(getUserTableEmptyMessage(wrapper)).toEqual("No users match the filter: 'coachy'");
      }, 1000);
    });
  });
});
