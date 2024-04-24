import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
import AttemptIconDiff from '../AttemptIconDiff.vue';

const successThemeColor = themeTokens().correct;

// Helper function to render the component with some default props
const renderComponent = props => {
  return render(AttemptIconDiff, {
    props: {
      correct: 1,
      diff: 1,
      ...props,
    },
  });
};

describe('AttemptIconDiff', () => {
  test('renders KIcon with correct styles when correct and diff conditions are met', () => {
    renderComponent();

    const kIcon = screen.getByTestId('correct-icon');
    expect(kIcon).toBeInTheDocument();
    expect(kIcon).toHaveStyle({ fill: successThemeColor });
  });

  test('does not render KIcon when correct condition is not met', () => {
    renderComponent({ correct: 0 });
    expect(screen.queryByTestId('correct-icon')).not.toBeInTheDocument();
  });

  test('does not render KIcon when diff condition is not met', () => {
    renderComponent({ diff: 0 });
    expect(screen.queryByTestId('k-icon')).not.toBeInTheDocument();
  });
});
