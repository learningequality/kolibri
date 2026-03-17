import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import { ref } from 'vue';
import store from 'kolibri/store';
import { DateRangeFilters } from 'kolibri-common/constants/DateRangeFilters';
import makeStore from '../../../__tests__/utils/makeStore';
// eslint-disable-next-line import-x/named
import { useAttendance, useAttendanceMock } from '../../../composables/useAttendance';
import AttendanceHistoryPage from '../AttendanceHistoryPage.vue';

jest.mock('../../../composables/useAttendance');
jest.mock('kolibri-common/composables/usePagination', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: jest.fn(() => {
      const currentPage = ref(1);
      return { currentPage, itemsPerPage: ref(10) };
    }),
  };
});
jest.mock('../../../composables/useCoreCoach', () => {
  const { computed } = require('vue');
  return () => ({
    classId: computed(() => 'class-123'),
    pageTitle: computed(() => ''),
    appBarTitle: computed(() => ''),
    authorized: computed(() => true),
  });
});
jest.mock('kolibri/utils/serverClock', () => ({
  now: () => new Date('2026-03-12T12:00:00Z'),
}));

const localVue = createLocalVue();
localVue.use(VueRouter);

const router = new VueRouter({
  routes: [
    { path: '/', name: 'HomePage', component: { template: '<div />' } },
    { path: '/attendance/new', name: 'ATTENDANCE_NEW', component: { template: '<div />' } },
    {
      path: '/attendance/:attendanceId',
      name: 'ATTENDANCE_EDIT',
      component: { template: '<div />' },
    },
  ],
});

const STUBS = {
  BackLink: {
    name: 'BackLink',
    props: ['text', 'to'],
    template: '<a>{{ text }}</a>',
  },
  CoachAppBarPage: { name: 'CoachAppBarPage', template: '<div><slot /></div>' },
  KButton: {
    name: 'KButton',
    props: ['text', 'primary', 'to'],
    template: '<button>{{ text }}</button>',
  },
  KRouterLink: {
    name: 'KRouterLink',
    props: ['text', 'to', 'icon'],
    template: '<a>{{ text }}</a>',
  },
  KPageContainer: { name: 'KPageContainer', template: '<div><slot /></div>' },
  KGrid: { name: 'KGrid', template: '<div><slot /></div>' },
  KGridItem: { name: 'KGridItem', template: '<div><slot /></div>' },
  KSelect: {
    name: 'KSelect',
    props: ['label', 'options', 'inline', 'value'],
    template: '<div><slot /></div>',
  },
  KDateRange: { name: 'KDateRange', template: '<div />' },
  KTable: {
    name: 'KTable',
    props: ['headers', 'rows', 'caption', 'emptyMessage', 'dataLoading'],
    template:
      '<div><span v-if="!rows.length">{{ emptyMessage }}</span><span v-for="(row, rowIndex) in rows" :key="rowIndex">{{ row.join(" ") }}</span><slot v-for="(row, rowIndex) in rows" name="cell" v-bind="{ content: row[0], colIndex: 0, row, rowIndex }" /><slot v-for="(row, rowIndex) in rows" name="cell" v-bind="{ content: row[1], colIndex: 1, row, rowIndex }" /><slot v-for="(row, rowIndex) in rows" name="cell" v-bind="{ content: row[2], colIndex: 2, row, rowIndex }" /></div>',
  },
  PaginationActions: {
    name: 'PaginationActions',
    props: ['value', 'itemsPerPage', 'totalPageNumber', 'numFilteredItems'],
    template: '<nav class="pagination"><slot /></nav>',
  },
};

const MOCK_SESSIONS = [
  {
    id: 'session-1',
    session_start_datetime: '2026-03-10T09:00:00Z',
    present_count: 15,
    total_count: 20,
  },
  {
    id: 'session-2',
    session_start_datetime: '2026-03-09T09:00:00Z',
    present_count: 18,
    total_count: 20,
  },
];

function makeWrapper({ sessions = [], totalPages = 1, sessionCount = null, loading = false } = {}) {
  const mockValues = useAttendanceMock({
    sessions: ref(sessions),
    totalPages: ref(totalPages),
    sessionCount: ref(sessionCount !== null ? sessionCount : sessions.length),
    attendanceLoading: ref(loading),
  });
  useAttendance.mockImplementation(() => mockValues);

  const testStore = makeStore();
  testStore.state.classSummary.id = 'class-123';
  store.replaceState(testStore.state);

  const wrapper = mount(AttendanceHistoryPage, {
    store: testStore,
    localVue,
    router,
    stubs: STUBS,
  });

  return { wrapper, mock: mockValues };
}

describe('AttendanceHistoryPage', () => {
  beforeAll(() => new Promise(r => setTimeout(r, 0)));

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(store, 'dispatch').mockImplementation(jest.fn());
    useAttendance.mockImplementation(() => useAttendanceMock());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('page structure', () => {
    it('renders the page heading', () => {
      const { wrapper } = makeWrapper();
      expect(wrapper.find('h1').text()).toBe('Attendance History');
    });

    it('renders the back to class link', () => {
      const { wrapper } = makeWrapper();
      expect(wrapper.text()).toContain('Back to class');
    });

    it('renders the mark attendance button', () => {
      const { wrapper } = makeWrapper();
      expect(wrapper.text()).toContain('Mark attendance');
    });
  });

  describe('data loading', () => {
    it('fetches sessions on mount', () => {
      const { mock } = makeWrapper();
      expect(mock.fetchSessions).toHaveBeenCalledWith(
        'class-123',
        expect.objectContaining({
          page_size: 10,
          page: 1,
        }),
      );
    });

    it('passes date range params when fetching', () => {
      const { mock } = makeWrapper();
      expect(mock.fetchSessions).toHaveBeenCalledWith(
        'class-123',
        expect.objectContaining({
          start_date: expect.any(String),
          end_date: expect.any(String),
        }),
      );
    });
  });

  describe('sessions table', () => {
    it('renders session data in the table', async () => {
      const { wrapper } = makeWrapper({ sessions: MOCK_SESSIONS });
      await global.flushPromises();
      // Present counts
      expect(wrapper.text()).toContain('15');
      expect(wrapper.text()).toContain('18');
      // Absent counts (20-15=5, 20-18=2)
      expect(wrapper.text()).toContain('5');
      expect(wrapper.text()).toContain('2');
    });

    it('shows empty state when no sessions', async () => {
      const { wrapper } = makeWrapper({ sessions: [] });
      await global.flushPromises();
      expect(wrapper.text()).toContain('No attendance sessions found');
    });
  });

  describe('pagination', () => {
    it('does not show pagination for single page', () => {
      const { wrapper } = makeWrapper({
        sessions: MOCK_SESSIONS,
        totalPages: 1,
        sessionCount: 2,
      });
      expect(wrapper.findComponent({ name: 'PaginationActions' }).exists()).toBe(false);
    });

    it('shows pagination controls for multiple pages', () => {
      const { wrapper } = makeWrapper({
        sessions: MOCK_SESSIONS,
        totalPages: 2,
        sessionCount: 15,
      });
      const pagination = wrapper.findComponent({ name: 'PaginationActions' });
      expect(pagination.exists()).toBe(true);
      expect(pagination.props('value')).toBe(1);
      expect(pagination.props('totalPageNumber')).toBe(2);
      expect(pagination.props('numFilteredItems')).toBe(15);
      expect(pagination.props('itemsPerPage')).toBe(10);
    });

    it('fetches new page when pagination emits input', async () => {
      const { wrapper, mock } = makeWrapper({
        sessions: MOCK_SESSIONS,
        totalPages: 2,
        sessionCount: 15,
      });
      mock.fetchSessions.mockClear();
      const pagination = wrapper.findComponent({ name: 'PaginationActions' });
      pagination.vm.$emit('input', 2);
      await global.flushPromises();
      expect(mock.fetchSessions).toHaveBeenCalledWith(
        'class-123',
        expect.objectContaining({ page: 2 }),
      );
    });
  });

  describe('custom date range', () => {
    it('applies custom date range and updates dropdown options', async () => {
      const { wrapper, mock } = makeWrapper({ sessions: MOCK_SESSIONS });
      await global.flushPromises();
      mock.fetchSessions.mockClear();

      // Simulate selecting Custom from KSelect — triggers handleDateRangeChange
      const kSelect = wrapper.findComponent({ name: 'KSelect' });
      kSelect.vm.$emit('change', { label: 'Custom', value: DateRangeFilters.CUSTOM });
      await global.flushPromises();

      // KDateRange should now be visible
      expect(wrapper.findComponent({ name: 'KDateRange' }).exists()).toBe(true);

      // Simulate submitting a custom date range
      const kDateRange = wrapper.findComponent({ name: 'KDateRange' });
      // Use local-time constructor to avoid UTC→local timezone shift
      const startDate = new Date(2026, 1, 1); // Feb 1, 2026
      const endDate = new Date(2026, 1, 28); // Feb 28, 2026
      kDateRange.vm.$emit('submit', { start: startDate, end: endDate });
      await global.flushPromises();

      // KDateRange should be hidden after submit
      expect(wrapper.findComponent({ name: 'KDateRange' }).exists()).toBe(false);

      // Should have re-fetched with ISO datetime params
      expect(mock.fetchSessions).toHaveBeenCalledWith(
        'class-123',
        expect.objectContaining({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          page: 1,
        }),
      );

      // Dropdown should now include the formatted custom date option
      const selectOptions = kSelect.props('options');
      const customAppliedOption = selectOptions.find(
        o => o.value === DateRangeFilters.CUSTOM_APPLIED,
      );
      expect(customAppliedOption).toBeDefined();
      // $formatDate produces locale-aware format (e.g. "2/1/2026" in en-US)
      expect(customAppliedOption.label).toContain('2026');
      expect(customAppliedOption.label).toContain('\u2013');
    });
  });
});
