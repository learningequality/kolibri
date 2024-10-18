import { render, screen } from '@testing-library/vue';
import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
import InteractionItem from '../InteractionItem.vue';

const renderComponent = props => {
  const defaultProps = {
    interaction: { type: 'answer', correct: true },
    selected: true,
  };

  return render(InteractionItem, {
    props: { ...defaultProps, ...props },
  });
};

const allIcons = ['correctAnswerIcon', 'incorrectAnswerIcon', 'hintIcon', 'helpNeededIcon'];
const testCases = [
  {
    name: 'renders interaction item with correct answer',
    interaction: { type: 'answer', correct: true },
    expectedIcon: 'correctAnswerIcon',
    expectedFill: themeTokens().correct,
  },
  {
    name: 'renders interaction item with incorrect answer',
    interaction: { type: 'answer', correct: false },
    expectedIcon: 'incorrectAnswerIcon',
    expectedFill: themeTokens().incorrect,
  },
  {
    name: 'renders interaction item with hint',
    interaction: { type: 'hint' },
    expectedIcon: 'hintIcon',
    expectedFill: themeTokens().annotation,
  },
  {
    name: 'renders interaction item with error',
    interaction: { type: 'error' },
    expectedIcon: 'helpNeededIcon',
    expectedFill: themeTokens().annotation,
  },
];

describe('InteractionItem', () => {
  // Test cases to ensure that only the correct icons are rendered
  testCases.forEach(({ name, interaction, expectedIcon, expectedFill }) => {
    test(name, () => {
      renderComponent({ interaction });

      const icon = screen.getByTestId(expectedIcon);
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveStyle({ fill: expectedFill });

      allIcons
        .filter(iconName => iconName !== expectedIcon)
        .forEach(iconName => expect(screen.queryByTestId(iconName)).not.toBeInTheDocument());
    });
  });

  test('renders the attempt box correctly when it is selected', () => {
    renderComponent({ selected: true });

    expect(screen.getByTestId('attemptBox')).toHaveStyle({
      border: `2px solid ${themeTokens().text}`,
      cursor: 'auto',
    });
  });

  test('renders the attempt box correctly when it is not selected', () => {
    renderComponent({ selected: false });

    expect(screen.getByTestId('attemptBox')).toHaveStyle({
      border: `2px solid ${themeTokens().textDisabled}`,
      cursor: 'pointer',
    });
  });
});
