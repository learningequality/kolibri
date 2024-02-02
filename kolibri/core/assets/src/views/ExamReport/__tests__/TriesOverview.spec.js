/* eslint-disable import/namespace */
import { render } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';
import TriesOverview from '../TriesOverview.vue';
import * as tryValidatorModule from '../utils';

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
      const { getByTestId, getByText } = renderComponent({
        pastTries: [
          {
            id: '1',
            completion_timestamp: 100,
          },
        ],
      });

      expect(getByTestId('progress-icon-1')).toBeInTheDocument();
      expect(getByText('completedLabel')).toBeInTheDocument();
    });

    test('renders progress icon and in-progress label when there is an in-progress try', () => {
      const { getByTestId, getByText } = renderComponent({
        pastTries: [{ id: '2' }],
      });

      expect(getByTestId('progress-icon-0.5')).toBeInTheDocument();
      expect(getByText('inProgressLabel')).toBeInTheDocument();
    });

    test('renders progress icon and not started label when there are no past tries', () => {
      const { getByTestId, getByText } = renderComponent();

      expect(getByTestId('progress-icon-0')).toBeInTheDocument();
      expect(getByText('notStartedLabel')).toBeInTheDocument();
    });
  });
});
