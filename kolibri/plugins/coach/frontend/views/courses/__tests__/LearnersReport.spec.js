import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import LearnersReport from '../LearnersReport.vue';

const {
  noTestDataLabel$,
  noLearnersAttemptedLabel$,
  supportNeededLabel$,
  gainingMomentumLabel$,
  onTrackLabel$,
} = coursesStrings;

const LEARNERS = [
  { id: 'user-1', name: 'Alice', username: 'alice', groups: ['Group A'] },
  { id: 'user-2', name: 'Bob', username: 'bob', groups: ['Group B'] },
  { id: 'user-3', name: 'Carol', username: 'carol', groups: [] },
];

const LEARNING_OBJECTIVES = [
  { id: 'lo-1', text: 'Objective 1', num_questions: 4 },
  { id: 'lo-2', text: 'Objective 2', num_questions: 4 },
];

const STUBS = {
  KCircularLoader: {
    name: 'KCircularLoader',
    template: '<div data-testid="loader">Loading...</div>',
  },
  KTable: {
    name: 'KTable',
    props: ['headers', 'rows', 'caption'],
    template: `
      <div data-testid="k-table">
        <template v-for="(row, rowIndex) in rows">
          <div :key="rowIndex" :data-testid="'row-' + rowIndex">
            <slot
              v-for="(content, colIndex) in row"
              name="cell"
              v-bind="{ content, rowIndex, colIndex, row }"
            />
          </div>
        </template>
      </div>
    `,
  },
  KIcon: {
    name: 'KIcon',
    props: ['icon', 'color'],
    template: '<span />',
  },
  KRouterLink: {
    name: 'KRouterLink',
    props: ['text', 'to', 'icon'],
    template: '<a role="link">{{ text }}</a>',
  },
};

function makePrefetchedData({
  activeTestType = 'pre',
  activeTestStatus = 'closed',
  scores = {},
} = {}) {
  return {
    activeTestType,
    activeTestStatus,
    learnersWithGroups: LEARNERS,
    reportData: {
      learning_objectives: LEARNING_OBJECTIVES,
      pre_test: {
        status: activeTestType === 'pre' ? activeTestStatus : 'not_activated',
        scores: activeTestType === 'pre' ? scores : {},
      },
      post_test: {
        status: activeTestType === 'post' ? activeTestStatus : 'not_activated',
        scores: activeTestType === 'post' ? scores : {},
      },
    },
  };
}

const defaultLearnerRoute = learner => ({ name: 'TestRoute', params: { learnerId: learner.id } });

function renderComponent(props = {}) {
  return render(LearnersReport, {
    props: { learnerRoute: defaultLearnerRoute, ...props },
    stubs: STUBS,
  });
}

describe('LearnersReport', () => {
  describe('loading and empty states', () => {
    it('shows KCircularLoader when prefetchedData is null', () => {
      renderComponent({ prefetchedData: null });
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.queryByTestId('k-table')).not.toBeInTheDocument();
    });

    it('shows no-test empty state when activeTestStatus is not_activated', () => {
      renderComponent({
        prefetchedData: makePrefetchedData({ activeTestStatus: 'not_activated' }),
      });
      expect(screen.queryByTestId('k-table')).not.toBeInTheDocument();
      expect(screen.getByText(noTestDataLabel$())).toBeInTheDocument();
    });

    it('shows no-learners-attempted empty state when scores is empty', () => {
      renderComponent({
        prefetchedData: makePrefetchedData({ activeTestStatus: 'closed', scores: {} }),
      });
      expect(screen.queryByTestId('k-table')).not.toBeInTheDocument();
      expect(screen.getByText(noLearnersAttemptedLabel$())).toBeInTheDocument();
    });
  });

  describe('table rendering', () => {
    it('renders a row for each learner when scores are present', () => {
      const scores = {
        'user-1': { 'lo-1': 4, 'lo-2': 4 }, // 8/8 = 100% → on_track
        'user-2': { 'lo-1': 1, 'lo-2': 1 }, // 2/8 = 25% → support_needed
      };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByTestId('k-table')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Carol')).toBeInTheDocument();
    });

    it('shows group name in each row', () => {
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 4 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText('Group A')).toBeInTheDocument();
    });

    it('joins multiple group names with a comma', () => {
      const prefetchedData = makePrefetchedData({ scores: { 'user-1': { 'lo-1': 1 } } });
      prefetchedData.learnersWithGroups = [
        { id: 'user-1', name: 'Alice', username: 'alice', groups: ['Group A', 'Group B'] },
      ];
      renderComponent({ prefetchedData });
      expect(screen.getByText('Group A, Group B')).toBeInTheDocument();
    });
  });

  describe('risk level badges', () => {
    it('shows "Support needed" badge (red) for learner with score ≤ 50%', () => {
      // 3/8 = 37.5%
      const scores = { 'user-1': { 'lo-1': 2, 'lo-2': 1 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText(supportNeededLabel$())).toBeInTheDocument();
    });

    it('shows "Gaining momentum" badge (yellow) for learner in borderline range > 50% and ≤ 80%', () => {
      // 5/8 = 62.5%
      const scores = { 'user-1': { 'lo-1': 3, 'lo-2': 2 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText(gainingMomentumLabel$())).toBeInTheDocument();
    });

    it('shows "On track" badge for learner with score > 80%', () => {
      // 7/8 = 87.5%
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 3 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText(onTrackLabel$())).toBeInTheDocument();
    });

    it('shows "Support needed" (red) for learner at exactly 50%', () => {
      // 10/20 = 50% — use 10 questions per LO for integer boundary
      const scores = { 'user-1': { 'lo-1': 5, 'lo-2': 5 } };
      renderComponent({
        prefetchedData: {
          activeTestType: 'pre',
          activeTestStatus: 'closed',
          learnersWithGroups: [{ id: 'user-1', name: 'Alice', username: 'alice', groups: [] }],
          reportData: {
            learning_objectives: [
              { id: 'lo-1', num_questions: 10 },
              { id: 'lo-2', num_questions: 10 },
            ],
            pre_test: { status: 'closed', scores },
            post_test: { status: 'not_activated', scores: {} },
          },
        },
      });
      expect(screen.getByText(supportNeededLabel$())).toBeInTheDocument();
    });

    it('shows "Gaining momentum" for learner just above 50%', () => {
      // 5/8 = 62.5% — above MasteryThreshold.LOW (0.5), below MasteryThreshold.HIGH (0.8)
      const scores = { 'user-1': { 'lo-1': 3, 'lo-2': 2 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText(gainingMomentumLabel$())).toBeInTheDocument();
    });

    it('shows em dash for learners who did not attempt', () => {
      // user-2 and user-3 have no scores entry → no attempt
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 4 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      // Intentional Unicode U+2014 (em dash), matching the &mdash; rendered by Vue
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });
  });

  describe('sorting', () => {
    it('sorts learners by score ascending (most help needed first)', () => {
      const scores = {
        'user-1': { 'lo-1': 4, 'lo-2': 4 }, // 100% → last
        'user-2': { 'lo-1': 1, 'lo-2': 0 }, // 12.5% → first
        'user-3': { 'lo-1': 2, 'lo-2': 2 }, // 50% → middle
      };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      const rows = screen.getAllByTestId(/^row-/);
      // row-0 should be the lowest scorer (Bob = 12.5%)
      expect(rows[0]).toHaveTextContent('Bob');
      // row-1 should be Carol (50%)
      expect(rows[1]).toHaveTextContent('Carol');
      // row-2 should be Alice (100%)
      expect(rows[2]).toHaveTextContent('Alice');
    });

    it('places unattempted learners at the end of the sorted list', () => {
      // user-3 (Carol) has no entry in scores → unattempted → sorted last
      const scores = {
        'user-1': { 'lo-1': 1, 'lo-2': 0 }, // 12.5%
        'user-2': { 'lo-1': 4, 'lo-2': 4 }, // 100%
        // user-3 absent
      };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      const rows = screen.getAllByTestId(/^row-/);
      expect(rows[rows.length - 1]).toHaveTextContent('Carol');
    });
  });

  describe('pre/post toggle', () => {
    it('uses pre_test scores when activeTestType is "pre"', () => {
      // pre_test: user-1 has low score → support_needed
      // post_test would have high score, but should not be used
      const prefetchedData = {
        activeTestType: 'pre',
        activeTestStatus: 'closed',
        learnersWithGroups: [{ id: 'user-1', name: 'Alice', username: 'alice', groups: [] }],
        reportData: {
          learning_objectives: [{ id: 'lo-1', text: 'LO 1', num_questions: 4 }],
          pre_test: { status: 'closed', scores: { 'user-1': { 'lo-1': 1 } } }, // 25%
          post_test: { status: 'not_activated', scores: { 'user-1': { 'lo-1': 4 } } }, // 100%
        },
      };
      renderComponent({ prefetchedData });
      expect(screen.getByText(supportNeededLabel$())).toBeInTheDocument();
    });

    it('uses post_test scores when activeTestType is "post"', () => {
      // post_test: user-1 has high score → on_track
      const prefetchedData = {
        activeTestType: 'post',
        activeTestStatus: 'closed',
        learnersWithGroups: [{ id: 'user-1', name: 'Alice', username: 'alice', groups: [] }],
        reportData: {
          learning_objectives: [{ id: 'lo-1', text: 'LO 1', num_questions: 4 }],
          pre_test: { status: 'closed', scores: { 'user-1': { 'lo-1': 1 } } }, // 25%
          post_test: { status: 'closed', scores: { 'user-1': { 'lo-1': 4 } } }, // 100%
        },
      };
      renderComponent({ prefetchedData });
      expect(screen.getByText(onTrackLabel$())).toBeInTheDocument();
    });
  });

  describe('learner links', () => {
    it('renders learner names as links with person icon', () => {
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 4 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByRole('link', { name: 'Alice' })).toBeInTheDocument();
    });

    it('calls learnerRoute with the learner object for each name link', () => {
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 4 } };
      const learnerRoute = jest.fn(learner => ({
        name: 'TestRoute',
        params: { learnerId: learner.id },
      }));
      renderComponent({ prefetchedData: makePrefetchedData({ scores }), learnerRoute });
      expect(learnerRoute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1', name: 'Alice' }),
      );
    });
  });
});
