import { shallowMount } from '@vue/test-utils';
import NotificationsRoot from '../../src/views/NotificationsRoot.vue';
import { coreStoreFactory as makeStore } from '../../src/state/store';

function makeWrapper(options = {}) {
  const store = makeStore();
  const wrapper = shallowMount(NotificationsRoot, {
    store,
    ...options,
    computed: {
      notAuthorized: () => false,
      showNotification: () => false,
      mostRecentNotification: () => {
        return {
          id: 1,
          title: 'title',
          msg: 'notification',
          linkText: 'linktext',
          linkUrl: 'url',
        };
      },
      ...(options.computed || {}),
    },
  });
  return { wrapper, store, ...options };
}

describe('NotificationsRoot', function() {
  it('smoke test', () => {
    const { wrapper } = makeWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  describe('when loaded', function() {
    it('if user is authorized and there is no error, main div for displaying <slot> should be displayed', async () => {
      const { wrapper, store } = makeWrapper();
      store.state.core.loading = false;
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-test="main"]').exists()).toBeTruthy();
      expect(wrapper.findComponent({ name: 'AuthMessage' }).exists()).toBeFalsy();
      expect(wrapper.findComponent({ name: 'AppError' }).exists()).toBeFalsy();
    });

    it('if user is not authorized, AuthMessage component should be rendered', async () => {
      const { wrapper, store } = makeWrapper({ computed: { notAuthorized: () => true } });
      store.state.core.loading = false;
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'AuthMessage' }).exists()).toBeTruthy();
      expect(wrapper.findComponent({ name: 'AppError' }).exists()).toBeFalsy();
      expect(wrapper.find('[data-test="main"]').exists()).toBeFalsy();
    });

    it('if there is an error, AppError component should be rendered', async () => {
      const { wrapper, store } = makeWrapper();
      store.state.core.loading = false;
      store.state.core.error = 'some error here';
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'AppError' }).exists()).toBeTruthy();
      expect(wrapper.findComponent({ name: 'AuthMessage' }).exists()).toBeFalsy();
      expect(wrapper.find('[data-test="main"]').exists()).toBeFalsy();
    });

    it('UpdateNotification should be rendered ', async () => {
      const { wrapper, store } = makeWrapper({ computed: { showNotification: () => true } });
      store.state.core.loading = false;
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'UpdateNotification' }).exists()).toBeTruthy();
    });

    it('UpdateNotification should not be rendered ', async () => {
      const { wrapper, store } = makeWrapper({
        computed: {
          showNotification: () => true,
          mostRecentNotification: () => null,
        },
      });
      store.state.core.loading = false;
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'UpdateNotification' }).exists()).toBeFalsy();
    });
  });
});
