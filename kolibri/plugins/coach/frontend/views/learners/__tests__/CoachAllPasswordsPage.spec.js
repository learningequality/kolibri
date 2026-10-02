import { render, screen } from '@testing-library/vue';
import { nextTick, ref } from 'vue';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { error } from 'kolibri/utils/appError';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line import-x/named
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import store from '../../../store';
import makeStore from '../../../__tests__/utils/makeStore';
import CoachAllPasswordsPage from '../CoachAllPasswordsPage.vue';

jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => () => ({
  windowBreakpoint: { value: 4 },
}));
jest.mock('vue-router/composables', () => ({
  useRoute: jest.fn(() => ({ params: {}, query: {}, name: null })),
  useRouter: jest.fn(() => ({ push: jest.fn(), currentRoute: {} })),
}));
jest.mock('kolibri-common/utils/picturePassword', () => ({
  getPicturePasswordIcons: jest.fn(() => []),
}));
jest.mock('kolibri/components/pages/NotificationsRoot/internal/PingbackNotificationResource');
jest.mock(
  'kolibri/components/pages/NotificationsRoot/internal/PingbackNotificationDismissedResource',
);

const FACILITY_NAME = 'Test Facility';
const CLASS_NAME = 'Test Class';
// classSummary stores learners with `name`, not `full_name` (aliased in the Python API)
const LEARNERS = [
  { id: 'u1', name: 'Alice Smith', username: 'alice', picture_password: '3.7.12' },
  { id: 'u2', name: 'Bob Jones', username: 'bob', picture_password: null },
];

const routes = [
  { path: '/home', name: 'HOME_PAGE' },
  { path: '/learners', name: 'LEARNERS_ROOT' },
];

function renderComponent({ learners = LEARNERS, className = CLASS_NAME } = {}) {
  useUser.mockImplementation(() => useUserMock({ isCoach: true }));
  useFacility.mockImplementation(() =>
    useFacilityMock({ currentFacilityName: ref(FACILITY_NAME) }),
  );
  const testStore = makeStore();
  const learnerMap = {};
  learners.forEach(l => {
    learnerMap[l.id] = l;
  });
  testStore.state.classSummary.learnerMap = learnerMap;
  testStore.state.classSummary.name = className;

  store.replaceState(testStore.state);

  return render(CoachAllPasswordsPage, { routes });
}

describe('CoachAllPasswordsPage', () => {
  afterEach(() => {
    error.value = null;
    jest.clearAllMocks();
  });

  it('passes classSummary learners into AllPasswordsPage', () => {
    renderComponent();
    expect(screen.getByText(LEARNERS[0].name)).toBeInTheDocument();
    expect(screen.getByText(LEARNERS[1].name)).toBeInTheDocument();
  });

  it('renders learners when a custom className is provided', () => {
    renderComponent({ className: 'My Class' });
    expect(screen.getByText(LEARNERS[0].name)).toBeInTheDocument();
    expect(screen.getByText(LEARNERS[1].name)).toBeInTheDocument();
  });

  it('renders a learner with picture_password and a learner without one', () => {
    renderComponent();
    expect(screen.getByText(LEARNERS[0].name)).toBeInTheDocument();
    expect(screen.getByText(LEARNERS[1].name)).toBeInTheDocument();
  });

  it('renders an empty table when classSummary has no learners', () => {
    renderComponent({ learners: [] });
    expect(screen.queryByText(LEARNERS[0].name)).not.toBeInTheDocument();
  });

  describe('while an error is set', () => {
    beforeEach(async () => {
      renderComponent();
      error.value = 'boom';
      await nextTick();
    });

    it("shows the error page's heading as the only H1", () => {
      const headings = screen.queryAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
      expect(headings[0]).not.toHaveClass('visuallyhidden');
      expect(headings[0]).not.toHaveTextContent(picturePasswordStrings.allPasswordsHeader$());
    });

    it('hides the password list', () => {
      expect(screen.queryByText(LEARNERS[0].name)).not.toBeInTheDocument();
    });

    it('titles the tab as an error', () => {
      expect(document.title).toBe('Error - Kolibri');
    });
  });
});
