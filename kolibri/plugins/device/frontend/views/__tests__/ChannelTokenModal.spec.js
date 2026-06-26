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
  });
});
