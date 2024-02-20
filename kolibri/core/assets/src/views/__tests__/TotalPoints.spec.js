import VueRouter from 'vue-router';
import { render, screen, fireEvent } from '@testing-library/vue';
import TotalPoints from '../TotalPoints.vue';
import '@testing-library/jest-dom';

// Create a mock Vuex store with the required getters and actions
// This is a helper function to avoid create a new store for each test and not reuse the same object
const getMockStore = () => {
  return {
    getters: {
      totalPoints: () => 100,
      currentUserId: () => 'user123',
      isUserLoggedIn: () => true,
    },
    actions: {
      fetchPoints: jest.fn(),
    },
  };
};

// Helper function to render the component with Vuex store
const renderComponent = store => {
  return render(TotalPoints, {
    store,
    routes: new VueRouter(),
  });
};

describe('TotalPoints', () => {
  test('renders when user is logged in', async () => {
    const store = getMockStore();
    renderComponent(store);

    expect(screen.getByRole('presentation')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  test('does not render when user is not logged in', async () => {
    const store = getMockStore();
    store.getters.isUserLoggedIn = () => false;
    renderComponent(store);

    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    expect(screen.queryByText('100')).not.toBeInTheDocument();
  });

  test('fetchPoints method is called on created', async () => {
    const store = getMockStore();
    renderComponent(store);

    expect(store.actions.fetchPoints).toHaveBeenCalledTimes(1);
  });

  test('tooltip message is displayed correctly when the mouse hovers over the icon', async () => {
    const store = getMockStore();
    renderComponent(store);

    await fireEvent.mouseOver(screen.getByRole('presentation'));
    expect(screen.getByText('You earned 100 points')).toBeInTheDocument();
  });
});
