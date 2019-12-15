import { mount } from '@vue/test-utils';
import makeStore from '../../../../../test/utils/makeStore';
import SelectNetworkAddressModal from '../index.vue';

jest.mock('../api.js', () => ({
  fetchStaticAddresses: jest.fn().mockResolvedValue([]),
  fetchDynamicAddresses: jest.fn().mockResolvedValue([]),
  deleteAddress: jest.fn().mockResolvedValue(),
  createAddress: jest.fn().mockResolvedValue(),
}));

// prettier-ignore
function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(SelectNetworkAddressModal, {
    store,
  })
  const els = {
    SelectAddressForm: () => wrapper.find({ name: 'SelectAddressForm' }),
    AddAddressForm: () => wrapper.find({ name: 'AddAddressForm' }),
  };

  const actions = {
    clickNewAddress: () => els.SelectAddressForm().find({ name: 'KButton' }).vm.$emit('click'),
    clickAddAddressCancel: () => els.AddAddressForm().vm.$emit('cancel'),
    clickSelectAddressCancel: () => els.SelectAddressForm().vm.$emit('cancel'),
  }

  return { wrapper, store, els, actions };
}

describe('SelectNetworkAddressModal', () => {
  it('starts on the Select Address Form', () => {
    const { els } = makeWrapper();
    expect(els.SelectAddressForm().isVueInstance()).toBe(true);
  });

  it('clicking the "new address" button takes you to the New Address Form', () => {
    const { els, actions } = makeWrapper();
    actions.clickNewAddress();
    expect(els.SelectAddressForm().exists()).toBe(false);
    expect(els.AddAddressForm().isVueInstance()).toBe(true);
  });

  it('clicking "cancel" on the New Address Form takes you back', () => {
    const { actions, wrapper } = makeWrapper();
    actions.clickNewAddress();
    expect(wrapper.vm.stage).toBe('ADD_ADDRESS');
    actions.clickAddAddressCancel();
    // Can't test presence of component for some reason. Checking the wrapper.vm.stage
    expect(wrapper.vm.stage).toBe('SELECT_ADDRESS');
  });

  it('click "cancel" on Select Address Form clears the wizard state', () => {
    const { store, actions } = makeWrapper();
    store.commit('manageContent/wizard/SET_WIZARD_PAGENAME', 'SELECT_NETWORK_ADDRESS');
    actions.clickSelectAddressCancel();
    expect(store.state.manageContent.wizard.pageName).toEqual('');
  });

  describe('responding to a new address', () => {
    it('on a success, the address list is reset and a snackbar is shown', () => {
      const { wrapper, actions, store } = makeWrapper();
      wrapper.vm.saveAddress = jest.fn().mockResolvedValue();
      actions.clickNewAddress();
      wrapper.vm.handleAddedAddress({
        name: 'New Network',
        address: '0.0.0.1:8000',
      });
      // And we are sent back to the Select Address Modal
      expect(wrapper.vm.stage).toEqual('SELECT_ADDRESS');
      expect(store.state.core.snackbar).toEqual({
        isVisible: true,
        options: {
          text: 'Successfully added address',
          autoDismiss: true,
        },
      });
    });
  });
  // TODO clicking submit
});
