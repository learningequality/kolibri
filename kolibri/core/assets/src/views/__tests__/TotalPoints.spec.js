import { render, screen, fireEvent } from '@testing-library/vue';
import useUser, { useUserMock } from 'kolibri.coreVue.composables.useUser';
import TotalPoints from '../TotalPoints.vue';
import '@testing-library/jest-dom';

let store, storeActions;

jest.mock('kolibri.coreVue.composables.useUser');

// Create a mock Vuex store with the required getters and actions
// This is a helper function to avoid create a new store for each test and not reuse the same object
const getMockStore = () => {
  return {
    getters: {
      totalPoints: () => store.totalPoints,
    },
    actions: {
      fetchPoints: storeActions.fetchPoints,
    },
  };
};

// Helper function to render the component with Vuex store
const renderComponent = store => {
  return render(TotalPoints, {
    store,
  });
};

describe('TotalPoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockImplementation(() => useUserMock());
    store = {
      totalPoints: 0,
    };

    storeActions = {
      fetchPoints: jest.fn(),
    };
  });

  test('renders when user is logged in', async () => {
    useUser.mockImplementation(() => useUserMock({ currentUserId: 1, isUserLoggedIn: true }));
    store.totalPoints = 100;
    renderComponent(getMockStore());

    expect(screen.getByRole('presentation')).toBeInTheDocument();
    expect(screen.getByText(store.totalPoints)).toBeInTheDocument();
  });

  test('does not render when user is not logged in', async () => {
    useUser.mockImplementation(() => useUserMock({ currentUserId: 1, isUserLoggedIn: false }));
    store.totalPoints = 100;
    renderComponent(getMockStore());

    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    expect(screen.queryByText(store.totalPoints)).not.toBeInTheDocument();
  });

  test('fetchPoints method is called on created', async () => {
    useUser.mockImplementation(() => useUserMock({ currentUserId: 1, isUserLoggedIn: true }));
    const mockedStore = getMockStore();
    renderComponent(mockedStore);

    expect(mockedStore.actions.fetchPoints).toHaveBeenCalledTimes(1);
  });

  test('tooltip message is displayed correctly when the mouse hovers over the icon', async () => {
    useUser.mockImplementation(() => useUserMock({ currentUserId: 1, isUserLoggedIn: true }));
    store.totalPoints = 100;
    renderComponent(getMockStore());

    await fireEvent.mouseOver(screen.getByRole('presentation'));
    expect(screen.getByText(`You earned ${store.totalPoints} points`)).toBeInTheDocument();
  });
});
