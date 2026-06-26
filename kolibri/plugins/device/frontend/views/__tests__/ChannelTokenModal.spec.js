import { render, screen, fireEvent } from '@testing-library/vue';
import { defineComponent } from 'vue';
import ChannelTokenModal from '../AvailableChannelsPage/ChannelTokenModal';
import { createTranslator } from 'kolibri/utils/i18n';
import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

jest.mock('../../modules/wizard/utils', () => ({
  getRemoteChannelBundleByToken: jest.fn(),
}));

import { getRemoteChannelBundleByToken } from '../../modules/wizard/utils';

const { enterChannelToken$, tokenExplanation$, channelTokenLabel$, invalidTokenMessage$, networkErrorMessage$ } = createTranslator(ChannelTokenModal.name, ChannelTokenModal.$trs);
const { continueAction$, cancelAction$ } = commonCoreStrings;

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
});
