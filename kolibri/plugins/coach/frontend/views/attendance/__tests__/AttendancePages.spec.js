import Vuex from 'vuex';
import VueRouter from 'vue-router';
import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import store from 'kolibri/store';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
// eslint-disable-next-line import-x/named
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar';
import { attendanceStrings } from 'kolibri-common/strings/attendanceStrings';
import classSummaryModule from '../../../modules/classSummary';
/* eslint-disable import-x/named */
import { useAttendance, useAttendanceMock } from '../../../composables/useAttendance';
/* eslint-enable import-x/named */
import { PageNames } from '../../../constants';
import AttendanceNewPage from '../AttendanceNewPage.vue';
import AttendanceEditPage from '../AttendanceEditPage.vue';

jest.mock('../../../composables/useAttendance');
jest.mock('kolibri/composables/useSnackbar');
jest.mock('kolibri-common/composables/usePageLoading', () => ({
  pageLoading: { value: false },
}));
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

const [LEARNER_CHARLIE, LEARNER_ALICE, LEARNER_BOB] = MOCK_LEARNERS;

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
    // eslint-disable-next-line kolibri/tests-no-stubs
    stubs: COMPONENT_STUBS,
  });

  return { ...result, createSession, createSnackbar, router };
}

const MOCK_SESSION = {
  id: 'session-1',
  collection: 'test-class',
  session_start_datetime: '2026-03-09T10:00:00Z',
};

const MOCK_RECORDS = [
  { user: 'learner-a', present: true, user_name: 'Alice', user_username: 'alice' },
  { user: 'learner-b', present: false, user_name: 'Bob', user_username: 'bob' },
  { user: 'learner-c', present: true, user_name: 'Charlie', user_username: 'charlie' },
];

function renderEditPage({
  learners = MOCK_LEARNERS,
  session = MOCK_SESSION,
  records = MOCK_RECORDS,
  bulkUpdateResult = Promise.resolve({}),
  fetchSession: customFetchSession = null,
  fetchRecords: customFetchRecords = null,
} = {}) {
  const fetchSession = customFetchSession || jest.fn(() => Promise.resolve(session));
  const fetchRecords = customFetchRecords || jest.fn(() => Promise.resolve(records));
  const bulkUpdateRecords = jest.fn(() =>
    typeof bulkUpdateResult === 'function' ? bulkUpdateResult() : bulkUpdateResult,
  );
  const mockValues = useAttendanceMock({ fetchSession, fetchRecords, bulkUpdateRecords });
  useAttendance.mockImplementation(() => mockValues);

  const createSnackbar = jest.fn();
  useSnackbar.mockImplementation(() => useSnackbarMock({ createSnackbar }));

  const router = new VueRouter({
    routes: [
      { path: '/class/:classId/attendance/:attendanceId', name: 'ATTENDANCE_EDIT' },
      { path: '/class/:classId/attendance/history', name: 'ATTENDANCE_HISTORY' },
    ],
  });
  router.push({
    name: 'ATTENDANCE_EDIT',
    params: { classId: 'test-class', attendanceId: 'session-1' },
  });

  const testStore = setupTestStore(learners);

  const result = render(AttendanceEditPage, {
    localVue,
    router,
    store: testStore,
    // eslint-disable-next-line kolibri/tests-no-stubs
    stubs: COMPONENT_STUBS,
  });

  return { ...result, fetchSession, fetchRecords, bulkUpdateRecords, createSnackbar, router };
}

/**
 * Gets an input element by its name attribute.
 * @param {string} name - The name attribute of the input element.
 * @returns {Element|null} The matching input element, or null if not found.
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
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
      expect(screen.getByText(LEARNER_BOB.name)).toBeInTheDocument();
      expect(screen.getByText(LEARNER_CHARLIE.name)).toBeInTheDocument();
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
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
    });

    const filterInput = screen.getByPlaceholderText(attendanceStrings.searchPlaceholder$());
    await fireEvent.update(filterInput, 'ali');

    await waitFor(() => {
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
      expect(screen.queryByText(LEARNER_BOB.name)).not.toBeInTheDocument();
      expect(screen.queryByText(LEARNER_CHARLIE.name)).not.toBeInTheDocument();
    });
  });

  it('updates present/absent counts when toggling a learner', async () => {
    renderNewPage();
    await waitFor(() => {
      expect(screen.getByText(attendanceStrings.presentCount$({ count: 0 }))).toBeInTheDocument();
      expect(screen.getByText(attendanceStrings.absentCount$({ count: 3 }))).toBeInTheDocument();
    });

    await fireEvent.click(getLearnerSwitch('learner-a'));

    await waitFor(() => {
      expect(screen.getByText(attendanceStrings.presentCount$({ count: 1 }))).toBeInTheDocument();
      expect(screen.getByText(attendanceStrings.absentCount$({ count: 2 }))).toBeInTheDocument();
    });
  });

  it('shows confirmation modal when marking all present', async () => {
    renderNewPage();
    await waitFor(() => {
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
    });

    await fireEvent.click(getMarkAllSwitch());

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('wraps mark-all modal action buttons in KButtonGroup', async () => {
    renderNewPage();
    await waitFor(() => {
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
    });

    await fireEvent.click(getMarkAllSwitch());
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');

    // KButtonGroup renders as <div class="button-group">. Without KButtonGroup,
    // no such wrapper exists inside the dialog's actions area.
    const buttonGroup = dialog.querySelector('.button-group');
    expect(buttonGroup).not.toBeNull();

    // Verify both buttons are inside the KButtonGroup wrapper
    const confirmBtn = buttonGroup.querySelector('[data-testid="mark-all-confirm"]');
    expect(confirmBtn).not.toBeNull();
    const buttons = buttonGroup.querySelectorAll('button');
    expect(buttons.length).toBe(2);
  });

  it('re-opens modal on a single click after "Go back" was clicked in the mark-all modal', async () => {
    // Regression: after cancelling the modal, the KSwitch stayed visually "on" even though
    // allPresent was false. The next click fired @change(false) instead of @change(true),
    // so the modal never re-opened — requiring a second click to trigger it again.
    renderNewPage();
    await waitFor(() => {
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
    });

    // First click — opens modal
    await fireEvent.click(getMarkAllSwitch());
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click "Go back" inside the modal
    await fireEvent.click(screen.getByRole('button', { name: coreString('goBackAction') }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Switch should be visually unchecked after cancellation
    expect(getMarkAllSwitch().checked).toBe(false);

    // Second click — should open the modal again in a single click
    await fireEvent.click(getMarkAllSwitch());
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('marks all learners present after confirming modal', async () => {
    renderNewPage();
    await waitFor(() => {
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
    });

    await fireEvent.click(getMarkAllSwitch());
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByText(attendanceStrings.markAllPresentAction$()));

    await waitFor(() => {
      expect(screen.getByText(attendanceStrings.presentCount$({ count: 3 }))).toBeInTheDocument();
      expect(screen.getByText(attendanceStrings.absentCount$({ count: 0 }))).toBeInTheDocument();
    });
  });

  it('calls createSession and redirects with a success snackbar query on submit', async () => {
    const { createSession, createSnackbar } = renderNewPage();
    await waitFor(() => {
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
    });

    await fireEvent.click(getLearnerSwitch('learner-a'));
    await fireEvent.click(
      screen.getByRole('button', { name: attendanceStrings.submitAttendanceAction$() }),
    );
    await global.flushPromises();

    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'test-class',
        attendance_records: expect.arrayContaining([expect.objectContaining({ present: true })]),
      }),
    );
    expect(createSnackbar).not.toHaveBeenCalled();
    expect(window.location.hash).toContain('/class/test-class/attendance/history');
    expect(window.location.hash).toContain('snackbar=');
  });

  it('shows error snackbar and stays on page when submit fails', async () => {
    const { createSnackbar, router } = renderNewPage({
      createSessionResult: () => Promise.reject(new Error('API error')),
    });
    await waitFor(() => {
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
    });

    const initialRoute = router.currentRoute.name;

    await fireEvent.click(getLearnerSwitch('learner-a'));
    await fireEvent.click(
      screen.getByRole('button', { name: attendanceStrings.submitAttendanceAction$() }),
    );
    await global.flushPromises();

    expect(createSnackbar).toHaveBeenCalled();
    expect(router.currentRoute.name).toBe(initialRoute);
  });

  it('Cancel button navigates to ATTENDANCE_HISTORY without passing the click event as query', async () => {
    const { router } = renderNewPage();
    await waitFor(() => {
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
    });

    const pushSpy = jest.spyOn(router, 'push');
    await fireEvent.click(screen.getByRole('button', { name: coreString('cancelAction') }));

    expect(pushSpy).toHaveBeenCalledTimes(1);
    const routeArg = pushSpy.mock.calls[0][0];
    expect(routeArg.name).toBe(PageNames.ATTENDANCE_HISTORY);
    expect(routeArg.query).toEqual({});
  });
});

describe('AttendanceEditPage', () => {
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

  it('fetches session and records on mount and pre-populates learner toggles', async () => {
    const { fetchSession, fetchRecords } = renderEditPage();
    await global.flushPromises();

    await waitFor(() => {
      expect(fetchSession).toHaveBeenCalledWith('session-1');
      expect(fetchRecords).toHaveBeenCalledWith('session-1');
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
    });

    // Sorted: Alice (present), Bob (absent), Charlie (present)
    expect(getLearnerSwitch('learner-a').checked).toBe(true);
    expect(getLearnerSwitch('learner-b').checked).toBe(false);
    expect(getLearnerSwitch('learner-c').checked).toBe(true);
  });

  it('does not render content while session is loading', () => {
    renderEditPage({
      fetchSession: jest.fn(() => new Promise(() => {})),
      fetchRecords: jest.fn(() => new Promise(() => {})),
    });

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText(LEARNER_ALICE.name)).not.toBeInTheDocument();
  });

  it('displays the session date and time in the heading', async () => {
    renderEditPage();
    await global.flushPromises();

    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('2026-03-09');
      expect(heading).toHaveTextContent('10:00 AM');
    });
  });

  it('tracks change count against original state', async () => {
    renderEditPage();
    await global.flushPromises();

    await waitFor(() => {
      expect(screen.getByText(attendanceStrings.presentCount$({ count: 2 }))).toBeInTheDocument();
      expect(screen.getByText(attendanceStrings.absentCount$({ count: 1 }))).toBeInTheDocument();
    });

    // Toggle Bob from absent to present — 1 change
    await fireEvent.click(getLearnerSwitch('learner-b'));

    await waitFor(() => {
      expect(screen.getByText(attendanceStrings.presentCount$({ count: 3 }))).toBeInTheDocument();
      expect(screen.getByText(attendanceStrings.absentCount$({ count: 0 }))).toBeInTheDocument();
    });
  });

  it('disables save button when no changes have been made', async () => {
    renderEditPage();
    await global.flushPromises();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: coreString('saveAction') })).toBeDisabled();
    });
  });

  it('shows save confirmation modal with change count and summary', async () => {
    renderEditPage();
    await global.flushPromises();

    await waitFor(() => {
      expect(screen.getByText(LEARNER_BOB.name)).toBeInTheDocument();
    });

    // Toggle Bob from absent to present (1 change)
    await fireEvent.click(getLearnerSwitch('learner-b'));

    // Click save
    await fireEvent.click(screen.getByRole('button', { name: coreString('saveAction') }));

    await waitFor(() => {
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveTextContent('1');
      expect(modal).toHaveTextContent(attendanceStrings.presentCount$({ count: 3 }));
      expect(modal).toHaveTextContent(attendanceStrings.absentCount$({ count: 0 }));
    });
  });

  it('calls bulkUpdateRecords and redirects with a success snackbar query on confirmed save', async () => {
    const { bulkUpdateRecords, createSnackbar } = renderEditPage();
    await global.flushPromises();

    await waitFor(() => {
      expect(screen.getByText(LEARNER_BOB.name)).toBeInTheDocument();
    });

    // Toggle Bob from absent to present
    await fireEvent.click(getLearnerSwitch('learner-b'));

    // Click save to open modal
    await fireEvent.click(screen.getByRole('button', { name: coreString('saveAction') }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Confirm save in modal — the KModal submit button is inside the dialog
    const dialog = screen.getByRole('dialog');
    const submitBtn = dialog.querySelector('button[type="submit"]');
    await fireEvent.click(submitBtn);
    await global.flushPromises();

    expect(bulkUpdateRecords).toHaveBeenCalledWith('session-1', [
      { user: 'learner-b', present: true },
    ]);
    expect(createSnackbar).not.toHaveBeenCalled();
    expect(window.location.hash).toContain('/class/test-class/attendance/history');
    expect(window.location.hash).toContain('snackbar=');
  });

  it('shows error snackbar and stays on page when save fails', async () => {
    const { createSnackbar, router } = renderEditPage({
      bulkUpdateResult: () => Promise.reject(new Error('API error')),
    });
    await global.flushPromises();

    await waitFor(() => {
      expect(screen.getByText(LEARNER_BOB.name)).toBeInTheDocument();
    });
    const initialRoute = router.currentRoute.name;

    // Toggle a learner
    await fireEvent.click(getLearnerSwitch('learner-b'));

    // Click save
    await fireEvent.click(screen.getByRole('button', { name: coreString('saveAction') }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Confirm save in modal
    const dialog = screen.getByRole('dialog');
    const submitBtn = dialog.querySelector('button[type="submit"]');
    await fireEvent.click(submitBtn);
    await global.flushPromises();

    expect(createSnackbar).toHaveBeenCalled();
    expect(router.currentRoute.name).toBe(initialRoute);
  });

  it('shows no-learners message when the session has no records at all', async () => {
    renderEditPage({ learners: [], records: [] });
    await global.flushPromises();

    await waitFor(() => {
      expect(screen.getByText(attendanceStrings.noLearnersInClassMessage$())).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', { name: coreString('saveAction') }),
    ).not.toBeInTheDocument();
  });

  it('shows previously enrolled section (no save button) when all learners are removed but records exist', async () => {
    const records = [
      { user: 'learner-a', present: true, user_name: 'Alice', user_username: 'alice' },
    ];
    renderEditPage({ learners: [], records });
    await global.flushPromises();

    await waitFor(() => {
      expect(
        screen.getByText(attendanceStrings.previouslyEnrolledLabel$({ name: LEARNER_ALICE.name })),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText(attendanceStrings.noLearnersInClassMessage$()),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: coreString('saveAction') }),
    ).not.toBeInTheDocument();
  });

  it('does not show learners added after the session was created', async () => {
    // learner-a was in the class in January and has a record.
    // learner-b was added in July and has no record for this session.
    // learner-b should not appear on the edit page at all.
    const records = [
      { user: 'learner-a', present: true, user_name: 'Alice', user_username: 'alice' },
    ];
    renderEditPage({
      learners: [
        { id: 'learner-a', name: 'Alice', username: 'alice' },
        { id: 'learner-b', name: 'Bob', username: 'bob' },
      ],
      records,
    });
    await global.flushPromises();

    await waitFor(() => {
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
    });

    // Bob joined after this session — should not appear at all
    expect(screen.queryByText(LEARNER_BOB.name)).not.toBeInTheDocument();
    expect(
      screen.queryByText(attendanceStrings.previouslyEnrolledLabel$({ name: LEARNER_BOB.name })),
    ).not.toBeInTheDocument();
  });

  it('shows searchable list for previously enrolled when no current learners exist', async () => {
    // All learners removed — previously enrolled should get their own PaginatedListContainer
    // with a search box, not just a static list.
    const records = [
      { user: 'learner-a', present: true, user_name: 'Alice', user_username: 'alice' },
      { user: 'learner-b', present: false, user_name: 'Bob', user_username: 'bob' },
    ];
    renderEditPage({ learners: [], records });
    await global.flushPromises();

    await waitFor(() => {
      expect(
        screen.getByText(attendanceStrings.previouslyEnrolledLabel$({ name: LEARNER_ALICE.name })),
      ).toBeInTheDocument();
      expect(
        screen.getByText(attendanceStrings.previouslyEnrolledLabel$({ name: LEARNER_BOB.name })),
      ).toBeInTheDocument();
    });

    // Search box should be present for filtering previously enrolled learners
    expect(screen.getByPlaceholderText(attendanceStrings.searchPlaceholder$())).toBeInTheDocument();

    // Both previously enrolled toggles should be disabled
    const aliceSwitch = document.querySelector('input[name="attendance-removed-learner-a"]');
    const bobSwitch = document.querySelector('input[name="attendance-removed-learner-b"]');
    expect(aliceSwitch.disabled).toBe(true);
    expect(bobSwitch.disabled).toBe(true);
  });

  it('shows previously enrolled learners at the bottom with "(Previously enrolled)" label', async () => {
    // learner-b and learner-c have been removed from the class; their records survive.
    const records = [
      { user: 'learner-a', present: true, user_name: 'Alice', user_username: 'alice' },
      { user: 'learner-b', present: true, user_name: 'Bob', user_username: 'bob' },
      { user: 'learner-c', present: false, user_name: 'Charlie', user_username: 'charlie' },
    ];
    renderEditPage({
      learners: [{ id: 'learner-a', name: 'Alice', username: 'alice' }],
      records,
    });
    await global.flushPromises();

    await waitFor(() => {
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
      expect(
        screen.getByText(attendanceStrings.previouslyEnrolledLabel$({ name: LEARNER_BOB.name })),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          attendanceStrings.previouslyEnrolledLabel$({ name: LEARNER_CHARLIE.name }),
        ),
      ).toBeInTheDocument();
    });
  });

  it('previously enrolled toggles are disabled', async () => {
    const records = [
      { user: 'learner-a', present: true, user_name: 'Alice', user_username: 'alice' },
      { user: 'learner-b', present: true, user_name: 'Bob', user_username: 'bob' },
    ];
    renderEditPage({
      learners: [{ id: 'learner-a', name: 'Alice', username: 'alice' }],
      records,
    });
    await global.flushPromises();

    await waitFor(() => {
      expect(
        screen.getByText(attendanceStrings.previouslyEnrolledLabel$({ name: LEARNER_BOB.name })),
      ).toBeInTheDocument();
    });

    const removedSwitch = document.querySelector('input[name="attendance-removed-learner-b"]');
    expect(removedSwitch).not.toBeNull();
    expect(removedSwitch.disabled).toBe(true);
  });

  it('includes previously enrolled learners in present and absent counts', async () => {
    // Alice (current, present) + Bob (removed, present) + Charlie (removed, absent)
    const records = [
      { user: 'learner-a', present: true, user_name: 'Alice', user_username: 'alice' },
      { user: 'learner-b', present: true, user_name: 'Bob', user_username: 'bob' },
      { user: 'learner-c', present: false, user_name: 'Charlie', user_username: 'charlie' },
    ];
    renderEditPage({
      learners: [{ id: 'learner-a', name: 'Alice', username: 'alice' }],
      records,
    });
    await global.flushPromises();

    await waitFor(() => {
      expect(screen.getByText(attendanceStrings.presentCount$({ count: 2 }))).toBeInTheDocument();
      expect(screen.getByText(attendanceStrings.absentCount$({ count: 1 }))).toBeInTheDocument();
    });
  });

  it('does not show negative absent count when records include removed learners', async () => {
    // All 3 learners were present; 2 of 3 have since been removed.
    // Total: 3 present, 0 absent — previously enrolled are included in the count.
    const records = [
      { user: 'learner-a', present: true, user_name: 'Alice', user_username: 'alice' },
      { user: 'learner-b', present: true, user_name: 'Bob', user_username: 'bob' },
      { user: 'learner-c', present: true, user_name: 'Charlie', user_username: 'charlie' },
    ];
    renderEditPage({ learners: [{ id: 'learner-a', name: 'Alice', username: 'alice' }], records });
    await global.flushPromises();

    await waitFor(() => {
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
    });

    // 3 total present (Alice current + Bob and Charlie previously enrolled), 0 absent.
    expect(screen.getByText(attendanceStrings.presentCount$({ count: 3 }))).toBeInTheDocument();
    expect(screen.getByText(attendanceStrings.absentCount$({ count: 0 }))).toBeInTheDocument();
  });

  it('Cancel button navigates to ATTENDANCE_HISTORY without passing the click event as query', async () => {
    const { router } = renderEditPage();
    await global.flushPromises();

    await waitFor(() => {
      expect(screen.getByText(LEARNER_ALICE.name)).toBeInTheDocument();
    });

    const pushSpy = jest.spyOn(router, 'push');
    await fireEvent.click(screen.getByRole('button', { name: coreString('cancelAction') }));

    expect(pushSpy).toHaveBeenCalledTimes(1);
    const routeArg = pushSpy.mock.calls[0][0];
    expect(routeArg.name).toBe(PageNames.ATTENDANCE_HISTORY);
    expect(routeArg.query).toEqual({});
  });
});
