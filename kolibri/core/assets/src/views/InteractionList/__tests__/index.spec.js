import { render, fireEvent, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import InteractionList from '../';

const renderComponent = props => {
  const defaultProps = {
    interactions: [{ type: 'answer', correct: true }, { type: 'hint' }, { type: 'error' }],
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

const checkSelectedStatus = (interactionItems, selectedIndex) => {
  // Check if the selected interaction has the correct cursor
  // Auto cursor means that the interaction is selected, and pointer cursor means that it is not
  const isSelected = iteractionItem => iteractionItem.style.cursor === 'auto';

  interactionItems.forEach((interactionItem, index) =>
    expect(isSelected(interactionItem)).toBe(index === selectedIndex)
  );
};

describe('InteractionList', () => {
  test('the item renders correctly and the selected iteraction changes correctly on user clicks', async () => {
    renderComponent();

    const interactionItems = screen.getAllByTestId('attemptBox');
    expect(interactionItems).toHaveLength(3);
    checkSelectedStatus(interactionItems, 0);

    // Click the second interaction
    await fireEvent.click(interactionItems[1]);
    checkSelectedStatus(interactionItems, 1);
  });
});
