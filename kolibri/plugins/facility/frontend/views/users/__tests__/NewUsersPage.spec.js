import { computed, ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';

import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';

import { UserKinds } from 'kolibri/constants';
import useUserManagement from '../../../composables/useUserManagement';
import { useUserManagementMock } from '../../../composables/__mocks__/useUserManagement';
import makeStore from '../../../__tests__/utils/makeStore';
import { PageNames } from '../../../constants';
import NewUsersPage from '../NewUsersPage.vue';

jest.mock('kolibri/urls');
jest.mock('lockr');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri-common/composables/useFacility');
jest.mock('../../../composables/useUserManagement');

// Create a router with all routes required by the tests
function createTestRouter() {
  return new VueRouter({
    routes: [
      {
        path: '/users',
        name: PageNames.USER_MGMT_PAGE,
      },
      {
        path: '/users/new-users',
        name: PageNames.NEW_USERS_PAGE,
      },
      {
        path: '/users/new-users/create',
        name: PageNames.ADD_NEW_USER_SIDE_PANEL__NEW_USERS,
      },
      {
        path: '/users/new-users/filters',
        name: PageNames.FILTER_USERS_SIDE_PANEL__NEW_USERS,
      },
    ],
  });
}

describe('NewUsersPage', () => {
  beforeEach(() => {
    useKResponsiveWindow.mockReturnValue({
      windowIsSmall: ref(false),
      windowIsShort: ref(false),
      windowBreakpoint: 4,
    });

    useUserManagement.mockImplementation(() =>
      useUserManagementMock({
        numAppliedFilters: computed(() => 0),
      }),
    );
  });

  it('shows only the empty-state create-user link when there are no new users', async () => {
    const router = createTestRouter();

    await router.push({ name: PageNames.NEW_USERS_PAGE });

    render(NewUsersPage, {
      store: makeStore(),
      router,
    });

    expect(
      screen.getByRole('link', {
        name: bulkUserManagementStrings.createNewUserLabel$(),
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('link', {
        name: bulkUserManagementStrings.newUser$(),
      }),
    ).not.toBeInTheDocument();
  });

  it('shows the header create-user link when a filter is applied', async () => {
    useUserManagement.mockImplementation(() =>
      useUserManagementMock({
        numAppliedFilters: computed(() => 1),
      }),
    );

    const router = createTestRouter();

    await router.push({ name: PageNames.NEW_USERS_PAGE });

    render(NewUsersPage, {
      store: makeStore(),
      router,
    });

    expect(
      screen.getByRole('link', {
        name: bulkUserManagementStrings.newUser$(),
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('link', {
        name: bulkUserManagementStrings.createNewUserLabel$(),
      }),
    ).not.toBeInTheDocument();
  });

  it('shows the header create-user link when new users exist', async () => {
    useUserManagement.mockImplementation(() =>
      useUserManagementMock({
        facilityUsers: computed(() => [
          {
            id: 'user-1',
            full_name: 'Ana Silva',
            username: 'ana',
            kind: UserKinds.LEARNER,
            date_joined: '2026-10-01T12:00:00Z',
          },
        ]),
        numAppliedFilters: computed(() => 0),
      }),
    );

    const router = createTestRouter();

    await router.push({ name: PageNames.NEW_USERS_PAGE });

    render(NewUsersPage, {
      store: makeStore(),
      router,
    });

    expect(
      screen.getByRole('link', {
        name: bulkUserManagementStrings.newUser$(),
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('link', {
        name: bulkUserManagementStrings.createNewUserLabel$(),
      }),
    ).not.toBeInTheDocument();
  });

  it('shows the header create-user link when a search is applied', async () => {
    useUserManagement.mockImplementation(() =>
      useUserManagementMock({
        facilityUsers: computed(() => []),
        search: computed(() => 'Ana'),
        numAppliedFilters: computed(() => 0),
      }),
    );

    const router = createTestRouter();

    await router.push({
      name: PageNames.NEW_USERS_PAGE,
    });

    render(NewUsersPage, {
      store: makeStore(),
      router,
    });

    expect(
      screen.getByRole('link', {
        name: bulkUserManagementStrings.newUser$(),
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('link', {
        name: bulkUserManagementStrings.createNewUserLabel$(),
      }),
    ).not.toBeInTheDocument();
  });
});
