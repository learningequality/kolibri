import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import ChannelTokenModal from '../../src/views/AvailableChannelsPage/ChannelTokenModal';

function makeWrapper(options = {}) {
  return mount(ChannelTokenModal, { store, ...options, attrs: { disabled: false } });
}

function getElements(wrapper) {
  return {
    cancelButton: () => wrapper.find('button[name="cancel"]'),
    tokenTextbox: () => wrapper.find({ name: 'KTextbox' }),
    networkErrorAlert: () => wrapper.find({ name: 'ui-alert' }),
    lookupTokenStub: () => {
      wrapper.vm.lookupToken = jest.fn();
      return wrapper.vm.lookupToken;
    },
  };
}

describe('channelTokenModal component', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('pressing "cancel" emits a "cancel" event', () => {
    const cancelListener = jest.fn();
    wrapper = makeWrapper({
      listeners: {
        cancel: cancelListener,
      },
    });
    const { cancelButton } = getElements(wrapper);
    cancelButton().trigger('click');
    expect(cancelListener).toHaveBeenCalled();
  });

  describe('submitting a token', () => {
    async function inputToken(wrapper, token) {
      const textbox = getElements(wrapper).tokenTextbox();
      textbox.vm.$emit('input', token);
      await wrapper.vm.$nextTick();
      expect(textbox.props().value).toEqual(token.trim());
    }

    function assertTextboxInvalid(wrapper) {
      const textbox = getElements(wrapper).tokenTextbox();
      expect(textbox.props().invalid).toEqual(true);
      expect(textbox.props().invalidText).toEqual('Check whether you entered token correctly');
    }

    it('if user has not interacted with the form, then no validation messages appear', () => {
      const { tokenTextbox, networkErrorAlert } = getElements(wrapper);
      expect(tokenTextbox().props().invalid).toEqual(false);
      expect(networkErrorAlert().exists()).toEqual(false);
    });

    it('disables the form while waiting for a response from the server', () => {
      //...then re-enables it afterwards
      const { lookupTokenStub } = getElements(wrapper);
      const lookupStub = lookupTokenStub();
      const disabledSpy = jest.fn();
      wrapper.vm.$watch('formIsDisabled', disabledSpy);
      // not checking the Promise.reject case
      lookupStub.mockResolvedValue([]);
      return inputToken(wrapper, 'toka-toka-token')
        .then(() => {
          wrapper.vm.submitForm();
        })
        .then(() => {
          expect(disabledSpy.mock.calls[0][0]).toEqual(true);
          expect(disabledSpy.mock.calls[0][1]).toBeFalsy();
        });
    });

    it('emits a "submit" event if token lookup is successful', () => {
      const tokenPayload = { id: 'toka-toka-token' };
      const { lookupTokenStub } = getElements(wrapper);
      const lookupStub = lookupTokenStub();
      lookupStub.mockResolvedValue([tokenPayload]);
      return inputToken(wrapper, 'toka-toka-token')
        .then(() => {
          wrapper.vm.submitForm();
        })
        .then(() => {
          expect(lookupStub).toHaveBeenCalledWith('toka-toka-token');
          expect(wrapper.emitted().submit).toEqual([[tokenPayload]]);
        });
    });

    it('on submit, shows a validation message when token code is empty', () => {
      return inputToken(wrapper, '    ')
        .then(() => {
          // HACK: Clicking the submit button does not propagate to the form, so calling
          // submit method directly
          return wrapper.vm.submitForm();
        })
        .then(() => {
          assertTextboxInvalid(wrapper);
        });
    });

    it('on blur, shows a validation message when token code is empty', async () => {
      const textbox = getElements(wrapper).tokenTextbox();
      await inputToken(wrapper, '    ');
      // Reaching into ui-textbox's blur to trigger it on k-textbox
      textbox.vm.$refs.textbox.$emit('blur');
      await wrapper.vm.$nextTick();
      assertTextboxInvalid(wrapper);
    });

    it('if the token does not point to a channel (404 code), shows a validation message', async () => {
      const tokenPayload = { status: { code: 404 } };
      const { lookupTokenStub } = getElements(wrapper);
      const lookupStub = lookupTokenStub();
      lookupStub.mockRejectedValue(tokenPayload);
      await inputToken(wrapper, 'toka-toka-token');
      await wrapper.vm.submitForm();
      expect(lookupStub).toHaveBeenCalledWith('toka-toka-token');
      expect(wrapper.emittedByOrder().length).toEqual(0);
      assertTextboxInvalid(wrapper);
    });

    it('shows an ui-alert error if there is a generic network error (other error code)', async () => {
      const tokenPayload = { status: { code: 500 } };
      const { tokenTextbox, networkErrorAlert, lookupTokenStub } = getElements(wrapper);
      const textbox = tokenTextbox();
      const lookupStub = lookupTokenStub();
      lookupStub.mockRejectedValue(tokenPayload);
      await inputToken(wrapper, 'toka-toka-token');
      await wrapper.vm.submitForm();
      expect(lookupStub).toHaveBeenCalledWith('toka-toka-token');
      expect(wrapper.emittedByOrder().length).toEqual(0);
      expect(textbox.props().invalid).toEqual(false);
      expect(networkErrorAlert().isVueInstance()).toEqual(true);
    });
  });
});
