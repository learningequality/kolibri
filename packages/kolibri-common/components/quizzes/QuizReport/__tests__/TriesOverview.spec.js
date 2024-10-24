import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import TriesOverview from '../TriesOverview.vue';

// Mock the tryValidator namespace as the same is used in the component
jest.mock('../utils', () => {
  const original = jest.requireActual('../utils');
  return {
    ...original,
    tryValidator: jest.fn(() => true),
  };
});

// Helper function to render the component with some default props
const renderComponent = props => {
  const commonCoreStrings = {
    methods: {
      coreString: (x, options) =>
        !options
          ? x
          : // Add comma seperated options as key value pairs at the end of the label
            `${x} ${Object.keys(options)
              .map(key => `${key}=${options[key]}`)
              .join(', ')}`,
    },
  };

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
    mixins: [commonCoreStrings],
  });
};

describe('TriesOverview', () => {
  describe('Test the progress icon and label', () => {
    test('renders progress icon and completed label when there is a completed try', () => {
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
      expect(screen.getByText('completedLabel')).toBeInTheDocument();
    });

    test('renders progress icon and in-progress label when there is an in-progress try', () => {
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
      expect(screen.getByText('inProgressLabel')).toBeInTheDocument();
    });

    test('renders progress icon and not started label when there are no past tries', () => {
      renderComponent({
        pastTries: [],
        totalQuestions: 20,
      });

      expect(screen.getByTestId('progress-icon-0')).toBeInTheDocument();
      expect(screen.getByText('notStartedLabel')).toBeInTheDocument();
    });
  });

  describe("Test the 'Best Score' table row", () => {
    test('renders the best score when there are past tries', () => {
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

      expect(screen.getByText('Best score')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();

      expect(screen.getByText('questionsCorrectLabel')).toBeInTheDocument();
      expect(screen.getByText('questionsCorrectValue correct=9, total=10')).toBeInTheDocument();
    });

    test('renders the best score as 0 when there are no past tries', () => {
      renderComponent();

      expect(screen.getByText('Best score')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();

      expect(screen.getByText('questionsCorrectLabel')).toBeInTheDocument();
      expect(screen.getByText('questionsCorrectValue correct=0, total=20')).toBeInTheDocument();
    });
  });

  describe("Test the 'Time Spent' table row", () => {
    test('shows the time spent when there are past tries [Faster Quiz Report]', () => {
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

      expect(screen.getByText('Best score time')).toBeInTheDocument();
      expect(screen.getByText('20 seconds')).toBeInTheDocument();
      expect(screen.getByText('2 minutes faster than the suggested time')).toBeInTheDocument();
    });

    test('shows the time spent when there are past tries [Slower Quiz Report]', () => {
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

      expect(screen.getByText('Best score time')).toBeInTheDocument();
      expect(screen.getByText('2 minutes')).toBeInTheDocument();
      expect(screen.getByText('1 minute slower than the suggested time')).toBeInTheDocument();
    });

    test('shows the time spent when there are past tries but no suggested time [No Quiz Report]', () => {
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

      expect(screen.getByText('Best score time')).toBeInTheDocument();
      expect(screen.getByText('20 seconds')).toBeInTheDocument();
    });

    test('does not render the row if there are no past tries', () => {
      renderComponent({ pastTries: [] });
      expect(screen.queryByText('Best score time')).not.toBeInTheDocument();
    });
  });
});
