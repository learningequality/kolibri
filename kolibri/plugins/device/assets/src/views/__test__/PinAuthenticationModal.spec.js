import { mount } from '@vue/test-utils';
import { Store } from 'vuex';
import PinAuthenticationModal from '../PinAuthenticationModal';

const store = new Store({
  modules: {
    facilityConfig: {
      namespaced: true,
      state: {
        isFacilityPinValid: true,
      },
    },
  },
  actions: {
    createSnackbar() {},
  },
});

function getElements(wrapper) {
  return {
    cancelButton: () => wrapper.find('button[name="cancel"]'),
    pinTextbox: () => wrapper.findComponent({ name: 'KTextbox' }),
    form: () => wrapper.find('form'),
    isPinValidStub: () => {
      wrapper.vm.isPinValid = jest.fn();
      return wrapper.vm.isPinValid;
    },
  };
}

function makeWrapper(options) {
  return mount(PinAuthenticationModal, { store, ...options });
}

describe('PinAuthenticationModal', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('clicking cancel causes a "cancel" event to be emitted', () => {
    const cancelListener = jest.fn();
    wrapper = makeWrapper({
      listeners: {
        cancel: cancelListener,
      },
    });
    const elements = getElements(wrapper);
    elements.cancelButton().trigger('click');
    expect(cancelListener).toHaveBeenCalled();
  });

  describe('submitting a PIN', () => {
    async function inputPin(wrapper, pin) {
      const textbox = getElements(wrapper).pinTextbox();
      textbox.vm.$emit('input', pin);
      await wrapper.vm.$nextTick();
      expect(textbox.props().value).toEqual(pin.trim());
    }

    function assertTextbox(wrapper, errorText, invalid) {
      const textbox = getElements(wrapper).pinTextbox();
      expect(textbox.props().invalid).toEqual(invalid);
      expect(textbox.props().invalidText).toEqual(errorText);
    }

    it('if user has not interacted with the form, then no validation messages appear', () => {
      const { pinTextbox } = getElements(wrapper);
      expect(pinTextbox().props().invalid).toEqual(false);
    });

    it('emits a "submit" event if PIN validation is successful', async () => {
      const { isPinValidStub } = getElements(wrapper);
      const isPinValid = isPinValidStub();
      await isPinValid.mockResolvedValue({ is_pin_valid: true });
      return await inputPin(wrapper, '1234')
        .then(() => {
          const elements = getElements(wrapper);
          elements.form().trigger('submit');
        })
        .then(() => {
          expect(isPinValid).toHaveBeenCalledWith({ pin_code: '1234' });
          expect(wrapper.emitted().submit).toEqual([[]]);
          assertTextbox(wrapper, '', false);
        });
    });

    it('on submit, shows a validation message when PIN code is input but invalid', async () => {
      //Force is isFacilityPinValid to be false
      store.state.facilityConfig.isFacilityPinValid = false;

      const { isPinValidStub } = getElements(wrapper);
      const isPinValid = isPinValidStub();
      await isPinValid.mockResolvedValue({ is_pin_valid: false });
      return await inputPin(wrapper, '1234')
        .then(() => {
          const elements = getElements(wrapper);
          elements.form().trigger('submit');
        })
        .then(() => {
          expect(isPinValid).toHaveBeenCalledWith({ pin_code: '1234' });
          expect(wrapper.emitted().submit).toBeUndefined();
          assertTextbox(wrapper, 'Incorrect PIN, please try again', true);
        });
    });

    it('on submit, shows a validation message when PIN has letters', async () => {
      return inputPin(wrapper, 'abcd')
        .then(() => {
          const elements = getElements(wrapper);
          elements.form().trigger('submit');
        })
        .then(() => {
          assertTextbox(wrapper, 'Enter numbers only', true);
        });
    });

    it('on submit, shows a validation message when PIN code is empty', async () => {
      return inputPin(wrapper, '')
        .then(() => {
          const elements = getElements(wrapper);
          elements.form().trigger('submit');
        })
        .then(() => {
          assertTextbox(wrapper, 'This field is required', true);
        });
    });
  });
});
