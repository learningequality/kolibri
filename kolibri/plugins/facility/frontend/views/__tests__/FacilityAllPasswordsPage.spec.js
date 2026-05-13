import { render, screen } from '@testing-library/vue';
import { ref } from 'vue';
import store from 'kolibri/store';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line import-x/named
import classEditManagementModule from '../../modules/classEditManagement';
import makeStore from '../../__tests__/utils/makeStore';
import FacilityAllPasswordsPage from '../FacilityAllPasswordsPage.vue';

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
const LEARNERS = [
  { id: 'u1', full_name: 'Alice Smith', username: 'alice', picture_password: '3.7.12' },
  { id: 'u2', full_name: 'Bob Jones', username: 'bob', picture_password: null },
];

const routes = [{ path: '/classes/:id', name: 'CLASS_EDIT_MGMT_PAGE' }];

function renderComponent({ learners = LEARNERS, className = CLASS_NAME } = {}) {
  useFacility.mockImplementation(() =>
    useFacilityMock({ currentFacilityName: ref(FACILITY_NAME) }),
  );
  const testStore = makeStore();
  testStore.state.classEditManagement.classLearners = learners;
  testStore.state.classEditManagement.currentClass = { id: 'class-1', name: className };

  if (!store.hasModule('classEditManagement')) {
    store.registerModule('classEditManagement', classEditManagementModule);
  }
  store.replaceState(testStore.state);

  return render(FacilityAllPasswordsPage, { routes });
}

describe('FacilityAllPasswordsPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('passes classEditManagement learners into AllPasswordsPage', () => {
    renderComponent();
    expect(screen.getByText(LEARNERS[0].full_name)).toBeInTheDocument();
    expect(screen.getByText(LEARNERS[1].full_name)).toBeInTheDocument();
  });

  it('renders a learner with picture_password and a learner without one', () => {
    renderComponent();
    expect(screen.getByText(LEARNERS[0].full_name)).toBeInTheDocument();
    expect(screen.getByText(LEARNERS[1].full_name)).toBeInTheDocument();
  });

  it('renders an empty table when classLearners is empty', () => {
    renderComponent({ learners: [] });
    expect(screen.queryByText(LEARNERS[0].full_name)).not.toBeInTheDocument();
  });

  it('renders learners when a custom className is provided', () => {
    renderComponent({ className: 'My Class' });
    expect(screen.getByText(LEARNERS[0].full_name)).toBeInTheDocument();
    expect(screen.getByText(LEARNERS[1].full_name)).toBeInTheDocument();
  });
});
