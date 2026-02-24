import { render, screen, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import PreviousButton from '../PreviousButton';

const renderComponent = () => {
  return render(PreviousButton, {
    props: { color: 'black' },
  });
};

describe('Previous button', () => {
  it('renders a button accessible as go to previous page', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeInTheDocument();
  });
  it('emits goToPreviousPage when clicked', async () => {
    const { emitted } = renderComponent();
    await fireEvent.click(screen.getByRole('button', { name: 'Go to previous page' }));
    expect(emitted()).toHaveProperty('goToPreviousPage');
  });
});
