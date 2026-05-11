import { render, screen, fireEvent, within } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import LearnerSidePanel from '../LearnerSidePanel.vue';

const {
  noProgressLabel$,
  hasntStartedUnitsLabel$,
  strugglingWithObjectivesPrefixLabel$,
  strugglingWithObjectivesSuffixLabel$,
  onTrackWithObjectivesPrefixLabel$,
  onTrackWithObjectivesSuffixLabel$,
  xOfYCorrectLabel$,
  individualLoPerformanceLabel$,
  learningObjectiveLabel$,
  questionsCorrectLabel$,
} = coursesStrings;

const { closeAction$ } = coreStrings;

const LEARNING_OBJECTIVES = {
  'lo-1': { id: 'lo-1', text: 'Objective 1', num_questions: 4 },
  'lo-2': { id: 'lo-2', text: 'Objective 2', num_questions: 4 },
};

const LEARNER = { id: 'user-1', name: 'Alice', username: 'alice', groups: [] };

function makePrefetchedData({ scores = {}, activeTestType = 'pre' } = {}) {
  return {
    activeTestType,
    activeTestStatus: 'closed',
    learnersWithGroups: [],
    reportData: {
      learning_objectives: Object.values(LEARNING_OBJECTIVES),
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
  });
}

describe('LearnerSidePanel', () => {
  describe('empty state', () => {
    it('shows empty state heading when learner has no scores', () => {
      renderComponent({ prefetchedData: makePrefetchedData({ scores: {} }) });
      expect(
        screen.getByRole('heading', { level: 3, name: noProgressLabel$() }),
      ).toBeInTheDocument();
    });

    it('shows empty state description with learner name', () => {
      renderComponent({ prefetchedData: makePrefetchedData({ scores: {} }) });
      const emptyState = document.querySelector('.empty-state');
      expect(
        within(emptyState).getByText(hasntStartedUnitsLabel$({ name: LEARNER.name })),
      ).toBeInTheDocument();
    });

    it('does not show LO rows in empty state', () => {
      renderComponent({ prefetchedData: makePrefetchedData({ scores: {} }) });
      expect(screen.queryByText(LEARNING_OBJECTIVES['lo-1'].text)).not.toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('shows learner name', () => {
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 4 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(screen.getByRole('heading', { level: 1, name: LEARNER.name })).toBeInTheDocument();
    });
  });

  describe('warning banner', () => {
    it('shows warning banner with count when learner has struggling LOs', () => {
      // lo-1: 2/4 = 50% (< 80%), lo-2: 2/4 = 50% (< 80%) → struggling count = 2
      const scores = { 'user-1': { 'lo-1': 2, 'lo-2': 2 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      const banner = document.querySelector('.warning-banner');
      expect(banner).toBeTruthy();
      expect(within(banner).getByText(strugglingWithObjectivesPrefixLabel$())).toBeInTheDocument();
      expect(
        within(banner).getByText(strugglingWithObjectivesSuffixLabel$({ count: 2 })),
      ).toBeInTheDocument();
    });

    it('shows warning for just one struggling LO', () => {
      // lo-1: 4/4 = 100% (not struggling), lo-2: 2/4 = 50% (< 80%, struggling) → count = 1
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 2 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      const banner = document.querySelector('.warning-banner');
      expect(banner).toBeTruthy();
      expect(within(banner).getByText(strugglingWithObjectivesPrefixLabel$())).toBeInTheDocument();
      expect(
        within(banner).getByText(strugglingWithObjectivesSuffixLabel$({ count: 1 })),
      ).toBeInTheDocument();
    });

    it('shows warning banner for learner with no LO scores (all ratios = 0)', () => {
      // Learner has a scores entry but no LO keys → all ratios are 0 → all 2 LOs struggling
      const scores = { 'user-1': {} };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      const banner = document.querySelector('.warning-banner');
      expect(banner).toBeTruthy();
      expect(within(banner).getByText(strugglingWithObjectivesPrefixLabel$())).toBeInTheDocument();
      expect(
        within(banner).getByText(strugglingWithObjectivesSuffixLabel$({ count: 2 })),
      ).toBeInTheDocument();
    });

    it('does not show warning banner when all LOs are at or above 80%', () => {
      // lo-1: 4/4 = 100%, lo-2: 4/4 = 100% → no struggling
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 4 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      expect(document.querySelector('.warning-banner')).toBeNull();
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
      expect(document.querySelector('.warning-banner')).toBeNull();
    });

    it('shows on-track banner when all LOs are at or above 80%', () => {
      // lo-1: 4/4 = 100%, lo-2: 4/4 = 100% → on track with 2 LOs
      const scores = { 'user-1': { 'lo-1': 4, 'lo-2': 4 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      const banner = document.querySelector('.success-banner');
      expect(banner).toBeTruthy();
      expect(within(banner).getByText(onTrackWithObjectivesPrefixLabel$())).toBeInTheDocument();
      expect(
        within(banner).getByText(onTrackWithObjectivesSuffixLabel$({ count: 2 })),
      ).toBeInTheDocument();
    });
  });

  describe('LO section', () => {
    it('shows section heading', () => {
      const scores = { 'user-1': { 'lo-1': 3, 'lo-2': 2 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      const loSection = screen.getByTestId('lo-section');
      expect(within(loSection).getByText(individualLoPerformanceLabel$())).toBeInTheDocument();
    });

    it('shows column headers', () => {
      const scores = { 'user-1': { 'lo-1': 3, 'lo-2': 2 } };
      renderComponent({ prefetchedData: makePrefetchedData({ scores }) });
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders[0]).toHaveTextContent(learningObjectiveLabel$());
      expect(columnHeaders[1]).toHaveTextContent(questionsCorrectLabel$());
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

      const loSection = screen.getByTestId('lo-section');
      const allRows = within(loSection).getAllByRole('row');

      // lo-2 (25%) should appear before lo-1 (100%)
      expect(within(allRows[1]).getByText(LEARNING_OBJECTIVES['lo-2'].text)).toBeInTheDocument();
      expect(within(allRows[2]).getByText(LEARNING_OBJECTIVES['lo-1'].text)).toBeInTheDocument();
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
      await fireEvent.click(screen.getByRole('button', { name: closeAction$() }));
      expect(emitted().close).toBeTruthy();
    });
  });
});
