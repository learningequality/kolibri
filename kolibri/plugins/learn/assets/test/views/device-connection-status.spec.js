import { shallowMount, mount } from '@vue/test-utils';
import useDevices from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices';
import DeviceConnectionStatus from '../../src/views/DeviceConnectionStatus';

jest.mock('kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/useDevices');

function makeWrapper({ propsData } = {}) {
  return mount(DeviceConnectionStatus, { propsData });
}

describe('DeviceConnectionStatus', () => {
  beforeEach(() => {
    useDevices.mockReturnValue({
      devices: [
        {
          id: '1',
          available: true,
        },
      ],
    });
  });
  it('smoke test', () => {
    const wrapper = shallowMount(DeviceConnectionStatus, {
      propsData: {},
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('does not show the disconnected icon', () => {
    const wrapper = makeWrapper({
      propsData: {
        deviceId: '1',
      },
    });

    expect(wrapper.find('[data-test="disconnected-icon"]').exists()).toBeFalsy();
  });

  it('shows the disconnected icon', async () => {
    useDevices.mockReturnValue({ devices: [], isFetching: true });
    const wrapper = makeWrapper({
      propsData: {
        deviceId: '1',
      },
    });
    useDevices.mockReturnValue({ isFetching: false });
    wrapper.vm.$nextTick(() => {
      expect(wrapper.find('[data-test="disconnected-icon"]').exists()).toBeTruthy();
    });
  });
});
