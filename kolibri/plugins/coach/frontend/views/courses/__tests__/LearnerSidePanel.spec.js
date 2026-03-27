import { render, screen, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import LearnerSidePanel from '../LearnerSidePanel.vue';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';

const {
  noProgressLabel$,
  hasntStartedUnitsLabel$,
  strugglingWithObjectivesPrefixLabel$,
  strugglingWithObjectivesSuffixLabel$,
  xOfYCorrectLabel$,
  progressLabel$,
  testAveragesLabel$,
  losCompletedOfLabel$,
  preTestLabelPrefix$,
  postTestLabelPrefix$,
  testScoreOfTotalLabel$,
  individualLoPerformanceLabel$,
  learningObjectiveLabel$,
  questionsCorrectLabel$,
} = coursesStrings;

const LEARNING_OBJECTIVES = [
  { id: 'lo-1', text: 'Objective 1', num_questions: 4 },
  { id: 'lo-2', text: 'Objective 2', num_questions: 4 },
];

const LEARNER = { id: 'user-1', name: 'Alice', username: 'alice', groups: [] };

const STUBS = {
  SidePanelModal: {
    name: 'SidePanelModal',
    template: '<div data-testid="side-panel"><slot /></div>',
  },
  SidePanelLayout: {
    name: 'SidePanelLayout',
    props: ['title', 'subtitle', 'closePanel'],
    template: `
      <div>
        <slot name="title" />
        <button data-testid="close-btn" @click="closePanel">close</button>
        <slot />
      </div>
    `,
  },
  KIcon: {
    name: 'KIcon',
    template: '<span />',
  },
};

function makePrefetchedData({ scores = {}, activeTestType = 'pre' } = {}) {
  return {
    activeTestType,
    activeTestStatus: 'closed',
    learnersWithGroups: [],
    reportData: {
      learning_objectives: LEARNING_OBJECTIVES,
      pre_test: {
        status: activeTestType === 'pre' ? 'closed' : 'not_activated',
        scores: activeTestType === 'pre' ? scores : {},
      },
      post_test: {
        status: activeTestType === 'post' ? 'closed' : 'not_activated',
        scores: activeTestType === 'post' ? scores : {},
      },
    },
  };
}

function renderComponent(props = {}) {
  return render(LearnerSidePanel, {
    props: { learner: LEARNER, ...props },
    stubs: STUBS,
  });
}

describe('LearnerSidePanel', () => {
  describe('empty state', () => {
    it('shows empty state heading when learner has no scores', () => {
      renderComponent({ prefetchedData: makePrefetchedData({ scores: {} }) });
      expect(screen.getByText(noProgressLabel$())).toBeInTheDocument();
    });

    it('shows empty state description with learner name', () => {
      renderComponent({ prefetchedData: makePrefetchedData({ scores: {} }) });
      expect(
        screen.getByText(hasntStartedUnitsLabel$({ name: LEARNER.name })),
      ).toBeInTheDocument();
    });

    it('does not show LO rows in empty state', () => {
      renderComponent({ prefetchedData: makePrefetchedData({ scores: {} }) });
      expect(screen.queryByText('Objective 1')).not.toBeInTheDocument();
    });

    it('does not show PROGRESS or TEST AVERAGES rows in empty state', () => {
      renderComponent({ prefetchedData: makePrefetchedData({ scores: {} }) });
      expect(screen.queryByText(progressLabel$())).not.toBeInTheDocument();
      expect(screen.queryByText(testAveragesLabel$())).not.toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('shows learner name', () => {
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 4 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText(LEARNER.name)).toBeInTheDocument();
    });
  });

  describe('stats rows', () => {
    it('shows PROGRESS label and LOs completed count', () => {
      // Both LOs have scores → 2 of 2 completed
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 4 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText(progressLabel$(), { exact: false })).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText(losCompletedOfLabel$({ total: 2 }))).toBeInTheDocument();
    });

    it('shows only attempted LOs in PROGRESS count', () => {
      // Only lo-1 has a score entry
      const scores = { 'user-1': { 'lo-1': 3 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText(losCompletedOfLabel$({ total: 2 }))).toBeInTheDocument();
    });

    it('shows TEST AVERAGES label', () => {
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 4 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText(testAveragesLabel$(), { exact: false })).toBeInTheDocument();
    });

    it('shows pre-test score in test averages row', () => {
      // 3/8 total correct
      const scores = { 'user-1': { 'lo-1': 2, 'lo-2': 1 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores, activeTestType: 'pre' }) });
      expect(screen.getByText(preTestLabelPrefix$())).toBeInTheDocument();
      expect(screen.getByText(testScoreOfTotalLabel$({ total: 8 }))).toBeInTheDocument();
    });

    it('shows post-test score in test averages row', () => {
      const prefetchedData = {
        activeTestType: 'post',
        activeTestStatus: 'closed',
        learnersWithGroups: [],
        reportData: {
          learning_objectives: LEARNING_OBJECTIVES,
          pre_test: { status: 'closed', scores: { 'user-1': { 'lo-1': 2, 'lo-2': 1 } } },
          post_test: { status: 'closed', scores: { 'user-1': { 'lo-1': 3, 'lo-2': 3 } } },
        },
      };
      renderComponent({ prefetchedData });
      expect(screen.getByText(postTestLabelPrefix$())).toBeInTheDocument();
      expect(screen.getByText(testScoreOfTotalLabel$({ total: 8 }))).toBeInTheDocument();
    });

    it('shows both pre and post scores when both have data', () => {
      const prefetchedData = {
        activeTestType: 'post',
        activeTestStatus: 'closed',
        learnersWithGroups: [],
        reportData: {
          learning_objectives: LEARNING_OBJECTIVES,
          pre_test: { status: 'closed', scores: { 'user-1': { 'lo-1': 2, 'lo-2': 0 } } },
          post_test: { status: 'closed', scores: { 'user-1': { 'lo-1': 3, 'lo-2': 3 } } },
        },
      };
      renderComponent({ prefetchedData });
      expect(screen.getByText(preTestLabelPrefix$())).toBeInTheDocument();
      expect(screen.getByText(postTestLabelPrefix$())).toBeInTheDocument();
      expect(screen.getAllByText(testScoreOfTotalLabel$({ total: 8 }))).toHaveLength(2);
    });
  });

  describe('warning banner', () => {
    it('shows warning banner with count when learner has struggling LOs', () => {
      // lo-1: 2/4 = 50% (< 80%), lo-2: 2/4 = 50% (< 80%) → struggling count = 2
      const scores = { 'user-1': { 'lo-1': 2, 'lo-2': 2 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText(strugglingWithObjectivesPrefixLabel$())).toBeInTheDocument();
      expect(
        screen.getByText(`2 ${strugglingWithObjectivesSuffixLabel$({ count: 2 })}`),
      ).toBeInTheDocument();
    });

    it('shows warning for just one struggling LO', () => {
      // lo-1: 4/4 = 100% (not struggling), lo-2: 2/4 = 50% (< 80%, struggling) → count = 1
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 2 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText(strugglingWithObjectivesPrefixLabel$())).toBeInTheDocument();
      expect(
        screen.getByText(`1 ${strugglingWithObjectivesSuffixLabel$({ count: 1 })}`),
      ).toBeInTheDocument();
    });

    it('does not show warning banner when all LOs are at or above 80%', () => {
      // lo-1: 4/4 = 100%, lo-2: 4/4 = 100% → no struggling
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 4 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.queryByText(strugglingWithObjectivesPrefixLabel$())).not.toBeInTheDocument();
    });

    it('does not show warning banner at exactly 80% per LO', () => {
      // 80% boundary: lo-1: 4/5 = 80% (not struggling), lo-2: 4/5 = 80% (not struggling)
      const prefetchedData = {
        activeTestType: 'pre',
        activeTestStatus: 'closed',
        learnersWithGroups: [],
        reportData: {
          learning_objectives: [
            { id: 'lo-1', text: 'LO 1', num_questions: 5 },
            { id: 'lo-2', text: 'LO 2', num_questions: 5 },
          ],
          pre_test: { status: 'closed', scores: { 'user-1': { 'lo-1': 4, 'lo-2': 4 } } },
          post_test: { status: 'not_activated', scores: {} },
        },
      };
      renderComponent({ prefetchedData });
      expect(screen.queryByText(strugglingWithObjectivesPrefixLabel$())).not.toBeInTheDocument();
    });
  });

  describe('LO section', () => {
    it('shows section heading', () => {
      const scores = { 'user-1': { 'lo-1': 3, 'lo-2': 2 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText(individualLoPerformanceLabel$())).toBeInTheDocument();
    });

    it('shows column headers', () => {
      const scores = { 'user-1': { 'lo-1': 3, 'lo-2': 2 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByText(learningObjectiveLabel$())).toBeInTheDocument();
      expect(screen.getByText(questionsCorrectLabel$())).toBeInTheDocument();
    });

    it('shows correct count and total for each LO via aria-label', () => {
      // lo-1: 3/4 correct, lo-2: 2/4 correct
      const scores = { 'user-1': { 'lo-1': 3, 'lo-2': 2 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      // aria-labels on score spans contain the full "X of Y correct" string
      expect(
        document.querySelector(`[aria-label="${xOfYCorrectLabel$({ correct: 3, total: 4 })}"]`),
      ).toBeTruthy();
      expect(
        document.querySelector(`[aria-label="${xOfYCorrectLabel$({ correct: 2, total: 4 })}"]`),
      ).toBeTruthy();
    });

    it('sorts LOs by score ascending (lowest first)', () => {
      // lo-1: 4/4 = 100%, lo-2: 1/4 = 25% → lo-2 appears first
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 1 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      const loTexts = screen.getAllByText(/Objective [12]/);
      // lo-2 (25%) should appear before lo-1 (100%)
      expect(loTexts[0]).toHaveTextContent('Objective 2');
      expect(loTexts[1]).toHaveTextContent('Objective 1');
    });

    it('shows 0 correct for LOs the learner did not answer', () => {
      // learner answered lo-1 but not lo-2
      const scores = { 'user-1': { 'lo-1': 3 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(
        document.querySelector(`[aria-label="${xOfYCorrectLabel$({ correct: 0, total: 4 })}"]`),
      ).toBeTruthy();
    });
  });

  describe('close button', () => {
    it('emits close when close button is clicked', async () => {
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 4 } };
      const { emitted } = renderComponent({
        prefetchedData: makePrefetchedData({ scores }),
      });
      await fireEvent.click(screen.getByTestId('close-btn'));
      expect(emitted().close).toBeTruthy();
    });
  });
});
