import { shallowMount } from '@vue/test-utils';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import useUser, { useUserMock } from 'kolibri.coreVue.composables.useUser';
import NotificationsRoot from '../../src/views/NotificationsRoot.vue';
import { coreStoreFactory as makeStore } from '../../src/state/store';
import coreModule from '../../src/state/modules/core';

jest.mock('kolibri.coreVue.composables.useUser');
jest.mock('kolibri.resources');

function makeWrapper(useUserMockObj = null) {
  const store = makeStore();
  store.registerModule('core', coreModule);
  if (useUserMockObj) {
    useUser.mockImplementation(() => useUserMock(useUserMockObj));
  }
  const wrapper = shallowMount(NotificationsRoot, {
    store,
    computed: {
      mostRecentNotification: () => {
        return {
          id: 1,
          title: 'title',
          msg: 'notification',
          linkText: 'linktext',
          linkUrl: 'url',
        };
      },
    },
  });
  return { wrapper, store };
}

describe('NotificationsRoot', function () {
  it('smoke test', () => {
    const { wrapper } = makeWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  describe('when loaded', function () {
    it('if user is authorized and there is no error, base div for displaying <slot> should be displayed', async () => {
      const { wrapper, store } = makeWrapper();
      store.state.core.loading = false;
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-test="base-page"]').exists()).toBeTruthy();
      expect(wrapper.findComponent({ name: 'AuthMessage' }).exists()).toBeFalsy();
      expect(wrapper.findComponent({ name: 'AppError' }).exists()).toBeFalsy();
    });

    it('if user is not authorized, authorization component in the base page page should be rendered', async () => {
      const { wrapper, store } = makeWrapper();
      store.state.core.loading = false;
      store.state.core.error = { response: { status: 403 } };
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'AuthMessage' }).exists()).toBeTruthy();
      expect(wrapper.findComponent({ name: 'AppError' }).exists()).toBeFalsy();
      expect(wrapper.find('[data-test="main"]').exists()).toBeFalsy();
    });

    it('if there is an error, the error component in the base page should be rendered', async () => {
      const { wrapper, store } = makeWrapper();
      store.state.core.loading = false;
      store.state.core.error = 'some error here';
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'AppError' }).exists()).toBeTruthy();
      expect(wrapper.findComponent({ name: 'AuthMessage' }).exists()).toBeFalsy();
      expect(wrapper.find('[data-test="base-page"]').exists()).toBeFalsy();
    });

    it('notification modal should be rendered if the user is an admin/superuser, a notification exists, and there is a recent notification', async () => {
      const { wrapper, store } = makeWrapper({ isAdmin: true, isSuperuser: true });
      store.state.core.loading = false;
      wrapper.vm.notifications = [
        {
          id: 2,
          title: 'title',
          msg: 'notification',
          linkText: 'linktext',
          linkUrl: 'url',
        },
      ];
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'UpdateNotification' }).exists()).toBeTruthy();
    });

    it('notification modal should not be rendered if notifications do not exist', async () => {
      const { wrapper, store } = makeWrapper();
      store.commit('CORE_SET_SESSION', { kind: [UserKinds.ADMIN] });
      store.state.core.loading = false;
      wrapper.vm.notifications = [];
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'UpdateNotification' }).exists()).toBeFalsy();
    });
  });
});
