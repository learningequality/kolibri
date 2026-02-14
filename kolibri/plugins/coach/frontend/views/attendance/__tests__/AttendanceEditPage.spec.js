import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';

import makeStore from '../../../__tests__/utils/makeStore';
import AttendanceEditPage from '../AttendanceEditPage.vue';

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

const SESSION_DATA = {
  id: 'session-123',
  session_start_datetime: new Date(2025, 2, 15, 14, 30).toISOString(),
  date_created: new Date(2025, 2, 15, 14, 35).toISOString(),
  attendance_records: [
    { user: 'learner-a', present: true },
    { user: 'learner-b', present: false },
    { user: 'learner-c', present: true },
  ],
};

const mockFetchSession = jest.fn(() => Promise.resolve());
const mockUpdateSession = jest.fn(() => Promise.resolve());

jest.mock('../../../composables/useAttendance', () => {
  return () => {
    return {
      fetchSession: mockFetchSession,
      updateSession: mockUpdateSession,
      currentSession: { value: null },
      attendanceLoading: { value: false },
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
const ATTENDANCE_ID = 'session-123';

function makeThreeLearners() {
  return {
    'learner-a': { id: 'learner-a', name: 'Alice', username: 'alice' },
    'learner-b': { id: 'learner-b', name: 'Bob', username: 'bob' },
    'learner-c': { id: 'learner-c', name: 'Charlie', username: 'charlie' },
  };
}

const routes = [
  {
    path: '/:classId/attendance/:attendanceId',
    name: 'ATTENDANCE_EDIT',
  },
  {
    path: '/:classId/attendance/history',
    name: 'ATTENDANCE_HISTORY',
  },
];

function renderComponent(sessionData = SESSION_DATA) {
  const store = makeStore();
  store.state.classSummary = {
    ...store.state.classSummary,
    id: CLASS_ID,
    name: 'Test Class',
    learnerMap: makeThreeLearners(),
  };

  const router = new VueRouter({ routes });
  router
    .push({
      name: 'ATTENDANCE_EDIT',
      params: { classId: CLASS_ID, attendanceId: ATTENDANCE_ID },
    })
    .catch(() => {});

  const map = sessionData.attendance_records.reduce((m, r) => {
    m[r.user] = r.present;
    return m;
  }, {});
  const originalMap = sessionData.attendance_records.reduce((m, r) => {
    m[r.user] = r.present;
    return m;
  }, {});

  return render(AttendanceEditPage, {
    store,
    router,
    stubs: {
      CoachImmersivePage: {
        name: 'CoachImmersivePage',
        template: '<div><slot></slot></div>',
      },
      BottomAppBar: {
        name: 'BottomAppBar',
        template: '<div class="bottom-app-bar"><slot></slot></div>',
      },
    },
    data() {
      return {
        sessionLoaded: true,
        sessionTimestamp: new Date(sessionData.date_created),
        attendanceMap: map,
        originalAttendanceMap: originalMap,
      };
    },
  });
}

describe('AttendanceEditPage', () => {
  afterEach(() => {
    mockFetchSession.mockClear();
    mockUpdateSession.mockClear();
  });

  describe('initial state from loaded session', () => {
    it('shows the original save timestamp in the heading', () => {
      renderComponent();

      // date_created is March 15, 2025 at 14:35
      const expectedDate = new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(2025, 2, 15, 14, 35));
      const expectedTime = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(2025, 2, 15, 14, 35));
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        `${expectedDate}, ${expectedTime}`,
      );
    });

    it('shows correct initial present/absent counts in bottom bar', () => {
      renderComponent();

      // Alice and Charlie present (2), Bob absent (1)
      expect(screen.getByText(/2 present/)).toBeInTheDocument();
      expect(screen.getByText(/1 absent/)).toBeInTheDocument();
    });

    it('shows Present label for learners marked present', () => {
      renderComponent();

      // Alice and Charlie are present, so 2 "Present" labels
      const presentLabels = screen.getAllByText('Present');
      expect(presentLabels.length).toBe(2);
    });
  });

  describe('toggling learners', () => {
    it('toggles a learner from present to absent', async () => {
      renderComponent();

      // Alice is initially present - toggle her
      const aliceToggle = screen.getByLabelText('Mark Alice as present or absent');
      await fireEvent.click(aliceToggle);

      // Now only Charlie should show "Present" label
      const presentLabels = screen.getAllByText('Present');
      expect(presentLabels.length).toBe(1);
    });

    it('toggles a learner from absent to present', async () => {
      renderComponent();

      // Bob is initially absent - toggle him
      const bobToggle = screen.getByLabelText('Mark Bob as present or absent');
      await fireEvent.click(bobToggle);

      // Now Alice, Bob, and Charlie should all show "Present" label
      const presentLabels = screen.getAllByText('Present');
      expect(presentLabels.length).toBe(3);
    });
  });

  describe('save with confirmation', () => {
    it('shows confirmation modal when save is clicked', async () => {
      renderComponent();

      const saveButton = screen.getByText('Save changes');
      await fireEvent.click(saveButton);

      expect(screen.getByText(/Save changes to/)).toBeInTheDocument();
    });

    it('calls updateSession with correct data after confirming', async () => {
      renderComponent();

      // Open save modal
      const saveButton = screen.getByText('Save changes');
      await fireEvent.click(saveButton);

      // Confirm
      const confirmButton = screen.getByText('Confirm submission');
      await fireEvent.click(confirmButton);

      expect(mockUpdateSession).toHaveBeenCalledTimes(1);
      const [sessionId, data] = mockUpdateSession.mock.calls[0];
      expect(sessionId).toBe(ATTENDANCE_ID);
      expect(data.attendance_records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ user: 'learner-a', present: true }),
          expect.objectContaining({ user: 'learner-b', present: false }),
          expect.objectContaining({ user: 'learner-c', present: true }),
        ]),
      );
    });

    it('shows error snackbar when save fails', async () => {
      mockUpdateSession.mockRejectedValueOnce(new Error('API error'));
      renderComponent();

      // Open save modal and confirm
      const saveButton = screen.getByText('Save changes');
      await fireEvent.click(saveButton);

      const confirmButton = screen.getByText('Confirm submission');
      await fireEvent.click(confirmButton);
      await global.flushPromises();

      // Save button should be re-enabled (saving reset to false)
      expect(screen.getByText('Save changes')).toBeEnabled();
    });
  });

  describe('mark all present', () => {
    it('shows confirmation modal when marking all present', async () => {
      renderComponent();

      const markAllToggle = screen.getByLabelText('Mark all learners present');
      await fireEvent.click(markAllToggle);

      expect(screen.getByText('Mark all 3 learners as present?')).toBeInTheDocument();
    });

    it('marks all learners present after confirming', async () => {
      renderComponent();

      // Open modal
      const markAllToggle = screen.getByLabelText('Mark all learners present');
      await fireEvent.click(markAllToggle);

      // Confirm
      const confirmButton = screen.getByText('Mark all learners present', {
        selector: 'button *, button',
      });
      await fireEvent.click(confirmButton);

      // All learners should show "Present" label
      const presentLabels = screen.getAllByText('Present');
      expect(presentLabels.length).toBe(3);
    });
  });
});
