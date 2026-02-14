import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';

import makeStore from '../../../__tests__/utils/makeStore';
import AttendanceHistoryPage from '../AttendanceHistoryPage.vue';

jest.mock('kolibri/router', () => {
  return {
    getRoute: (name, params, query) => {
      return { name, params, query };
    },
  };
});

jest.mock('../../../composables/useCoreCoach', () => {
  return () => {
    return {
      pageTitle: '',
      appBarTitle: '',
    };
  };
});

const mockFetchSessions = jest.fn(() => Promise.resolve());
const mockSessions = require('vue').ref([]);

jest.mock('../../../composables/useAttendance', () => {
  const { ref } = require('vue');
  return () => {
    return {
      fetchSessions: mockFetchSessions,
      sessions: mockSessions,
      attendanceLoading: ref(false),
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

jest.mock('kolibri-design-system/lib/KDateRange/validationConstants', () => {
  return {
    MALFORMED: 'MALFORMED',
    START_DATE_AFTER_END_DATE: 'START_DATE_AFTER_END_DATE',
    FUTURE_DATE: 'FUTURE_DATE',
    DATE_BEFORE_FIRST_ALLOWED: 'DATE_BEFORE_FIRST_ALLOWED',
  };
});

const CLASS_ID = 'test-class-id';

const routes = [
  {
    path: '/:classId/attendance/history',
    name: 'ATTENDANCE_HISTORY',
  },
  {
    path: '/:classId/attendance/new',
    name: 'ATTENDANCE_NEW',
  },
  {
    path: '/:classId/attendance/:attendanceId',
    name: 'ATTENDANCE_EDIT',
  },
  {
    path: '/:classId',
    name: 'HomePage',
  },
];

function makeSessions(count) {
  const sessions = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(2025, 2, 15 - i, 14, 30);
    sessions.push({
      id: `session-${i}`,
      session_start_datetime: date.toISOString(),
      attendance_records: [
        { user: 'learner-a', present: true },
        { user: 'learner-b', present: false },
        { user: 'learner-c', present: true },
      ],
    });
  }
  return sessions;
}

function renderComponent(sessions = []) {
  const store = makeStore();
  store.state.classSummary = {
    ...store.state.classSummary,
    id: CLASS_ID,
    name: 'Test Class',
  };

  const router = new VueRouter({ routes });
  router.push({ name: 'ATTENDANCE_HISTORY', params: { classId: CLASS_ID } }).catch(() => {});

  return render(AttendanceHistoryPage, {
    store,
    router,
    stubs: {
      CoachAppBarPage: {
        name: 'CoachAppBarPage',
        template: '<div><slot></slot></div>',
      },
      KDateRange: {
        name: 'KDateRange',
        template: '<div class="k-date-range-stub"></div>',
        props: [
          'title',
          'submitText',
          'cancelText',
          'startDateLegendText',
          'endDateLegendText',
          'previousMonthText',
          'nextMonthText',
          'lastAllowedDate',
        ],
      },
      KTable: {
        name: 'KTable',
        template: `<div class="k-table-stub">
          <table>
            <thead><tr><th v-for="(header, i) in headers" :key="i">{{ header.label }}</th></tr></thead>
            <tbody>
              <tr v-for="(row, ri) in rows" :key="ri">
                <td v-for="(cell, ci) in row" :key="ci">
                  <slot name="cell" :content="cell" :colIndex="ci" :rowIndex="ri" :row="row">{{ cell }}</slot>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="rows.length === 0" class="empty-message">{{ emptyMessage }}</div>
        </div>`,
        props: [
          'headers',
          'rows',
          'caption',
          'emptyMessage',
          'dataLoading',
          'sortable',
          'defaultSort',
        ],
      },
    },
    data() {
      return {
        sessionData: sessions,
      };
    },
  });
}

describe('AttendanceHistoryPage', () => {
  afterEach(() => {
    mockFetchSessions.mockClear();
  });

  describe('page structure', () => {
    it('renders the page with a heading', () => {
      renderComponent();

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Attendance history');
    });

    it('shows a back link to the class home page', () => {
      renderComponent();

      expect(screen.getByText(/Back to/)).toBeInTheDocument();
    });

    it('shows a Mark Attendance link styled as a button', () => {
      renderComponent();

      expect(screen.getByText('Mark attendance')).toBeInTheDocument();
    });
  });

  describe('session table', () => {
    it('shows empty message when there are no sessions', () => {
      renderComponent([]);

      expect(screen.getByText('No attendance sessions found')).toBeInTheDocument();
    });

    it('displays sessions with correct column headers', () => {
      const sessions = makeSessions(2);
      renderComponent(sessions);

      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Present')).toBeInTheDocument();
      expect(screen.getByText('Absent')).toBeInTheDocument();
    });

    it('shows correct present and absent counts for each session', () => {
      const sessions = makeSessions(1);
      renderComponent(sessions);

      // Session has 2 present (learner-a, learner-c) and 1 absent (learner-b)
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('formats session date using formatAttendanceDateTime', () => {
      const testDate = new Date(2025, 2, 15, 14, 30);
      const sessions = [
        {
          id: 'session-fixed',
          session_start_datetime: testDate.toISOString(),
          attendance_records: [{ user: 'learner-a', present: true }],
        },
      ];
      renderComponent(sessions);

      const expectedDate = new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(testDate);
      const expectedTime = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(testDate);
      expect(screen.getByText(`${expectedDate}, ${expectedTime}`)).toBeInTheDocument();
    });
  });

  describe('date range filter', () => {
    it('fetches sessions on mount', () => {
      renderComponent();

      expect(mockFetchSessions).toHaveBeenCalled();
    });
  });
});
