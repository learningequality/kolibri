import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import UserAuthIndex from '../../src/views/UserAuthIndex';
import makeStore from '../makeStore';

const localVue = createLocalVue();

localVue.use(VueRouter);
localVue.use(Vuex);

const router = new VueRouter();

function makeWrapper() {
  return mount(UserAuthIndex, {
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
