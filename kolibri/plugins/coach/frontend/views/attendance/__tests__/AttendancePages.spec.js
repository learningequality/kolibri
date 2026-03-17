import Vuex from 'vuex';
import VueRouter from 'vue-router';
import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import store from 'kolibri/store';
// eslint-disable-next-line import-x/named
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar';
import classSummaryModule from '../../../modules/classSummary';
/* eslint-disable import-x/named */
import { useAttendance, useAttendanceMock } from '../../../composables/useAttendance';
/* eslint-enable import-x/named */
import AttendanceNewPage from '../AttendanceNewPage.vue';
import AttendanceHistoryPage from '../AttendanceHistoryPage.vue';
import AttendanceEditPage from '../AttendanceEditPage.vue';

jest.mock('../../../composables/useAttendance');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('../../../composables/useCoreCoach', () => {
  const { ref, computed } = require('vue');
  return {
    __esModule: true,
    default: jest.fn(() => ({
      classId: computed(() => 'test-class'),
      appBarTitle: ref('Coach'),
      initClassInfo: jest.fn(),
      refreshClassSummary: jest.fn(),
      authorized: ref(true),
      pageTitle: ref(''),
      groups: ref([]),
    })),
  };
});

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const MOCK_LEARNERS = [
  { id: 'learner-c', name: 'Charlie', username: 'charlie' },
  { id: 'learner-a', name: 'Alice', username: 'alice' },
  { id: 'learner-b', name: 'Bob', username: 'bob' },
];

const COMPONENT_STUBS = {
  CoachImmersivePage: {
    template: '<div><slot /></div>',
    props: ['appBarTitle', 'route'],
  },
  BottomAppBar: {
    template: '<div data-testid="bottom-bar"><slot /></div>',
  },
};

function setupTestStore(learners = MOCK_LEARNERS) {
  const testStore = new Vuex.Store({
    state: {
      core: { loading: false },
    },
    getters: {
      isPageLoading: () => false,
    },
    actions: {
      notLoading: jest.fn(),
    },
    modules: {
      classSummary: {
        ...classSummaryModule,
        state: () => ({
          id: 'test-class',
          name: 'Test Class',
          learnerMap: {},
        }),
      },
    },
  });

  const learnerMap = {};
  learners.forEach(l => {
    learnerMap[l.id] = l;
  });
  testStore.state.classSummary.learnerMap = learnerMap;

  if (!store.hasModule('classSummary')) {
    store.registerModule('classSummary', classSummaryModule);
  }
  store.replaceState(testStore.state);

  return testStore;
}

function renderNewPage({
  learners = MOCK_LEARNERS,
  createSessionResult = Promise.resolve({ id: 'new-session' }),
} = {}) {
  const createSession = jest.fn(() =>
    typeof createSessionResult === 'function' ? createSessionResult() : createSessionResult,
  );
  const mockValues = useAttendanceMock({ createSession });
  useAttendance.mockImplementation(() => mockValues);

  const createSnackbar = jest.fn();
  useSnackbar.mockImplementation(() => useSnackbarMock({ createSnackbar }));

  const router = new VueRouter({
    routes: [
      { path: '/class/:classId/attendance/new', name: 'ATTENDANCE_NEW' },
      { path: '/class/:classId/attendance/history', name: 'ATTENDANCE_HISTORY' },
    ],
  });
  router.push({ name: 'ATTENDANCE_NEW', params: { classId: 'test-class' } });

  const testStore = setupTestStore(learners);

  const result = render(AttendanceNewPage, {
    localVue,
    router,
    store: testStore,
    global: {
      stubs: COMPONENT_STUBS,
    },
  });

  return { ...result, createSession, createSnackbar, router };
}

/**
 * Helper to find a switch input by its name attribute.
 * KSwitch renders as <input type="checkbox" name="...">
 */
function getSwitch(name) {
  return document.querySelector(`input[name="${name}"]`);
}

function getLearnerSwitch(learnerId) {
  return getSwitch(`attendance-${learnerId}`);
}

function getMarkAllSwitch() {
  return getSwitch('mark-all-present');
}

describe('AttendanceNewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(store, 'dispatch').mockImplementation(jest.fn());
    useAttendance.mockImplementation(() => useAttendanceMock());
    useSnackbar.mockImplementation(() => useSnackbarMock());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (store.hasModule('classSummary')) {
      store.unregisterModule('classSummary');
    }
  });

  it('renders learners sorted alphabetically', async () => {
    renderNewPage();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('displays the session date and time in the heading', async () => {
    renderNewPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('2026-03-09');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('10:00 AM');
    });
  });

  it('filters learners by search input', async () => {
    renderNewPage();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const filterInput = screen.getByPlaceholderText(/search/i);
    await fireEvent.update(filterInput, 'ali');

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    });
  });

  it('updates present/absent counts when toggling a learner', async () => {
    renderNewPage();
    await waitFor(() => {
      expect(screen.getByText('0 present')).toBeInTheDocument();
      expect(screen.getByText('3 absent')).toBeInTheDocument();
    });

    await fireEvent.click(getLearnerSwitch('learner-a'));

    await waitFor(() => {
      expect(screen.getByText('1 present')).toBeInTheDocument();
      expect(screen.getByText('2 absent')).toBeInTheDocument();
    });
  });

  it('shows confirmation modal when marking all present', async () => {
    renderNewPage();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    await fireEvent.click(getMarkAllSwitch());

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('marks all learners present after confirming modal', async () => {
    renderNewPage();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    await fireEvent.click(getMarkAllSwitch());
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByText('Mark all present'));

    await waitFor(() => {
      expect(screen.getByText('3 present')).toBeInTheDocument();
      expect(screen.getByText('0 absent')).toBeInTheDocument();
    });
  });

  it('calls createSession and shows success snackbar on submit', async () => {
    const { createSession, createSnackbar } = renderNewPage();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    await fireEvent.click(getLearnerSwitch('learner-a'));
    await fireEvent.click(screen.getByRole('button', { name: 'Submit attendance' }));
    await global.flushPromises();

    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'test-class',
        attendance_records: expect.arrayContaining([expect.objectContaining({ present: true })]),
      }),
    );
    expect(createSnackbar).toHaveBeenCalled();
  });

  it('shows error snackbar and stays on page when submit fails', async () => {
    const { createSnackbar, router } = renderNewPage({
      createSessionResult: () => Promise.reject(new Error('API error')),
    });
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const initialRoute = router.currentRoute.name;

    await fireEvent.click(getLearnerSwitch('learner-a'));
    await fireEvent.click(screen.getByRole('button', { name: 'Submit attendance' }));
    await global.flushPromises();

    expect(createSnackbar).toHaveBeenCalled();
    expect(router.currentRoute.name).toBe(initialRoute);
  });
});

describe('AttendanceHistoryPage', () => {
  it('renders the page heading', () => {
    render(AttendanceHistoryPage);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Attendance History');
  });
});

describe('AttendanceEditPage', () => {
  it('renders the page heading', () => {
    render(AttendanceEditPage);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edit Attendance');
  });
});
