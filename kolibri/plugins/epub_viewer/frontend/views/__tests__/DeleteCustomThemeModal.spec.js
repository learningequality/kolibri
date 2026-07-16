import { render, screen, fireEvent } from '@testing-library/vue';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import DeleteCustomThemeModal from '../DeleteCustomThemeModal';
import { customThemeStrings } from '../customThemeStrings';

const { titleDeleteTheme$, confirmationQuestion$ } = customThemeStrings;

function renderModal(props = {}) {
  return render(DeleteCustomThemeModal, {
    props: { themeName: 'myTheme1', ...props },
  });
}

describe('DeleteCustomThemeModal', () => {
  it('titles the modal and asks to confirm deletion of the named theme', () => {
    renderModal();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(titleDeleteTheme$());
    expect(screen.getByText(confirmationQuestion$({ themeName: 'myTheme1' }))).toBeInTheDocument();
  });

  it('emits submit when the delete button is clicked', async () => {
    const { emitted } = renderModal();

    await fireEvent.click(screen.getByRole('button', { name: coreString('deleteAction') }));

    expect(emitted().submit).toBeTruthy();
  });
});
