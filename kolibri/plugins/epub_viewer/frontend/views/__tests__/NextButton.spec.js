import { render, screen, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import NextButton from '../NextButton';

const renderComponent = () => {
  return render(NextButton, {
    props: { color: 'black' },
  });
};

describe('Next button', () => {
  it('renders a button accessible as go to next page', () => {
    renderComponent();
    expect(
      screen.getByRole('button', { name: NextButton.$trs.goToNextPage.message }),
    ).toBeInTheDocument();
  });
  it('emits goToNextPage when clicked', async () => {
    const { emitted } = renderComponent();
    await fireEvent.click(
      screen.getByRole('button', { name: NextButton.$trs.goToNextPage.message }),
    );
    expect(emitted()).toHaveProperty('goToNextPage');
  });
});
