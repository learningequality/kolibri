import { render, screen, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { createTranslator } from 'kolibri/utils/i18n';
import TocButton from '../TocButton';

const { toggleTocSideBar$ } = createTranslator(TocButton.name, TocButton.$trs);

function renderComponent() {
  return render(TocButton);
}

describe('Table of contents button', () => {
  it('renders the table of contents button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: toggleTocSideBar$() })).toBeInTheDocument();
  });

  it('emits a click event when the button is interacted with', async () => {
    const { emitted } = renderComponent();
    await fireEvent.click(screen.getByRole('button', { name: toggleTocSideBar$() }));
    expect(emitted()).toHaveProperty('click');
  });
});
