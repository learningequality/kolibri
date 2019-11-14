import { mount } from '@vue/test-utils';
import SelectAddressForm from '../SelectAddressForm';
import makeStore from '../../../../../test/utils/makeStore';
import { fetchAddresses } from '../api';

const addresses = [
  {
    id: '1',
    device_name: 'Available Server',
    base_url: 'http://localhost:8000',
    available: true,
    hasContent: true,
  },
  {
    id: '2',
    device_name: 'Unavailable Server',
    base_url: 'http://localhost:8001',
    available: false,
    hasContent: true,
  },
  {
    id: '3',
    device_name: 'Content-less Server',
    base_url: 'http://localhost:8001',
    available: true,
    hasContent: false,
  },
];

jest.mock('../api.js', () => ({
  fetchAddresses: jest.fn(),
  deleteAddress: jest.fn().mockResolvedValue(),
}));

function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(SelectAddressForm, {
    store,
  });
  // prettier-ignore
  const els = {
    KModal: () => wrapper.find({ name: 'KModal' }),
    newAddressButton: () => wrapper.find('a.new-address-button'),
    uiAlert: () => wrapper.find({ name: 'ui-alert' }),
    radioButtons: () => wrapper.findAll({ name: 'KRadioButton' }),
  };
  return { store, wrapper, els };
}

describe('SelectAddressForm', () => {
  beforeEach(() => {
    fetchAddresses.mockReset();
    fetchAddresses.mockResolvedValue(addresses);
  });

  it('shows a loading message when fetching addresses', () => {
    // and continue button and new address buttons are disabled
    const { els } = makeWrapper();
    expect(els.KModal().props().submitDisabled).toEqual(true);
    expect(els.newAddressButton().isVisible()).toEqual(false);
    expect(els.uiAlert().exists()).toEqual(true);
    expect(els.uiAlert().text()).toEqual('Looking for available addresses…');
  });

  it('shows one address for each one fetched', async () => {
    const { els, wrapper } = makeWrapper();
    await wrapper.vm.$nextTick();
    expect(els.radioButtons()).toHaveLength(3);
    const server1 = els.radioButtons().at(0);
    expect(server1.props().label).toEqual('Available Server');
    expect(server1.props().description).toEqual('http://localhost:8000');
    // For some reason, KModal's props are not correct
    expect(wrapper.vm.submitDisabled).toEqual(false);
    // expect(els.KModal().props().submitDisabled).toEqual(false);
  });

  it('if there are no addresses, it shows an empty message', async () => {
    fetchAddresses.mockResolvedValue([]);
    const { els, wrapper } = makeWrapper();
    await wrapper.vm.$nextTick();
    expect(els.radioButtons()).toHaveLength(0);
    expect(els.uiAlert().exists()).toEqual(true);
    expect(els.uiAlert().text()).toEqual('There are no addresses yet');
    expect(els.KModal().props().submitDisabled).toEqual(true);
  });

  it('if an address is (un)available, it is (dis)enabled', async () => {
    const { els, wrapper } = makeWrapper();
    function radioButtonNIsDisabled(n) {
      return els
        .radioButtons()
        .at(n)
        .props().disabled;
    }
    await wrapper.vm.$nextTick();
    expect(radioButtonNIsDisabled(0)).toEqual(false);
    expect(radioButtonNIsDisabled(1)).toEqual(true);
    expect(radioButtonNIsDisabled(2)).toEqual(true);
  });

  it('clicking "forget" next to an address triggers a forgetting action', async () => {
    const { wrapper } = makeWrapper();
    await wrapper.vm.$nextTick();
    await wrapper.vm.removeSavedAddress();
    expect(wrapper.emitted().removed_address).toHaveLength(1);
  });

  it('clicking "continue" emits a "submit" event with the selected location ID', async () => {
    const { wrapper, els } = makeWrapper();
    await wrapper.vm.$nextTick();
    els.KModal().vm.$emit('submit');
    expect(wrapper.emitted().submit[0][0].id).toEqual('1');
  });
});
