import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import { ref } from 'vue';
import store from 'kolibri/store';
import { handleApiError } from 'kolibri/utils/appError';
import makeStore from '../../../../__tests__/utils/makeStore';
import classSummaryModule from '../../../../modules/classSummary';
// eslint-disable-next-line import-x/named
import { useAttendance, useAttendanceMock } from '../../../../composables/useAttendance';
import AttendanceBlock from '../AttendanceBlock.vue';

jest.mock('../../../../composables/useAttendance');
jest.mock('kolibri/utils/appError');
jest.mock('../../../../composables/useCoreCoach', () => {
  const { computed } = jest.requireActual('vue');
  return () => ({
    classId: computed(() => 'test-class-id'),
    pageTitle: computed(() => ''),
    appBarTitle: computed(() => ''),
    authorized: computed(() => true),
  });
});
jest.mock('kolibri/router', () => ({
  getRoute: jest.fn((name, params) => ({ name, params })),
}));
jest.mock('kolibri-design-system/lib/styles/theme', () => ({
  themePalette: () => ({
    green: { v_500: '#00ff00' },
    red: { v_500: '#ff0000' },
  }),
}));

const localVue = createLocalVue();
localVue.use(VueRouter);

const router = new VueRouter({
  routes: [{ path: '/test', name: 'test' }],
});

const MOCK_SESSIONS = [
  {
    id: 'session-1',
    collection: 'class-1',
    created_by: 'coach-1',
    session_start_datetime: '2026-03-09T10:00:00Z',
    present_count: 16,
    total_count: 24,
  },
  {
    id: 'session-2',
    collection: 'class-1',
    created_by: 'coach-1',
    session_start_datetime: '2026-03-08T09:00:00Z',
    present_count: 20,
    total_count: 20,
  },
];

const STUBS = {
  KCircularLoader: {
    name: 'KCircularLoader',
    template: '<div data-testid="loader">Loading...</div>',
  },
  KRouterLink: {
    name: 'KRouterLink',
    props: ['text', 'to'],
    template: '<a>{{ text }}</a>',
  },
  KPageContainer: { name: 'KPageContainer', template: '<div><slot /></div>' },
  KGrid: { name: 'KGrid', template: '<div><slot /></div>' },
  KGridItem: { name: 'KGridItem', template: '<div><slot /></div>' },
  KLabeledIcon: { name: 'KLabeledIcon', template: '<span><slot /></span>' },
};

const MOCK_LEARNERS = [
  { id: 'learner-1', name: 'Learner One', username: 'learner1' },
  { id: 'learner-2', name: 'Learner Two', username: 'learner2' },
];

function makeWrapper({
  sessions = [],
  learners = MOCK_LEARNERS,
  pendingFetch = false,
  rejectWith = null,
} = {}) {
  const recentSessions = ref(sessions);
  let fetchRecentSessions;
  if (rejectWith) {
    fetchRecentSessions = jest.fn(() => Promise.reject(rejectWith));
  } else if (pendingFetch) {
    fetchRecentSessions = jest.fn(() => new Promise(() => {}));
  } else {
    fetchRecentSessions = jest.fn(() => Promise.resolve(sessions));
  }

  const mockValues = useAttendanceMock({
    recentSessions,
    fetchRecentSessions,
  });
  useAttendance.mockImplementation(() => mockValues);

  const testStore = makeStore();

  // Populate learnerMap so the component's learners computed property works
  const learnerMap = {};
  learners.forEach(l => {
    learnerMap[l.id] = l;
  });
  testStore.state.classSummary.learnerMap = learnerMap;

  // Ensure the classSummary module is registered on the singleton store
  // so that store.getters['classSummary/learners'] is available
  if (!store.hasModule('classSummary')) {
    store.registerModule('classSummary', classSummaryModule);
  }

  // Point the kolibri/store singleton state at the test store state
  store.replaceState(testStore.state);

  const wrapper = mount(AttendanceBlock, {
    store: testStore,
    localVue,
    router,
    stubs: STUBS,
  });

  return { wrapper, mock: mockValues };
}

describe('AttendanceBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(store, 'dispatch').mockImplementation(jest.fn());
    useAttendance.mockImplementation(() => useAttendanceMock());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls fetchRecentSessions on mount with the class ID', () => {
    const { mock } = makeWrapper();
    expect(mock.fetchRecentSessions).toHaveBeenCalledWith('test-class-id');
  });

  it('shows loading state while fetchRecentSessions is in flight', () => {
    const { wrapper } = makeWrapper({ pendingFetch: true });
    expect(wrapper.find('[data-testid="loader"]').exists()).toBe(true);
  });

  it('renders empty state when no sessions exist but learners are enrolled', async () => {
    const { wrapper } = makeWrapper({ sessions: [], learners: MOCK_LEARNERS });
    await global.flushPromises();
    expect(wrapper.text()).toContain('No attendance sessions yet');
    expect(wrapper.text()).not.toContain('Enroll learners');
  });

  it('renders enroll message when no sessions and no learners are enrolled', async () => {
    const { wrapper } = makeWrapper({ sessions: [], learners: [] });
    await global.flushPromises();
    expect(wrapper.text()).toContain('No attendance sessions yet');
    expect(wrapper.text()).toContain('Enroll learners to mark attendance');
  });

  it('renders sessions with present and absent counts', async () => {
    const { wrapper } = makeWrapper({ sessions: MOCK_SESSIONS });
    await global.flushPromises();
    // Session 1: 16 present, 8 absent (24-16)
    expect(wrapper.text()).toContain('16');
    expect(wrapper.text()).toContain('8');
    // Session 2: 20 present, 0 absent (20-20)
    expect(wrapper.text()).toContain('20');
    expect(wrapper.text()).toContain('0');
  });

  it('marks bar chart as aria-hidden since it is not meaningful to screen readers', async () => {
    const { wrapper } = makeWrapper({ sessions: MOCK_SESSIONS });
    await global.flushPromises();
    const barContainers = wrapper.findAll('.bar-container');
    expect(barContainers.length).toBe(2);
    expect(barContainers.at(0).attributes('aria-hidden')).toBe('true');
    expect(barContainers.at(0).attributes('role')).toBeUndefined();
  });

  it('keeps visible counts accessible to screen readers (not aria-hidden)', async () => {
    const { wrapper } = makeWrapper({ sessions: MOCK_SESSIONS });
    await global.flushPromises();
    const counts = wrapper.findAll('.counts');
    expect(counts.length).toBe(2);
    expect(counts.at(0).attributes('aria-hidden')).toBeUndefined();
  });

  it('does not render visually hidden summary spans (counts are directly accessible)', async () => {
    const { wrapper } = makeWrapper({ sessions: MOCK_SESSIONS });
    await global.flushPromises();
    expect(wrapper.findAll('.visuallyhidden').length).toBe(0);
  });

  it('calls handleApiError when fetchRecentSessions fails', async () => {
    // Override handleApiError to not re-throw, avoiding unhandled rejection in test
    handleApiError.mockImplementation(() => {});
    const error = new Error('API error');
    makeWrapper({ rejectWith: error });
    await global.flushPromises();
    expect(handleApiError).toHaveBeenCalledWith({ error });
  });
});
