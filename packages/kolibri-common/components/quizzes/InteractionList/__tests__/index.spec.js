import { render, fireEvent, screen } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
import InteractionList from '..';

const { currAnswer$, noInteractions$ } = createTranslator(
  InteractionList.name,
  InteractionList.$trs,
);

const renderComponent = props => {
  const defaultProps = {
    interactions: [],
    selectedInteractionIndex: -1,
  };

  return render(InteractionList, {
    props: {
      ...defaultProps,
      ...props,
    },
  });
};

describe('InteractionList', () => {
  // Check if the selected interaction has the correct cursor
  // Auto cursor means that the interaction is selected, and pointer cursor means that it is not
  const isSelected = iteractionItem => iteractionItem.style.cursor === 'auto';

  describe('when there are interactions', () => {
    it('renders the interactions correctly [No selected interactions]', async () => {
      const interactions = [{ type: 'hint' }, { type: 'answer', correct: true }, { type: 'error' }];
      const selectedInteractionIndex = -1;

      renderComponent({
        interactions,
        selectedInteractionIndex,
      });

      const interactionItems = screen.getAllByTestId('attemptBox');
      // Check if all the interactions are rendered and none of them are selected
      expect(interactionItems).toHaveLength(interactions.length);
      for (const interactionItem of interactionItems)
        expect(isSelected(interactionItem)).toBeFalsy();
    });

    it('renders the interactions correctly [Selected interaction]', async () => {
      const interactions = [{ type: 'hint' }, { type: 'answer', correct: true }, { type: 'error' }];
      const selectedInteractionIndex = 1;

      renderComponent({
        interactions,
        selectedInteractionIndex,
      });

      const interactionItems = screen.getAllByTestId('attemptBox');

      // Check if all the interactions are rendered and the selected one is selected
      expect(interactionItems).toHaveLength(interactions.length);
      for (let i = 0; i < interactionItems.length; i++)
        expect(isSelected(interactionItems[i])).toBe(selectedInteractionIndex === i);

      // Check if the correct attempt label is rendered
      expect(
        screen.getByText(currAnswer$({ value: selectedInteractionIndex + 1 })),
      ).toBeInTheDocument();
    });

    it("no event is emitted when the user clicks on the same interaction that's already selected", async () => {
      const interactions = [{ type: 'hint' }, { type: 'answer', correct: true }, { type: 'error' }];
      const selectedInteractionIndex = 1;

      const { emitted } = renderComponent({
        interactions,
        selectedInteractionIndex,
      });

      const interactionItems = screen.getAllByTestId('attemptBox');
      await fireEvent.click(interactionItems[selectedInteractionIndex], { native: true });
      expect(emitted()).not.toHaveProperty('select');
    });

    it('emits the correct event when the user clicks on a different interaction', async () => {
      const interactions = [{ type: 'hint' }, { type: 'answer', correct: true }, { type: 'error' }];
      const selectedInteractionIndex = 1;

      const { emitted } = renderComponent({
        interactions,
        selectedInteractionIndex,
      });

      const interactionItems = screen.getAllByTestId('attemptBox');
      await fireEvent.click(interactionItems[2], { native: true });
      expect(emitted()).toHaveProperty('select');
      expect(emitted().select[0]).toEqual([2]);
    });
  });

  it('renders the correct label when they are no interactions', () => {
    renderComponent({ interactions: [] });
    expect(screen.getByText(noInteractions$())).toBeInTheDocument();
  });
});
