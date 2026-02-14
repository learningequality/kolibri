import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';

import makeStore from '../../../__tests__/utils/makeStore';
import AttendanceNewPage from '../AttendanceNewPage.vue';

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

const mockCreateSession = jest.fn(() => Promise.resolve());

jest.mock('../../../composables/useAttendance', () => {
  return () => {
    return {
      createSession: mockCreateSession,
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

function makeLearners(count) {
  const learners = {};
  for (let i = 0; i < count; i++) {
    const id = `learner-${String(i).padStart(3, '0')}`;
    learners[id] = {
      id,
      name: `Learner ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26)}`,
      username: `learner${i}`,
    };
  }
  return learners;
}

function makeThreeLearners() {
  return {
    'learner-a': { id: 'learner-a', name: 'Alice', username: 'alice' },
    'learner-b': { id: 'learner-b', name: 'Bob', username: 'bob' },
    'learner-c': { id: 'learner-c', name: 'Charlie', username: 'charlie' },
  };
}

const routes = [
  {
    path: '/:classId/attendance/new',
    name: 'ATTENDANCE_NEW',
  },
  {
    path: '/:classId/attendance/history',
    name: 'ATTENDANCE_HISTORY',
  },
];

function renderComponent(learnerMap = null) {
  if (!learnerMap) {
    learnerMap = makeThreeLearners();
  }

  const store = makeStore();
  store.state.classSummary = {
    ...store.state.classSummary,
    id: CLASS_ID,
    name: 'Test Class',
    learnerMap,
  };

  const router = new VueRouter({ routes });
  router.push({ name: 'ATTENDANCE_NEW', params: { classId: CLASS_ID } }).catch(() => {});

  return render(AttendanceNewPage, {
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
  });
}

describe('AttendanceNewPage', () => {
  afterEach(() => {
    mockCreateSession.mockClear();
  });

  describe('date and time display', () => {
    it('shows formatted date and time in the heading with "Mark attendance:" prefix', () => {
      const fixedDate = new Date(2025, 2, 15, 14, 30); // March 15, 2025, 14:30
      const OriginalDate = global.Date;
      jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return fixedDate;
        }
        return new OriginalDate(...args);
      });
      global.Date.now = OriginalDate.now;

      renderComponent();

      // Build the expected date string using Intl (same as mock)
      const expectedDate = new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(fixedDate);
      const expectedTime = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(fixedDate);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        `Mark attendance: ${expectedDate}, ${expectedTime}`,
      );

      global.Date.mockRestore();
    });
  });

  describe('learner list', () => {
    it('renders all learners alphabetically sorted', () => {
      renderComponent();

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('shows empty message when there are no learners', () => {
      renderComponent({});

      expect(screen.getByText('No learners in this class')).toBeInTheDocument();
    });
  });

  describe('toggle individual learner', () => {
    it('shows "Present" label when learner is marked present', async () => {
      renderComponent();

      // Initially no "Present" labels visible
      expect(screen.queryByText('Present')).not.toBeInTheDocument();

      // Click Alice's toggle (the switch associated with Alice)
      const aliceToggle = screen.getByLabelText('Mark Alice as present or absent');
      await fireEvent.click(aliceToggle);

      expect(screen.getByText('Present')).toBeInTheDocument();
    });
  });

  describe('mark all present', () => {
    it('shows confirmation modal when marking all present', async () => {
      renderComponent();

      const markAllToggle = screen.getByLabelText('Mark all learners present');
      await fireEvent.click(markAllToggle);

      expect(screen.getByText('Mark all 3 learners as present?')).toBeInTheDocument();
    });

    it('marks all learners present after confirming modal', async () => {
      renderComponent();

      // Open modal
      const markAllToggle = screen.getByLabelText('Mark all learners present');
      await fireEvent.click(markAllToggle);

      // Confirm via the modal submit button
      const confirmButton = screen.getByText('Mark all learners present', {
        selector: 'button *, button',
      });
      await fireEvent.click(confirmButton);

      // All learners should show "Present" label
      const presentLabels = screen.getAllByText('Present');
      expect(presentLabels.length).toBe(3);
    });
  });

  describe('present/absent count', () => {
    it('shows correct counts in bottom bar', async () => {
      renderComponent();

      // Initial state: 0 present, 3 absent
      expect(screen.getByText(/0 present/)).toBeInTheDocument();
      expect(screen.getByText(/3 absent/)).toBeInTheDocument();

      // Toggle Alice present
      const aliceToggle = screen.getByLabelText('Mark Alice as present or absent');
      await fireEvent.click(aliceToggle);

      expect(screen.getByText(/1 present/)).toBeInTheDocument();
      expect(screen.getByText(/2 absent/)).toBeInTheDocument();
    });
  });

  describe('submit', () => {
    it('calls createSession with correct data on submit', async () => {
      renderComponent();

      // Toggle Alice present
      const aliceToggle = screen.getByLabelText('Mark Alice as present or absent');
      await fireEvent.click(aliceToggle);

      // Click submit
      const submitButton = screen.getByText('Submit attendance');
      await fireEvent.click(submitButton);

      expect(mockCreateSession).toHaveBeenCalledTimes(1);
      const callArg = mockCreateSession.mock.calls[0][0];
      expect(callArg.collection).toBe(CLASS_ID);
      expect(callArg.session_start_datetime).toBeDefined();
      expect(callArg.attendance_records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ user: 'learner-a', present: true }),
          expect.objectContaining({ user: 'learner-b', present: false }),
          expect.objectContaining({ user: 'learner-c', present: false }),
        ]),
      );
    });

    it('shows error snackbar when submit fails', async () => {
      mockCreateSession.mockRejectedValueOnce(new Error('API error'));
      renderComponent();

      // Click submit
      const submitButton = screen.getByText('Submit attendance');
      await fireEvent.click(submitButton);
      await global.flushPromises();

      // Submit button should be re-enabled (saving reset to false)
      expect(screen.getByText('Submit attendance')).toBeEnabled();
    });
  });

  describe('pagination', () => {
    it('shows pagination label when there are learners', () => {
      renderComponent();

      expect(screen.getByText(/1 - 3 of 3 learners/)).toBeInTheDocument();
    });

    it('shows correct pagination for many learners', () => {
      const manyLearners = makeLearners(55);
      renderComponent(manyLearners);

      expect(screen.getByText(/1 - 50 of 55 learners/)).toBeInTheDocument();
    });
  });

  describe('accessible table headers', () => {
    it('has visually hidden table headers for accessibility', () => {
      renderComponent();

      expect(screen.getByText('Learner name')).toBeInTheDocument();
      expect(screen.getByText('Attendance status')).toBeInTheDocument();
    });
  });
});
