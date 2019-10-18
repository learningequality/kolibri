import { mount } from '@vue/test-utils';
import AppError from '../index.vue';
import { coreStoreFactory as makeStore } from '../../../../src/state/store';

function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(AppError, {
    store,
  });
  return { wrapper, store };
}

describe('AppError component', () => {
  it('shows page not found errors and buttons if the error has status code 404', () => {
    const { wrapper, store } = makeWrapper();
    const error = {
      status: {
        code: 404,
      },
      request: {
        method: 'GET',
      },
    };
    store.state.core.error = JSON.stringify(error);
    expect(wrapper.find({ name: 'KButton' }).props().text).toEqual('Back to home');
    expect(wrapper.find('h1').text()).toEqual('Resource not found');
  });

  it('shows default errors and buttons if the error does not have status code 404', () => {
    const { wrapper, store } = makeWrapper();
    const error = {
      status: {
        code: 400,
      },
      request: {
        method: 'GET',
      },
    };
    store.state.core.error = JSON.stringify(error);
    expect(wrapper.find({ name: 'KButton' }).props().text).toEqual('Refresh');
    expect(wrapper.find('h1').text()).toEqual('Sorry! Something went wrong!');
  });
});
