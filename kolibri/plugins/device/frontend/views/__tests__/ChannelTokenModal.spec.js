import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { defineComponent } from 'vue';
import { createTranslator } from 'kolibri/utils/i18n';
import ChannelTokenModal from '../AvailableChannelsPage/ChannelTokenModal';

import { getRemoteChannelBundleByToken } from '../../modules/wizard/utils';

jest.mock('../../modules/wizard/utils', () => ({
  getRemoteChannelBundleByToken: jest.fn(),
}));

const { invalidTokenMessage$, networkErrorMessage$ } = createTranslator(
  ChannelTokenModal.name,
  ChannelTokenModal.$trs,
);

describe('ChannelTokenModal component', () => {
  let mockSubmit;
  let mockCancel;

  const renderComponent = () => {
    mockSubmit = jest.fn();
    mockCancel = jest.fn();

    const Wrapper = defineComponent({
      components: { ChannelTokenModal },
      methods: { mockCancel, mockSubmit },
      template: '<ChannelTokenModal @cancel="mockCancel" @submit="mockSubmit" />',
    });

    return render(Wrapper);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getRemoteChannelBundleByToken.mockClear();
  });

  it('pressing "cancel" emits a "cancel" event', () => {
    renderComponent();
    const buttons = screen.getAllByRole('button');
    const cancelButton = buttons[0];
    fireEvent.click(cancelButton);
    expect(mockCancel).toHaveBeenCalled();
  });

  describe('submitting a token', () => {
    it('if user has not interacted with the form, then no validation messages appear', () => {
      renderComponent();
      expect(screen.queryByText(invalidTokenMessage$())).not.toBeInTheDocument();
      expect(screen.queryByText(networkErrorMessage$())).not.toBeInTheDocument();
    });

    it('on submit, shows a validation message when token code is empty', async () => {
      renderComponent();
      const buttons = screen.getAllByRole('button');
      const submitButton = buttons[1];
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(invalidTokenMessage$())).toBeInTheDocument();
      });
    });

    it('on blur, shows a validation message when token code is empty', async () => {
      renderComponent();
      const textbox = screen.getByRole('textbox');
      fireEvent.focus(textbox);
      fireEvent.blur(textbox);
      await waitFor(() => {
        expect(screen.getByText(invalidTokenMessage$())).toBeInTheDocument();
      });
    });

    it('emits a "submit" event if token lookup is successful', async () => {
      renderComponent();
      const tokenPayload = { token: 'valid-token-123', channels: [{ id: 'channel-1' }] };
      getRemoteChannelBundleByToken.mockResolvedValue(tokenPayload.channels);

      const textbox = screen.getByRole('textbox');
      await fireEvent.update(textbox, 'valid-token-123');

      const buttons = screen.getAllByRole('button');
      const submitButton = buttons[1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getRemoteChannelBundleByToken).toHaveBeenCalledWith('valid-token-123');
        expect(mockSubmit).toHaveBeenCalledWith({
          token: 'valid-token-123',
          channels: tokenPayload.channels,
        });
      });
    });

    it('if the token does not point to a channel (404 code), shows a validation message', async () => {
      renderComponent();
      const error = { response: { status: 404 } };
      getRemoteChannelBundleByToken.mockRejectedValue(error);

      const textbox = screen.getByRole('textbox');
      await fireEvent.update(textbox, 'invalid-token');

      const buttons = screen.getAllByRole('button');
      const submitButton = buttons[1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getRemoteChannelBundleByToken).toHaveBeenCalledWith('invalid-token');
        expect(screen.getByText(invalidTokenMessage$())).toBeInTheDocument();
      });
    });

    it('shows an ui-alert error if there is a generic network error (other error code)', async () => {
      renderComponent();
      const error = { response: { status: 500 } };
      getRemoteChannelBundleByToken.mockRejectedValue(error);

      const textbox = screen.getByRole('textbox');
      await fireEvent.update(textbox, 'valid-token');

      const buttons = screen.getAllByRole('button');
      const submitButton = buttons[1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getRemoteChannelBundleByToken).toHaveBeenCalledWith('valid-token');
        expect(screen.getByText(networkErrorMessage$())).toBeInTheDocument();
      });
    });
  });
});
