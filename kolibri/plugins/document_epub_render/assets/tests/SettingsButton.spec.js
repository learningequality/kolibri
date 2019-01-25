import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import SettingsButton from '../src/views/SettingsButton';

function createWrapper() {
  return mount(SettingsButton, { store });
}

describe('Settings button', () => {
  it('should mount', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
  it('should emit an event when the button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.find('button').trigger('click');
    expect(wrapper.emitted().click).toBeTruthy();
  });
});
