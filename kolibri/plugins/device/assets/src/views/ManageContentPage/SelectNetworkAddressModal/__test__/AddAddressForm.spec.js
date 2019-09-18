import { mount } from '@vue/test-utils';
import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
import AddAddressForm from '../AddAddressForm';
import makeStore from '../../../../../test/utils/makeStore';
import { createAddress } from '../api';

jest.mock('../api', () => ({
  createAddress: jest.fn(),
}));

function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(AddAddressForm, {
    store,
  });
  wrapper.setData({
    name: 'Home Network',
    nameBlurred: true,
    address: 'home.network',
    addressBlurred: true,
  });
  const els = {
    addressTextbox: () => wrapper.findAll({ name: 'KTextbox' }).at(0),
    nameTextbox: () => wrapper.findAll({ name: 'KTextbox' }).at(1),
  };
  return { store, wrapper, els };
}

describe('AddAddressForm', () => {
  beforeEach(() => {
    createAddress.mockReset();
  });

  it('shows a URL formatting error if API responds with one', async () => {
    const { els, wrapper } = makeWrapper();
    createAddress.mockRejectedValue({
      entity: [
        {
          id: ERROR_CONSTANTS.NETWORK_LOCATION_NOT_FOUND,
        },
      ],
    });
    expect(els.addressTextbox().props().invalid).toEqual(false);
    try {
      await wrapper.vm.handleSubmit();
    } catch (err) {
      expect(els.addressTextbox().props().invalid).toEqual(true);
      expect(els.addressTextbox().props().invalidText).toEqual(
        'Could not connect to this network address'
      );
    }
  });

  it('shows a server unavailable error if API responds with one', async () => {
    const { els, wrapper } = makeWrapper();
    createAddress.mockRejectedValue({
      entity: [{ id: ERROR_CONSTANTS.INVALID_NETWORK_LOCATION_FORMAT }],
    });
    expect(els.addressTextbox().props().invalid).toEqual(false);
    try {
      await wrapper.vm.handleSubmit();
    } catch (err) {
      expect(els.addressTextbox().props().invalid).toEqual(true);
      expect(els.addressTextbox().props().invalidText).toEqual(
        'Please enter a valid IP address, URL, or hostname'
      );
    }
  });

  it('does not emit a "added_address" event if address and name are not provided', async () => {
    const { els, wrapper } = makeWrapper();
    wrapper.setData({
      name: '',
      address: '',
    });
    await wrapper.vm.handleSubmit();
    expect(wrapper.emitted().added_address).toBeUndefined();
    expect(els.addressTextbox().props().invalid).toEqual(true);
    expect(els.nameTextbox().props().invalid).toEqual(true);
  });

  it('emits a "added_address" event if adding the address is successful', async () => {
    const { wrapper } = makeWrapper();
    createAddress.mockResolvedValue();
    await wrapper.vm.handleSubmit();
    expect(wrapper.emitted().added_address).toHaveLength(1);
  });
});
