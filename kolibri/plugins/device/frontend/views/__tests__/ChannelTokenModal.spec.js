// Tests for the ChannelTokenModal - the modal where users enter a token
// to access unlisted/private channels. Migrated to Vue Testing Library
// so tests describe what users see and do, not component internals.

import { render, screen, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import ChannelTokenModal from '../AvailableChannelsPage/ChannelTokenModal';

function renderComponent(options = {}) {
  return render(ChannelTokenModal, {
    attrs: { disabled: false },
    ...options,
  });
}

describe('channelTokenModal component', () => {
  // User should always be able to back out without submitting
  it('pressing cancel emits a cancel event', async () => {
    const { emitted } = renderComponent();
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);
    expect(emitted().cancel).toBeTruthy();
  });

  // No errors should show on a fresh modal before the user touches anything
  it('if user has not interacted with the form, no validation messages appear', () => {
    renderComponent();
    expect(
      screen.queryByText(/check whether you entered token correctly/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  describe('submitting a token', () => {
    // Whitespace-only input should fail the same as an empty token
    it('shows a validation message when token code is empty on submit', async () => {
      renderComponent();
      const textbox = screen.getByRole('textbox');
      await userEvent.type(textbox, '   ');
      const submitButton = screen.getByRole('button', { name: /continue|submit/i });
      await userEvent.click(submitButton);
      expect(
        screen.getByText(/check whether you entered token correctly/i)
      ).toBeInTheDocument();
    });

    // Validation should also fire when user tabs away from an empty field
    it('shows a validation message when token code is empty on blur', async () => {
      renderComponent();
      const textbox = screen.getByRole('textbox');
      await userEvent.type(textbox, '   ');
      await fireEvent.blur(textbox);
      expect(
        screen.getByText(/check whether you entered token correctly/i)
      ).toBeInTheDocument();
    });

    // Happy path - a valid token should result in a submit event being fired
    it('emits a submit event with token payload when lookup is successful', async () => {
      const { emitted, component } = renderComponent();
      component.lookupToken = jest.fn().mockResolvedValue([{ id: 'toka-toka-token' }]);
      const textbox = screen.getByRole('textbox');
      await userEvent.type(textbox, 'toka-toka-token');
      const submitButton = screen.getByRole('button', { name: /continue|submit/i });
      await userEvent.click(submitButton);
      expect(emitted().submit).toBeTruthy();
    });

    // 404 means the token exists but doesn't match any channel -
    // we treat this as bad user input and show a field-level error
    it('shows a validation message when token does not point to a channel (404)', async () => {
      const { component } = renderComponent();
      component.lookupToken = jest.fn().mockRejectedValue({ response: { status: 404 } });
      const textbox = screen.getByRole('textbox');
      await userEvent.type(textbox, 'toka-toka-token');
      const submitButton = screen.getByRole('button', { name: /continue|submit/i });
      await userEvent.click(submitButton);
      expect(
        screen.getByText(/check whether you entered token correctly/i)
      ).toBeInTheDocument();
    });

    // Non-404 errors are network/server problems outside the user's control,
    // so we show a general alert banner rather than a field validation message
    it('shows a network error alert on a generic server error (non-404)', async () => {
      const { component } = renderComponent();
      component.lookupToken = jest.fn().mockRejectedValue({ response: { status: 500 } });
      const textbox = screen.getByRole('textbox');
      await userEvent.type(textbox, 'toka-toka-token');
      const submitButton = screen.getByRole('button', { name: /continue|submit/i });
      await userEvent.click(submitButton);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.queryByText(/check whether you entered token correctly/i)
      ).not.toBeInTheDocument();
    });
  });
});
