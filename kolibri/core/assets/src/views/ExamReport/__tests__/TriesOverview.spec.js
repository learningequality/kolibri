import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';
import TriesOverview from '../TriesOverview.vue';
import * as tryValidatorModule from '../utils';

// Mock the tryValidator namespace as the same is used in the component
// eslint-disable-next-line import/namespace
tryValidatorModule.tryValidator = jest.fn(() => true);

// Helper function to render the component with some default props
const renderComponent = props => {
  const commonCoreStrings = {
    methods: {
      coreString: x => x,
    },
  };

  const defaultProps = {
    pastTries: [],
    totalQuestions: 20,
    suggestedTime: 240,
    ...props,
  };

  return render(TriesOverview, {
    props: {
      ...defaultProps,
      ...props,
    },
    routes: new VueRouter(),
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
            completion_timestamp: 100,
          },
        ],
      });

      expect(screen.getByTestId('progress-icon-1')).toBeInTheDocument();
      expect(screen.getByText('completedLabel')).toBeInTheDocument();
    });

    test('renders progress icon and in-progress label when there is an in-progress try', () => {
      renderComponent({
        pastTries: [{ id: '2' }],
      });

      expect(screen.getByTestId('progress-icon-0.5')).toBeInTheDocument();
      expect(screen.getByText('inProgressLabel')).toBeInTheDocument();
    });

    test('renders progress icon and not started label when there are no past tries', () => {
      renderComponent();

      expect(screen.getByTestId('progress-icon-0')).toBeInTheDocument();
      expect(screen.getByText('notStartedLabel')).toBeInTheDocument();
    });
  });
});
