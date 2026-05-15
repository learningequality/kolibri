import { render, screen } from '@testing-library/vue';
import { ref } from 'vue';
import store from 'kolibri/store';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line import-x/named
import classSummaryModule from '../../../modules/classSummary';
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

  if (!store.hasModule('classSummary')) {
    store.registerModule('classSummary', classSummaryModule);
  }
  store.replaceState(testStore.state);

  return render(CoachAllPasswordsPage, { routes });
}

describe('CoachAllPasswordsPage', () => {
  afterEach(() => {
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
});
