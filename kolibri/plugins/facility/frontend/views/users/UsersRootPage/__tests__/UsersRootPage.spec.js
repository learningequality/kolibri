import { computed } from 'vue';
import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
// eslint-disable-next-line import-x/named
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility';
import useUserManagement from '../../../../composables/useUserManagement';
import { useUserManagementMock } from '../../../../composables/__mocks__/useUserManagement';
import makeStore from '../../../../__tests__/utils/makeStore';
import UserPage from '../index';

const { usersLabel$, searchForUser$, filter$, optionsLabel$ } = coreStrings;
const { noUsersMatchSearch$, noUsersMatchFilter$, noUsersMatchFiltersAndSearch$ } =
  bulkUserManagementStrings;

jest.mock('kolibri/urls');
jest.mock('lockr');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri-common/composables/useFacility');
jest.mock('../../../../composables/useUserManagement');

const router = new VueRouter({
  routes: [
    {
      path: '/userpage/',
      name: 'UserPage',
    },
    {
      path: '/userpage/new/',
      name: 'ADD_NEW_USER_SIDE_PANEL__NEW_USERS',
    },
    {
      path: '/userpage/filters/',
      name: 'FILTER_USERS_SIDE_PANEL',
    },
  ],
});

async function renderPage({ routeQuery = {}, userManagement = {} } = {}) {
  const store = makeStore();
  useUserManagement.mockImplementation(() =>
    useUserManagementMock({
      ...userManagement,
    }),
  );
  await router.push({ name: 'UserPage', query: routeQuery });
  const UserPageWithStubbedNewUserLink = {
    extends: UserPage,
    computed: {
      ...(UserPage.computed || {}),
      newUserLink() {
        return {};
      },
    },
  };
  return render(UserPageWithStubbedNewUserLink, {
    store,
    router,
  });
}

describe('UserPage component', () => {
  beforeEach(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
      windowBreakpoint: 4,
    }));
    useFacility.mockImplementation(() => useFacilityMock());
    useUserManagement.mockImplementation(() => useUserManagementMock());
  });

  it('shows the main users management controls', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { name: usersLabel$() })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: searchForUser$() })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: filter$() })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: optionsLabel$() })).toBeInTheDocument();
  });

  it('shows a search-specific empty state when no users match the search term', async () => {
    const usersInFacility = [
      {
        id: 'alice-1',
        full_name: 'Alice Johnson',
        username: 'alice',
      },
      {
        id: 'bob-2',
        full_name: 'Bob Stone',
        username: 'bstone',
      },
    ];
    const searchQuery = 'coachy';
    const searchResults = usersInFacility.filter(user => {
      const normalizedSearch = searchQuery.toLowerCase();
      return (
        user.full_name.toLowerCase().includes(normalizedSearch) ||
        user.username.toLowerCase().includes(normalizedSearch)
      );
    });

    await renderPage({
      routeQuery: { search: searchQuery },
      userManagement: {
        facilityUsers: computed(() => searchResults),
      },
    });

    expect(usersInFacility).toHaveLength(2);
    expect(searchResults).toHaveLength(0);
    expect(screen.getByText(noUsersMatchSearch$())).toBeInTheDocument();
  });

  it('shows a filter-specific empty state when filters are applied', async () => {
    await renderPage({
      userManagement: {
        facilityUsers: computed(() => []),
        numAppliedFilters: computed(() => 1),
      },
    });

    expect(screen.getByText(noUsersMatchFilter$({ filtersCount: 1 }))).toBeInTheDocument();
  });

  it('shows combined empty-state messaging when both search and filters are applied', async () => {
    await renderPage({
      routeQuery: { search: 'coachy' },
      userManagement: {
        facilityUsers: computed(() => []),
        numAppliedFilters: computed(() => 2),
      },
    });

    expect(
      screen.getByText(noUsersMatchFiltersAndSearch$({ filtersCount: 2 })),
    ).toBeInTheDocument();
  });
});
