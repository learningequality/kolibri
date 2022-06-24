import { shallowMount } from '@vue/test-utils';
import FacilityNameAndSyncStatus from '../index';

describe('FacilityNameAndSyncStatus', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(FacilityNameAndSyncStatus);
    expect(wrapper.exists()).toBeTruthy();
  });
});
