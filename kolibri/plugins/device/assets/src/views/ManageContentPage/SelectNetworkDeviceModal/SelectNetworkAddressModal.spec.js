import { mount } from '@vue/test-utils';
import SelectNetworkDeviceModal from '../index.vue';
import { coreStoreFactory } from '../../../../state/store';

jest.mock('../api.js', () => ({
  fetchDevices: jest.fn().mockResolvedValue([]),
  deleteDevice: jest.fn().mockResolvedValue(),
  createDevice: jest.fn().mockResolvedValue(),
}));

// prettier-ignore
function makeWrapper() {
  const store = coreStoreFactory();
  const wrapper = mount(SelectNetworkAddressModal, {
    store,
  })
  const els = {
    SelectDeviceForm: () => wrapper.find({ name: 'SelectDeviceForm' }),
    AddDeviceForm: () => wrapper.find({ name: 'AddDeviceForm' }),
  };

  const actions = {
    clickNewAddress: () => els.SelectDeviceForm().find({ name: 'KButton' }).vm.$emit('click'),
    clickAddAddressCancel: () => els.AddDeviceForm().vm.$emit('cancel'),
    clickSelectAddressCancel: () => els.SelectDeviceForm().vm.$emit('cancel'),
  }

  return { wrapper, store, els, actions };
}

describe('SelectNetworkDeviceModal', () => {
  it('starts on the Select Device Form', () => {
    const { els } = makeWrapper();
    expect(els.SelectDeviceForm().isVueInstance()).toBe(true);
  });

  it('clicking the "new address" button takes you to the New Address Form', async () => {
    const { els, actions, wrapper } = makeWrapper();
    actions.clickNewAddress();
    await wrapper.vm.$nextTick();
    expect(els.SelectDeviceForm().exists()).toBe(false);
    expect(els.AddDeviceForm().isVueInstance()).toBe(true);
  });

  it('clicking "cancel" on the New Address Form takes you back', async () => {
    const { actions, wrapper } = makeWrapper();
    actions.clickNewAddress();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.addingAddress).toBe(true);
    actions.clickAddAddressCancel();
    await wrapper.vm.$nextTick();
    // Can't test presence of component for some reason. Checking the wrapper.vm.stage
    expect(wrapper.vm.addingAddress).toBe(false);
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
      expect(wrapper.vm.addingAddress).toEqual(false);
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
