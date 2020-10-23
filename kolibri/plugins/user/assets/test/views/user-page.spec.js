import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import UserIndex from '../../src/views/UserIndex';
import makeStore from '../makeStore';

const localVue = createLocalVue();

localVue.use(VueRouter);
localVue.use(Vuex);

const router = new VueRouter();

function makeWrapper() {
  return mount(UserIndex, {
    localVue,
    store: makeStore(),
    router,
  });
}

describe('user index page component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toEqual(true);
  });
});
