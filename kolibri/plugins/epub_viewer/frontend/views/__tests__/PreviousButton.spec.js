import { render, screen, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { createTranslator } from 'kolibri/utils/i18n';
import PreviousButton from '../PreviousButton';

const { goToPreviousPage$ } = createTranslator(PreviousButton.name, PreviousButton.$trs);

const renderComponent = () => {
  return render(PreviousButton, {
    props: { color: 'black' },
  });
};

describe('Previous button', () => {
  it('renders a button accessible as go to previous page', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: goToPreviousPage$() })).toBeInTheDocument();
  });
  it('emits goToPreviousPage when clicked', async () => {
    const { emitted } = renderComponent();
    await fireEvent.click(screen.getByRole('button', { name: goToPreviousPage$() }));
    expect(emitted()).toHaveProperty('goToPreviousPage');
  });
});
