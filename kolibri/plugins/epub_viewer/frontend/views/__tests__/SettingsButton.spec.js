import { render, screen, fireEvent } from '@testing-library/vue';
import SettingsButton from '../SettingsButton';

describe('Settings button', () => {
  it('renders a button', () => {
    render(SettingsButton);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('emits a click event when the user clicks the button', async () => {
    const { emitted } = render(SettingsButton);

    await fireEvent.click(screen.getByRole('button'));

    expect(emitted().click).toBeTruthy();
  });
});
