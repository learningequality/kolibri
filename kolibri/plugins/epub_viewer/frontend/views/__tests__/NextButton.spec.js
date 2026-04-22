import { render, screen, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { createTranslator } from 'kolibri/utils/i18n';
import NextButton from '../NextButton';

const { goToNextPage$ } = createTranslator(NextButton.name, NextButton.$trs);

const renderComponent = () => {
  return render(NextButton, {
    props: { color: 'black' },
  });
};

describe('Next button', () => {
  it('renders a button accessible as go to next page', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: goToNextPage$() })).toBeInTheDocument();
  });
  it('emits goToNextPage when clicked', async () => {
    const { emitted } = renderComponent();
    await fireEvent.click(screen.getByRole('button', { name: goToNextPage$() }));
    expect(emitted()).toHaveProperty('goToNextPage');
  });
});
