import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { defineComponent } from 'vue';
import ChannelTokenModal from '../AvailableChannelsPage/ChannelTokenModal';
import { createTranslator } from 'kolibri/utils/i18n';
import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

jest.mock('../../modules/wizard/utils', () => ({
  getRemoteChannelBundleByToken: jest.fn(),
}));

import { getRemoteChannelBundleByToken } from '../../modules/wizard/utils';

const { channelTokenLabel$, invalidTokenMessage$, networkErrorMessage$ } = createTranslator(ChannelTokenModal.name, ChannelTokenModal.$trs);
const { cancelAction$ } = commonCoreStrings;

describe('ChannelTokenModal component', () => {
  let mockSubmit;
  let mockCancel;

  const renderComponent = (props = {}) => {
    mockSubmit = jest.fn();
    mockCancel = jest.fn();

    const Wrapper = defineComponent({
      components: { ChannelTokenModal },
      template: '<ChannelTokenModal @cancel="mockCancel" @submit="mockSubmit" />',
      methods: { mockCancel, mockSubmit },
    });

    return render(Wrapper);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getRemoteChannelBundleByToken.mockClear();
  });

  it('pressing "cancel" emits a "cancel" event', () => {
    renderComponent();
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    expect(mockCancel).toHaveBeenCalled();
  });

  describe('submitting a token', () => {
    it('if user has not interacted with the form, then no validation messages appear', () => {
      renderComponent();
      expect(screen.queryByText(/check whether you entered/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/unable to connect/i)).not.toBeInTheDocument();
    });

    it('on submit, shows a validation message when token code is empty', async () => {
      renderComponent();
      const submitButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/check whether you entered/i)).toBeInTheDocument();
      });
    });

    it('on blur, shows a validation message when token code is empty', async () => {
      renderComponent();
      const textbox = screen.getByDisplayValue('');
      fireEvent.focus(textbox);
      fireEvent.blur(textbox);
      await waitFor(() => {
        expect(screen.getByText(/check whether you entered/i)).toBeInTheDocument();
      });
    });

    it('emits a "submit" event if token lookup is successful', async () => {
      renderComponent();
      const tokenPayload = { token: 'valid-token-123', channels: [{ id: 'channel-1' }] };
      getRemoteChannelBundleByToken.mockResolvedValue(tokenPayload.channels);

      const textbox = screen.getByDisplayValue('');
      await fireEvent.update(textbox, 'valid-token-123');
      
      const submitButton = screen.getByRole('button', { name: /continue/i });
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

      const textbox = screen.getByDisplayValue('');
      await fireEvent.update(textbox, 'invalid-token');
      
      const submitButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getRemoteChannelBundleByToken).toHaveBeenCalledWith('invalid-token');
        expect(screen.getByText(/check whether you entered/i)).toBeInTheDocument();
      });
    });

    it('shows an ui-alert error if there is a generic network error (other error code)', async () => {
      renderComponent();
      const error = { response: { status: 500 } };
      getRemoteChannelBundleByToken.mockRejectedValue(error);

      const textbox = screen.getByDisplayValue('');
      await fireEvent.update(textbox, 'valid-token');
      
      const submitButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(getRemoteChannelBundleByToken).toHaveBeenCalledWith('valid-token');
        expect(screen.getByText(/unable to connect/i)).toBeInTheDocument();
      });
    });
  });
});
