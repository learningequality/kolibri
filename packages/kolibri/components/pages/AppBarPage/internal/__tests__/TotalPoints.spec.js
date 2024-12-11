import { render, screen, fireEvent } from '@testing-library/vue';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useTotalProgress, { useTotalProgressMock } from 'kolibri/composables/useTotalProgress'; // eslint-disable-line
import '@testing-library/jest-dom';
import { ref } from 'vue';
import { get, set } from '@vueuse/core';
import TotalPoints from '../TotalPoints.vue';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/composables/useTotalProgress');

describe('TotalPoints', () => {
  let totalPointsMock;
  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockImplementation(() => useUserMock());
    totalPointsMock = { totalPoints: ref(0), fetchPoints: jest.fn() };
    useTotalProgress.mockImplementation(() => useTotalProgressMock(totalPointsMock));
  });

  test('renders when user is logged in', async () => {
    useUser.mockImplementation(() => useUserMock({ currentUserId: 1, isUserLoggedIn: true }));
    set(totalPointsMock.totalPoints, 100);
    render(TotalPoints);

    expect(screen.getByRole('presentation')).toBeInTheDocument();
    expect(screen.getByText(get(totalPointsMock.totalPoints))).toBeInTheDocument();
  });

  test('does not render when user is not logged in', async () => {
    useUser.mockImplementation(() => useUserMock({ currentUserId: 1, isUserLoggedIn: false }));
    set(totalPointsMock.totalPoints, 100);
    render(TotalPoints);

    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    expect(screen.queryByText(get(totalPointsMock.totalPoints))).not.toBeInTheDocument();
  });

  test('fetchPoints method is called on created', async () => {
    useUser.mockImplementation(() => useUserMock({ currentUserId: 1, isUserLoggedIn: true }));
    render(TotalPoints);

    expect(totalPointsMock.fetchPoints).toHaveBeenCalledTimes(1);
  });

  test('tooltip message is displayed correctly when the mouse hovers over the icon', async () => {
    useUser.mockImplementation(() => useUserMock({ currentUserId: 1, isUserLoggedIn: true }));
    set(totalPointsMock.totalPoints, 100);
    render(TotalPoints);

    await fireEvent.mouseOver(screen.getByRole('presentation'));
    expect(
      screen.getByText(`You earned ${get(totalPointsMock.totalPoints)} points`),
    ).toBeInTheDocument();
  });
});
