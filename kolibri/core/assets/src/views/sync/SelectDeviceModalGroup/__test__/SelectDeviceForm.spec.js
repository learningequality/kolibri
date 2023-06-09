import { shallowMount } from '@vue/test-utils';
import SelectDeviceForm from '../SelectDeviceForm';
import { fetchDevices, updateConnectionStatus } from '../api';

jest.mock('../api.js', () => ({
  fetchDevices: jest.fn(),
  deleteDevice: jest.fn().mockResolvedValue(),
  updateConnectionStatus: jest.fn(),
  deviceFacilityCanSignUp: jest.fn().mockResolvedValue(true),
}));

const devices = [
  {
    id: '1',
    instance_id: '1',
    nickname: 'Available Server',
    base_url: 'http://localhost:8000',
    application: 'kolibri',
    available: true,
  },
  {
    id: '2',
    instance_id: '2',
    nickname: 'Unavailable Server',
    base_url: 'http://localhost:8001',
    application: 'kolibri',
    available: false,
  },
  {
    id: '3',
    instance_id: '3',
    nickname: 'Content-less Server',
    base_url: 'http://localhost:8001',
    application: 'kolibri',
    available: true,
  },
];

const staticDevices = devices.map(a => ({ ...a, dynamic: false }));
const dynamicDevices = devices.map(a => ({ ...a, dynamic: true }));

function makeWrapper() {
  const deviceIdMap = devices.reduce((acc, device) => {
    acc[device.id] = device;
    return acc;
  }, {});
  const wrapper = shallowMount(SelectDeviceForm, {
    mocks: { lodsWithSignupFacility: deviceIdMap },
  });
  // prettier-ignore
  const els = {
    KModal: () => wrapper.findComponent({ name: 'KModal' }),
    newDeviceButton: () => wrapper.find('a.new-device-button'),
    uiAlert: () => wrapper.find({ name: 'ui-alert' }),
    radioButtons: () => wrapper.findAllComponents({ name: 'KRadioButton' }),
    horizontalLine: () => wrapper.findAll('hr'),
  };
  return { wrapper, els };
}

describe('SelectDeviceForm', () => {
  beforeEach(() => {
    fetchDevices.mockReset();
    fetchDevices.mockResolvedValue(staticDevices.concat(dynamicDevices));
  });

  it('shows one device for each one fetched', async () => {
    const { els, wrapper } = makeWrapper();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.hasFetched).toBe(true);
    expect(els.radioButtons()).toHaveLength(6);
    const server1 = els.radioButtons().at(0);
    expect(server1.props().label).toEqual('Available Server');
    expect(server1.props().description).toEqual('http://localhost:8000');
    expect(wrapper.vm.submitDisabled).toEqual(false);
  });

  it('if there are no devices, it shows an empty message', async () => {
    fetchDevices.mockResolvedValue([]);
    const { els, wrapper } = makeWrapper();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(els.radioButtons()).toHaveLength(0);
    expect(wrapper.text()).toContain('There are no devices yet');
    expect(els.KModal().props().submitDisabled).toEqual(true);
  });

  it('if an device is (un)available, it is (dis)enabled', async () => {
    const { els, wrapper } = makeWrapper();
    function radioButtonNIsDisabled(n) {
      return els
        .radioButtons()
        .at(n)
        .props().disabled;
    }
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(radioButtonNIsDisabled(0)).toEqual(false);
    expect(radioButtonNIsDisabled(1)).toEqual(true);
    expect(radioButtonNIsDisabled(2)).toEqual(false);
  });

  it('clicking "forget" next to an device triggers a forgetting action', async () => {
    const { wrapper } = makeWrapper();
    await wrapper.vm.$nextTick();
    await wrapper.vm.removeSavedDevice();
    expect(wrapper.emitted().removed_address).toHaveLength(1);
  });

  it('clicking "continue" emits a "submit" event with the selected location ID', async () => {
    const { wrapper, els } = makeWrapper();
    await wrapper.vm.$nextTick();
    updateConnectionStatus.mockResolvedValue(staticDevices[0]);
    els.KModal().vm.$emit('submit');
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted().submit[0][0].id).toEqual('1');
  });

  it('shows a horizontal line when there are discovered addresses', async () => {
    const { wrapper, els } = makeWrapper();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(els.horizontalLine().exists()).toBe(true);
  });

  it('does not show a horizontal line when there are no discovered addresses', async () => {
    fetchDevices.mockResolvedValue(staticDevices);
    const { wrapper, els } = makeWrapper();
    await wrapper.vm.$nextTick();
    expect(els.horizontalLine().exists()).toBe(false);
  });
});
