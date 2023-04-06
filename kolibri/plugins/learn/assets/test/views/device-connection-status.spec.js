import { shallowMount, mount } from '@vue/test-utils';
import { useDevicesWithFacility } from 'kolibri.coreVue.componentSets.sync';
import DeviceConnectionStatus from '../../src/views/DeviceConnectionStatus';

jest.mock('kolibri.coreVue.componentSets.sync');

function makeWrapper({ propsData } = {}) {
  return mount(DeviceConnectionStatus, { propsData });
}

describe('DeviceConnectionStatus', () => {
  beforeEach(() => {
    useDevicesWithFacility.mockReturnValue({
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
      propsData: {
        deviceId: '1',
      },
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
    useDevicesWithFacility.mockReturnValue({ devices: [], isFetching: true });
    const wrapper = makeWrapper({
      propsData: {
        deviceId: '1',
      },
    });
    useDevicesWithFacility.mockReturnValue({ isFetching: false });
    wrapper.vm.$nextTick(() => {
      expect(wrapper.find('[data-test="disconnected-icon"]').exists()).toBeTruthy();
    });
  });
});
