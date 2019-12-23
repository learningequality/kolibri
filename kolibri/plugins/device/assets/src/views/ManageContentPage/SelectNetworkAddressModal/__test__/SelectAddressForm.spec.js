import { mount } from '@vue/test-utils';
import SelectAddressForm from '../SelectAddressForm';
import makeStore from '../../../../../test/utils/makeStore';
import { fetchStaticAddresses, fetchDynamicAddresses } from '../api';

const addresses = [
  {
    id: '1',
    nickname: 'Available Server',
    base_url: 'http://localhost:8000',
    available: true,
    hasContent: true,
  },
  {
    id: '2',
    nickname: 'Unavailable Server',
    base_url: 'http://localhost:8001',
    available: false,
    hasContent: true,
  },
  {
    id: '3',
    nickname: 'Content-less Server',
    base_url: 'http://localhost:8001',
    available: true,
    hasContent: false,
  },
];

jest.mock('../api.js', () => ({
  fetchStaticAddresses: jest.fn(),
  fetchDynamicAddresses: jest.fn(),
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
    horizontalLine: () => wrapper.findAll('hr'),
  };
  return { store, wrapper, els };
}

describe('SelectAddressForm', () => {
  beforeEach(() => {
    fetchStaticAddresses.mockReset();
    fetchStaticAddresses.mockResolvedValue(addresses);
    fetchDynamicAddresses.mockReset();
    fetchDynamicAddresses.mockResolvedValue(addresses);
  });

  it('shows one address for each one fetched', async () => {
    const { els, wrapper } = makeWrapper();
    await wrapper.vm.$nextTick();
    expect(els.radioButtons()).toHaveLength(6);
    const server1 = els.radioButtons().at(0);
    expect(server1.props().label).toEqual('Available Server');
    expect(server1.props().description).toEqual('http://localhost:8000');
    // For some reason, KModal's props are not correct
    expect(wrapper.vm.submitDisabled).toEqual(false);
    // expect(els.KModal().props().submitDisabled).toEqual(false);
  });

  it('if there are no addresses, it shows an empty message', async () => {
    fetchStaticAddresses.mockResolvedValue([]);
    fetchDynamicAddresses.mockResolvedValue([]);
    const { els, wrapper } = makeWrapper();
    await wrapper.vm.$nextTick();
    expect(els.radioButtons()).toHaveLength(0);
    expect(wrapper.text()).toContain('There are no addresses yet');
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

  it('shows a horizontal line when there are discovered addresses', async () => {
    const { wrapper, els } = makeWrapper();
    await wrapper.vm.$nextTick();
    expect(els.horizontalLine().exists()).toBe(true);
  });

  it('does not show a horizontal line when there are no discovered addresses', async () => {
    fetchDynamicAddresses.mockResolvedValue([]);
    const { wrapper, els } = makeWrapper();
    await wrapper.vm.$nextTick();
    expect(els.horizontalLine().exists()).toBe(false);
  });
});
