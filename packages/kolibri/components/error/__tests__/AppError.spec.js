import { mount } from '@vue/test-utils';
import { coreStoreFactory as makeStore } from 'kolibri/store';
import AppError from '../AppError';
import coreModule from '../../../../../kolibri/core/assets/src/state/modules/core';

function makeWrapper() {
  const store = makeStore();
  store.registerModule('core', coreModule);
  const wrapper = mount(AppError, {
    store,
  });
  return { wrapper, store };
}

describe('AppError component', () => {
  it('shows page not found errors and buttons if the error has status code 404', async () => {
    const { wrapper, store } = makeWrapper();
    const error = {
      status: 404,
      config: {
        method: 'get',
      },
    };
    store.state.core.error = JSON.stringify(error);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'KButton' }).props().text).toEqual('Back to home');
    expect(wrapper.find('h1').text()).toEqual('Resource not found');
  });

  it('shows default errors and buttons if the error does not have status code 404', async () => {
    const { wrapper, store } = makeWrapper();
    const error = {
      status: 400,
      config: {
        method: 'get',
      },
    };
    store.state.core.error = JSON.stringify(error);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'KButton' }).props().text).toEqual('Refresh');
    expect(wrapper.find('h1').text()).toEqual('Sorry! Something went wrong!');
  });
});
