import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import ChannelTokenModal from '../AvailableChannelsPage/ChannelTokenModal';

import { getRemoteChannelBundleByToken } from '../../modules/wizard/utils';

jest.mock('../../modules/wizard/utils', () => ({
  getRemoteChannelBundleByToken: jest.fn(),
}));

const { invalidTokenMessage$, networkErrorMessage$, channelTokenLabel$ } = createTranslator(
  ChannelTokenModal.name,
  ChannelTokenModal.$trs,
);
const { cancelAction$, continueAction$ } = coreStrings;

describe('ChannelTokenModal component', () => {
  const renderComponent = () => {
    return render(ChannelTokenModal, {
      listeners: {
        cancel: jest.fn(),
        submit: jest.fn(),
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pressing "cancel" emits a "cancel" event', () => {
    const { emitted } = renderComponent();
    const cancelButton = screen.getByRole('button', { name: cancelAction$() });
    fireEvent.click(cancelButton);
    expect(emitted().cancel).toBeTruthy();
  });

  describe('submitting a token', () => {
    it('if user has not interacted with the form, then no validation messages appear', () => {
      renderComponent();
      expect(screen.queryByText(invalidTokenMessage$())).not.toBeInTheDocument();
      expect(screen.queryByText(networkErrorMessage$())).not.toBeInTheDocument();
    });

    it('on submit, shows a validation message when token code is empty', async () => {
      renderComponent();
      const submitButton = screen.getByRole('button', { name: continueAction$() });
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(invalidTokenMessage$())).toBeInTheDocument();
      });
    });

    it('on blur, shows a validation message when token code is empty', async () => {
      renderComponent();
      const textbox = screen.getByRole('textbox', { name: channelTokenLabel$() });
      fireEvent.focus(textbox);
      fireEvent.blur(textbox);
      await waitFor(() => {
        expect(screen.getByText(invalidTokenMessage$())).toBeInTheDocument();
      });
    });

    it('disables submit and cancel while token lookup is in progress', async () => {
      let resolvePromise;
      getRemoteChannelBundleByToken.mockReturnValue(
        new Promise(r => {
          resolvePromise = r;
        }),
      );
      renderComponent();
      const textbox = screen.getByRole('textbox', { name: channelTokenLabel$() });
      await fireEvent.update(textbox, 'some-token');
      const submitButton = screen.getByRole('button', { name: continueAction$() });
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: cancelAction$() })).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });
      resolvePromise([]);
    });

    it('emits a "submit" event if token lookup is successful', async () => {
      const { emitted } = renderComponent();
      const tokenPayload = { token: 'valid-token-123', channels: [{ id: 'channel-1' }] };
      getRemoteChannelBundleByToken.mockResolvedValue(tokenPayload.channels);

      const textbox = screen.getByRole('textbox', { name: channelTokenLabel$() });
      await fireEvent.update(textbox, 'valid-token-123');

      const submitButton = screen.getByRole('button', { name: continueAction$() });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getRemoteChannelBundleByToken).toHaveBeenCalledWith('valid-token-123');
        expect(emitted().submit).toBeTruthy();
        expect(emitted().submit[0][0]).toEqual({
          token: 'valid-token-123',
          channels: tokenPayload.channels,
        });
      });
    });

    it('if the token does not point to a channel (404 code), shows a validation message', async () => {
      const { emitted } = renderComponent();
      const error = { response: { status: 404 } };
      getRemoteChannelBundleByToken.mockRejectedValue(error);

      const textbox = screen.getByRole('textbox', { name: channelTokenLabel$() });
      await fireEvent.update(textbox, 'invalid-token');

      const submitButton = screen.getByRole('button', { name: continueAction$() });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getRemoteChannelBundleByToken).toHaveBeenCalledWith('invalid-token');
        expect(screen.getByText(invalidTokenMessage$())).toBeInTheDocument();
        expect(emitted().submit).toBeFalsy();
      });
    });

    it('shows an ui-alert error if there is a generic network error (other error code)', async () => {
      const { emitted } = renderComponent();
      const error = { response: { status: 500 } };
      getRemoteChannelBundleByToken.mockRejectedValue(error);

      const textbox = screen.getByRole('textbox', { name: channelTokenLabel$() });
      await fireEvent.update(textbox, 'valid-token');

      const submitButton = screen.getByRole('button', { name: continueAction$() });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getRemoteChannelBundleByToken).toHaveBeenCalledWith('valid-token');
        expect(screen.getByText(networkErrorMessage$())).toBeInTheDocument();
        expect(emitted().submit).toBeFalsy();
      });
    });
  });
});
