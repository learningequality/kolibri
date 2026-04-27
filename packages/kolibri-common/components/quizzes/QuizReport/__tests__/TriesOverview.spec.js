import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { createTranslator } from 'kolibri/utils/i18n';
import TimeDuration from 'kolibri-common/components/TimeDuration.vue';
import TriesOverview from '../TriesOverview.vue';

const {
  completedLabel$,
  inProgressLabel$,
  notStartedLabel$,
  questionsCorrectLabel$,
  questionsCorrectValue$,
} = coreStrings;
const {
  bestScoreLabel$,
  bestScoreTimeLabel$,
  practiceQuizReportFasterSuggestedLabel$,
  practiceQuizReportSlowerSuggestedLabel$,
} = createTranslator(TriesOverview.name, TriesOverview.$trs);
const { seconds$, minutes$ } = createTranslator(TimeDuration.name, TimeDuration.$trs);

// Mock the tryValidator namespace as the same is used in the component
jest.mock('../utils', () => {
  const original = jest.requireActual('../utils');
  return {
    ...original,
    tryValidator: jest.fn(() => true),
  };
});

const renderComponent = props => {
  const defaultProps = {
    pastTries: [],
    totalQuestions: 20,
    suggestedTime: 240,
  };

  return render(TriesOverview, {
    props: {
      ...defaultProps,
      ...props,
    },
  });
};

describe('TriesOverview', () => {
  describe('Test the progress icon and label', () => {
    it('renders progress icon and completed label when there is a completed try', () => {
      renderComponent({
        pastTries: [
          {
            id: '1',
            correct: 5,
            time_spent: 100,
            completion_timestamp: 100,
          },
        ],
      });

      expect(screen.getByTestId('progress-icon-1')).toBeInTheDocument();
      expect(screen.getByText(completedLabel$())).toBeInTheDocument();
    });

    it('renders progress icon and in-progress label when there is an in-progress try', () => {
      renderComponent({
        pastTries: [
          {
            id: '2',
            correct: 5,
            time_spent: 100,
          },
        ],
      });

      expect(screen.getByTestId('progress-icon-0.5')).toBeInTheDocument();
      expect(screen.getByText(inProgressLabel$())).toBeInTheDocument();
    });

    it('renders progress icon and not started label when there are no past tries', () => {
      renderComponent({
        pastTries: [],
        totalQuestions: 20,
      });

      expect(screen.getByTestId('progress-icon-0')).toBeInTheDocument();
      expect(screen.getByText(notStartedLabel$())).toBeInTheDocument();
    });
  });

  describe("Test the 'Best Score' table row", () => {
    it('renders the best score when there are past tries', () => {
      renderComponent({
        pastTries: [
          {
            id: '1',
            correct: 8,
            time_spent: 100,
          },
          {
            id: '2',
            correct: 9,
            time_spent: 100,
          },
        ],
        totalQuestions: 10,
      });

      expect(screen.getByText(bestScoreLabel$())).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();

      expect(screen.getByText(questionsCorrectLabel$())).toBeInTheDocument();
      expect(
        screen.getByText(questionsCorrectValue$({ correct: 9, total: 10 })),
      ).toBeInTheDocument();
    });

    it('renders the best score as 0 when there are no past tries', () => {
      renderComponent();

      expect(screen.getByText(bestScoreLabel$())).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();

      expect(screen.getByText(questionsCorrectLabel$())).toBeInTheDocument();
      expect(
        screen.getByText(questionsCorrectValue$({ correct: 0, total: 20 })),
      ).toBeInTheDocument();
    });
  });

  describe("Test the 'Time Spent' table row", () => {
    it('shows the time spent when there are past tries [Faster Quiz Report]', () => {
      renderComponent({
        pastTries: [
          {
            id: '1',
            correct: 8,
            time_spent: 100,
          },
          {
            id: '2',
            correct: 9,
            time_spent: 20,
          },
        ],
        suggestedTime: 100,
      });

      expect(screen.getByText(bestScoreTimeLabel$())).toBeInTheDocument();
      expect(screen.getByText(seconds$({ value: 20 }))).toBeInTheDocument();
      expect(
        screen.getByText(practiceQuizReportFasterSuggestedLabel$({ value: 2 })),
      ).toBeInTheDocument();
    });

    it('shows the time spent when there are past tries [Slower Quiz Report]', () => {
      renderComponent({
        pastTries: [
          {
            id: '1',
            correct: 8,
            time_spent: 100,
          },
          {
            id: '2',
            correct: 9,
            time_spent: 160,
          },
        ],
        suggestedTime: 100,
      });

      expect(screen.getByText(bestScoreTimeLabel$())).toBeInTheDocument();
      expect(screen.getByText(minutes$({ value: 2 }))).toBeInTheDocument();
      expect(
        screen.getByText(practiceQuizReportSlowerSuggestedLabel$({ value: 1 })),
      ).toBeInTheDocument();
    });

    it('shows the time spent when there are past tries but no suggested time [No Quiz Report]', () => {
      renderComponent({
        pastTries: [
          {
            id: '1',
            correct: 8,
            time_spent: 100,
          },
          {
            id: '2',
            correct: 9,
            time_spent: 20,
          },
        ],
      });

      expect(screen.getByText(bestScoreTimeLabel$())).toBeInTheDocument();
      expect(screen.getByText(seconds$({ value: 20 }))).toBeInTheDocument();
    });

    it('does not render the row if there are no past tries', () => {
      renderComponent({ pastTries: [] });
      expect(screen.queryByText(bestScoreTimeLabel$())).not.toBeInTheDocument();
    });
  });
});
