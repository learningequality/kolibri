import { render, fireEvent, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import InteractionList from '../';

const renderComponent = props => {
  const defaultProps = {
    interactions: [{ type: 'hint' }, { type: 'answer', correct: true }, { type: 'error' }],
    selectedInteractionIndex: 0,
  };

  return render(InteractionList, {
    props: {
      ...defaultProps,
      ...props,
    },
    routes: new VueRouter(),
  });
};

describe('InteractionList', () => {
  // Check if the selected interaction has the correct cursor
  // Auto cursor means that the interaction is selected, and pointer cursor means that it is not
  const isSelected = iteractionItem => iteractionItem.style.cursor === 'auto';

  test('renders correctly and the selected iteraction changes correctly on user clicks', async () => {
    const { emitted } = renderComponent();

    const interactionItems = screen.getAllByTestId('attemptBox');
    expect(interactionItems).toHaveLength(3);
    expect(isSelected(interactionItems[0])).toBeTruthy();
    expect(isSelected(interactionItems[1])).toBeFalsy();
    expect(isSelected(interactionItems[2])).toBeFalsy();

    // Has the correct attempt label
    expect(screen.getByText('Attempt 1')).toBeInTheDocument();

    // Click the same interaction
    await fireEvent.click(interactionItems[0], { native: true });
    expect(emitted()).not.toHaveProperty('select');

    // Click a different interaction
    await fireEvent.click(interactionItems[2], { native: true });
    expect(emitted()).toHaveProperty('select');
    expect(emitted().select[0]).toEqual([2]);
  });

  test('renders the correct label when they are no interactions', () => {
    renderComponent({ interactions: [] });
    expect(screen.getByText('No attempts made on this question')).toBeInTheDocument();
  });
});
