import { mount } from '@vue/test-utils';
import urls from 'kolibri.urls';
import AppError from '../index.vue';
import { coreStoreFactory as makeStore } from '../../../../src/state/store';

jest.mock('kolibri.urls', () => ({
  'kolibri:kolibri.plugins.learn:learn': () => 'learnurl',
  'kolibri:kolibri.plugins.coach:coach': () => 'coachurl',
  'kolibri:kolibri.plugins.device:device_management': () => 'deviceurl',
  'kolibri:kolibri.plugins.facility:facility_management': () => 'facilityurl',
  'kolibri:kolibri.plugins.user:user': () => 'userurl',
}));

function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(AppError, {
    store,
  });
  return { wrapper, store };
}

describe('AppError component', () => {
  const { location } = window;

  beforeAll(() => {
    delete window.location;
    window.location = { href: '' };
  });

  afterAll(() => {
    window.location = location;
  });

  function simulateError(store) {
    const error = {
      status: {
        code: 404,
      },
      request: {
        method: 'GET',
      },
    };
    store.state.core.error = JSON.stringify(error);
  }

  it('shows page not found errors and buttons if the error has status code 404', () => {
    const tests = [
      { url: 'localhost:8000/learnurl', label: 'Back to Learn' },
      { url: 'localhost:8000/coachurl', label: 'Back to Coach' },
      { url: 'localhost:8000/deviceurl', label: 'Back to Device' },
      { url: 'localhost:8000/facilityurl', label: 'Back to Facility' },
    ];
    tests.forEach(({ url, label }) => {
      window.location.href = url;
      const { wrapper, store } = makeWrapper();
      simulateError(store);
      expect(wrapper.find({ name: 'KButton' }).props().text).toEqual(label);
      expect(wrapper.find('h1').text()).toEqual('Page not found');
    });
  });

  it('if a plugin is disabled, a default "Refresh" button is shown', () => {
    delete urls['kolibri:kolibri.plugins.learn:learn'];
    window.location.href = 'localhost:8000/learnurl';
    const { wrapper, store } = makeWrapper();
    simulateError(store);
    expect(wrapper.find({ name: 'KButton' }).props().text).toEqual('Back to home');
  });
});
