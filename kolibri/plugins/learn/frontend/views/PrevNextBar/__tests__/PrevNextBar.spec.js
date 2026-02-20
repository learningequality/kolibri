import { render, screen, fireEvent } from '@testing-library/vue';
import PrevNextBar from '../index.vue';

function renderPrevNextBar(props = {}, options = {}) {
  return render(PrevNextBar, {
    props: {
      currentNumber: 1,
      totalNumber: 10,
      ...props,
    },
    ...options,
  });
}

describe('PrevNextBar', () => {
  describe('progress display', () => {
    it('does not display progress area when progressLabel is not provided', () => {
      renderPrevNextBar({
        currentNumber: 3,
        totalNumber: 10,
      });
      expect(screen.queryByTestId('progress-area')).not.toBeInTheDocument();
    });

    it('displays progressLabel when provided', () => {
      renderPrevNextBar({
        currentNumber: 5,
        totalNumber: 22,
        progressLabel: 'Question 5 of 22',
      });
      const progressArea = screen.getByTestId('progress-area');
      expect(progressArea).toHaveTextContent('Question 5 of 22');
    });
  });

  describe('navigation buttons', () => {
    it('emits prev event when previous button is clicked', async () => {
      const { emitted } = renderPrevNextBar({
        currentNumber: 6,
        totalNumber: 10,
      });

      await fireEvent.click(screen.getByTestId('prev-button'));

      expect(emitted().prev).toBeTruthy();
      expect(emitted().prev.length).toBe(1);
    });

    it('emits next event when next button is clicked', async () => {
      const { emitted } = renderPrevNextBar({
        currentNumber: 6,
        totalNumber: 10,
      });

      await fireEvent.click(screen.getByTestId('next-button'));

      expect(emitted().next).toBeTruthy();
      expect(emitted().next.length).toBe(1);
    });
  });

  describe('button enabled state', () => {
    it('disables prev button when at first item (currentNumber = 1)', () => {
      renderPrevNextBar({
        currentNumber: 1,
        totalNumber: 10,
      });

      expect(screen.getByTestId('prev-button')).toBeDisabled();
    });

    it('enables prev button when not at first item', () => {
      renderPrevNextBar({
        currentNumber: 2,
        totalNumber: 10,
      });

      expect(screen.getByTestId('prev-button')).toBeEnabled();
    });

    it('disables next button when at last item', () => {
      renderPrevNextBar({
        currentNumber: 10,
        totalNumber: 10,
      });

      expect(screen.getByTestId('next-button')).toBeDisabled();
    });

    it('enables next button when not at last item', () => {
      renderPrevNextBar({
        currentNumber: 9,
        totalNumber: 10,
      });

      expect(screen.getByTestId('next-button')).toBeEnabled();
    });

    it('does not emit prev when prev button is disabled and clicked', async () => {
      const { emitted } = renderPrevNextBar({
        currentNumber: 1,
        totalNumber: 10,
      });

      await fireEvent.click(screen.getByTestId('prev-button'));

      expect(emitted().prev).toBeFalsy();
    });

    it('does not emit next when next button is disabled and clicked', async () => {
      const { emitted } = renderPrevNextBar({
        currentNumber: 10,
        totalNumber: 10,
      });

      await fireEvent.click(screen.getByTestId('next-button'));

      expect(emitted().next).toBeFalsy();
    });
  });

  describe('actions slot', () => {
    it('renders content in actions slot', () => {
      renderPrevNextBar(
        {
          currentNumber: 1,
          totalNumber: 10,
        },
        {
          slots: {
            actions: '<button data-testid="submit-button">Submit</button>',
          },
        },
      );

      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Submit');
    });

    it('does not render actions-area when actions slot is empty', () => {
      renderPrevNextBar({
        currentNumber: 1,
        totalNumber: 10,
      });

      expect(screen.queryByTestId('actions-area')).not.toBeInTheDocument();
    });
  });

  describe('prevEnabled and nextEnabled props override', () => {
    it('enables prev button when prevEnabled is true, even at first item', () => {
      renderPrevNextBar({
        currentNumber: 1,
        totalNumber: 10,
        prevEnabled: true,
      });

      expect(screen.getByTestId('prev-button')).toBeEnabled();
    });

    it('disables prev button when prevEnabled is false, even when not at first item', () => {
      renderPrevNextBar({
        currentNumber: 5,
        totalNumber: 10,
        prevEnabled: false,
      });

      expect(screen.getByTestId('prev-button')).toBeDisabled();
    });

    it('enables next button when nextEnabled is true, even at last item', () => {
      renderPrevNextBar({
        currentNumber: 10,
        totalNumber: 10,
        nextEnabled: true,
      });

      expect(screen.getByTestId('next-button')).toBeEnabled();
    });

    it('disables next button when nextEnabled is false, even when not at last item', () => {
      renderPrevNextBar({
        currentNumber: 5,
        totalNumber: 10,
        nextEnabled: false,
      });

      expect(screen.getByTestId('next-button')).toBeDisabled();
    });

    it('emits prev event when prevEnabled is true and button is clicked', async () => {
      const { emitted } = renderPrevNextBar({
        currentNumber: 1,
        totalNumber: 10,
        prevEnabled: true,
      });

      await fireEvent.click(screen.getByTestId('prev-button'));

      expect(emitted().prev).toBeTruthy();
      expect(emitted().prev.length).toBe(1);
    });

    it('does not emit prev event when prevEnabled is false and button is clicked', async () => {
      const { emitted } = renderPrevNextBar({
        currentNumber: 5,
        totalNumber: 10,
        prevEnabled: false,
      });

      await fireEvent.click(screen.getByTestId('prev-button'));

      expect(emitted().prev).toBeFalsy();
    });

    it('emits next event when nextEnabled is true and button is clicked', async () => {
      const { emitted } = renderPrevNextBar({
        currentNumber: 10,
        totalNumber: 10,
        nextEnabled: true,
      });

      await fireEvent.click(screen.getByTestId('next-button'));

      expect(emitted().next).toBeTruthy();
      expect(emitted().next.length).toBe(1);
    });

    it('does not emit next event when nextEnabled is false and button is clicked', async () => {
      const { emitted } = renderPrevNextBar({
        currentNumber: 5,
        totalNumber: 10,
        nextEnabled: false,
      });

      await fireEvent.click(screen.getByTestId('next-button'));

      expect(emitted().next).toBeFalsy();
    });

    it('uses default behavior when prevEnabled and nextEnabled are null', () => {
      renderPrevNextBar({
        currentNumber: 1,
        totalNumber: 10,
        prevEnabled: null,
        nextEnabled: null,
      });

      expect(screen.getByTestId('prev-button')).toBeDisabled();
      expect(screen.getByTestId('next-button')).toBeEnabled();
    });

    it('can override both buttons independently', () => {
      renderPrevNextBar({
        currentNumber: 1,
        totalNumber: 10,
        prevEnabled: true,
        nextEnabled: false,
      });

      expect(screen.getByTestId('prev-button')).toBeEnabled();
      expect(screen.getByTestId('next-button')).toBeDisabled();
    });
  });

  describe('layout structure', () => {
    it('has prev button, progress area (when label provided), and right-area', () => {
      renderPrevNextBar(
        {
          currentNumber: 6,
          totalNumber: 10,
          progressLabel: 'question',
        },
        {
          slots: {
            actions: '<button data-testid="submit-button">Submit</button>',
          },
        },
      );

      const container = document.querySelector('.prev-next-bar');
      const children = container.children;

      // First child should be the prev button
      expect(children[0]).toHaveAttribute('data-testid', 'prev-button');

      // Second child should be the progress area (when progressLabel is provided)
      expect(children[1]).toHaveAttribute('data-testid', 'progress-area');

      // Third child should be the right-area containing actions and next
      expect(children[2]).toHaveClass('right-area');
    });

    it('has actions slot before next button within right-area', () => {
      renderPrevNextBar(
        {
          currentNumber: 6,
          totalNumber: 10,
          progressLabel: 'question',
        },
        {
          slots: {
            actions: '<button data-testid="submit-button">Submit</button>',
          },
        },
      );

      const rightArea = document.querySelector('.right-area');
      const children = rightArea.children;

      // First child in right-area should be actions-area
      expect(children[0]).toHaveAttribute('data-testid', 'actions-area');

      // Second child in right-area should be next button
      expect(children[1]).toHaveAttribute('data-testid', 'next-button');
    });
  });
});
