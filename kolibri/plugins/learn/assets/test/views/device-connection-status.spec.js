import { shallowMount, mount } from '@vue/test-utils';
import DeviceConnectionStatus from '../../src/views/DeviceConnectionStatus';

import useDeviceConnectionStatus, {
  // eslint-disable-next-line import/named
  useDeviceConnectionStatusMock,
} from '../../src/composables/useDeviceConnectionStatus';

jest.mock('../../src/composables/useDeviceConnectionStatus');
function makeWrapper({ propsData } = {}) {
  return mount(DeviceConnectionStatus, { propsData });
}

describe('DeviceConnectionStatus', () => {
  beforeEach(() => {
    useDeviceConnectionStatus.mockImplementation(() => useDeviceConnectionStatusMock());
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

  it('shows the disconnected icon', () => {
    useDeviceConnectionStatus.mockImplementation(() =>
      useDeviceConnectionStatusMock({ disconnected: true })
    );
    const wrapper = makeWrapper({
      propsData: {
        deviceId: '1',
      },
    });
    expect(wrapper.find('[data-test="disconnected-icon"]').exists()).toBeTruthy();
  });
});
