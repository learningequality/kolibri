import { render, screen, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import TocButton from '../TocButton';

function renderComponent() {
  return render(TocButton);
}

describe('Table of contents button', () => {
  it('renders the table of contents button', () => {
    renderComponent();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('emits a click event when the button is interacted with', async () => {
    const { emitted } = renderComponent();
    await fireEvent.click(screen.getByRole('button'));
    expect(emitted()).toHaveProperty('click');
  });
});
