import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';

import makeStore from '../../../../__tests__/utils/makeStore';
import AttendanceBlock from '../AttendanceBlock.vue';

jest.mock('kolibri/router', () => {
  return {
    getRoute: (name, params, query) => {
      return { name, params, query };
    },
  };
});

jest.mock('../../../../composables/useCoreCoach', () => {
  return () => {
    return {
      pageTitle: '',
      appBarTitle: '',
    };
  };
});

const { ref } = require('vue');

const mockRecentSessions = ref([]);
const mockFetchRecentSessions = jest.fn(() => Promise.resolve());

jest.mock('../../../../composables/useAttendance', () => {
  return () => {
    return {
      fetchRecentSessions: mockFetchRecentSessions,
      recentSessions: mockRecentSessions,
      formatAttendanceDateTime(dateInput) {
        const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
        const dateStr = new Intl.DateTimeFormat(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(d);
        const timeStr = new Intl.DateTimeFormat(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(d);
        return `${dateStr}, ${timeStr}`;
      },
    };
  };
});

const CLASS_ID = 'test-class-id';

const routes = [
  {
    path: '/:classId/attendance/new',
    name: 'ATTENDANCE_NEW',
  },
  {
    path: '/:classId/attendance/history',
    name: 'ATTENDANCE_HISTORY',
  },
  {
    path: '/:classId/home',
    name: 'HOME_PAGE',
  },
];

function renderComponent(recentSessions = []) {
  // Set the mock data that will be copied into recentSessionData on mount
  mockRecentSessions.value = recentSessions;

  const store = makeStore();
  store.state.classSummary = {
    ...store.state.classSummary,
    id: CLASS_ID,
    name: 'Test Class',
  };

  const router = new VueRouter({ routes });
  router.push({ name: 'HOME_PAGE', params: { classId: CLASS_ID } }).catch(() => {});

  return render(AttendanceBlock, {
    store,
    router,
    stubs: {
      Block: {
        name: 'Block',
        template: '<div class="block"><slot name="title"></slot><slot></slot></div>',
        props: ['allLinkText', 'allLinkRoute', 'showAllLink'],
      },
    },
  });
}

describe('AttendanceBlock', () => {
  afterEach(() => {
    mockFetchRecentSessions.mockClear();
    mockRecentSessions.value = [];
  });

  describe('block structure', () => {
    it('renders a block with attendance title', () => {
      renderComponent();

      expect(screen.getByText('Attendance')).toBeInTheDocument();
    });

    it('renders a "Mark attendance" link styled as a button', () => {
      renderComponent();

      expect(screen.getByText('Mark attendance')).toBeInTheDocument();
    });
  });

  describe('session bars', () => {
    it('shows stacked bar graphs when recent sessions exist', async () => {
      const sessions = [
        {
          id: '1',
          present_count: 3,
          total_count: 5,
          session_start_datetime: new Date(2025, 2, 15, 14, 30).toISOString(),
          attendance_records: [
            { present: true },
            { present: true },
            { present: true },
            { present: false },
            { present: false },
          ],
        },
        {
          id: '2',
          present_count: 4,
          total_count: 5,
          session_start_datetime: new Date(2025, 2, 14, 10, 0).toISOString(),
          attendance_records: [
            { present: true },
            { present: true },
            { present: true },
            { present: true },
            { present: false },
          ],
        },
      ];
      const { container } = renderComponent(sessions);
      await global.flushPromises();

      expect(container.querySelectorAll('.session-bar').length).toBe(2);
    });

    it('shows empty state when no sessions exist', () => {
      const { container } = renderComponent([]);

      expect(container.querySelectorAll('.session-bar').length).toBe(0);
      expect(screen.getByText('No attendance sessions yet')).toBeInTheDocument();
    });
  });

  describe('data fetching', () => {
    it('fetches recent sessions on mount', () => {
      renderComponent();

      expect(mockFetchRecentSessions).toHaveBeenCalled();
    });
  });

  describe('present and absent counts', () => {
    it('shows present and absent counts for sessions', async () => {
      const sessions = [
        {
          id: '1',
          present_count: 3,
          total_count: 5,
          session_start_datetime: new Date(2025, 2, 15, 14, 30).toISOString(),
          attendance_records: [
            { present: true },
            { present: true },
            { present: true },
            { present: false },
            { present: false },
          ],
        },
      ];
      renderComponent(sessions);
      await global.flushPromises();

      expect(screen.getByText(/3 Present/)).toBeInTheDocument();
      expect(screen.getByText(/2 Absent/)).toBeInTheDocument();
    });
  });
});
