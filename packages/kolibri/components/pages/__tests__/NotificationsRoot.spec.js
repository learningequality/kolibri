import { shallowMount } from '@vue/test-utils';
import { UserKinds } from 'kolibri/constants';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import { error } from 'kolibri/utils/appError';
import NotificationsRoot from '../NotificationsRoot';
import { coreStoreFactory as makeStore } from '../../../store';
import coreModule from '../../../../../kolibri/core/frontend/state/modules/core';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/utils/appError');
jest.mock('../NotificationsRoot/internal/PingbackNotificationResource');
jest.mock('../NotificationsRoot/internal/PingbackNotificationDismissedResource');

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
  return { wrapper };
}

describe('NotificationsRoot', function () {
  beforeEach(() => {
    error.value = null;
  });

  it('smoke test', () => {
    const { wrapper } = makeWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  describe('when loaded', function () {
    it('if user is authorized and there is no error, base div for displaying <slot> should be displayed', async () => {
      const { wrapper } = makeWrapper();

      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="base-page"]').exists()).toBeTruthy();
      expect(wrapper.findComponent({ name: 'AuthMessage' }).exists()).toBeFalsy();
      expect(wrapper.findComponent({ name: 'AppError' }).exists()).toBeFalsy();
    });

    it('if user is not authorized, authorization component in the base page page should be rendered', async () => {
      error.value = { response: { status: 403 } };
      const { wrapper } = makeWrapper();

      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'AuthMessage' }).exists()).toBeTruthy();
      expect(wrapper.findComponent({ name: 'AppError' }).exists()).toBeFalsy();
      expect(wrapper.find('[data-testid="main"]').exists()).toBeFalsy();
    });

    it('if there is an error, the error component in the base page should be rendered', async () => {
      error.value = 'some error here';
      const { wrapper } = makeWrapper();

      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'AppError' }).exists()).toBeTruthy();
      expect(wrapper.findComponent({ name: 'AuthMessage' }).exists()).toBeFalsy();
      expect(wrapper.find('[data-testid="base-page"]').exists()).toBeFalsy();
    });

    it('notification modal should be rendered if the user is an admin/superuser, a notification exists, and there is a recent notification', async () => {
      const { wrapper } = makeWrapper({ isAdmin: true, isSuperuser: true });

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
      const { wrapper } = makeWrapper({ kind: [UserKinds.ADMIN] });

      wrapper.vm.notifications = [];
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'UpdateNotification' }).exists()).toBeFalsy();
    });
  });
});
