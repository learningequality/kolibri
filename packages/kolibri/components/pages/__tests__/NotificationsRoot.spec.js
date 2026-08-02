import { shallowMount } from '@vue/test-utils';
import { UserKinds } from 'kolibri/constants';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import { error } from 'kolibri/utils/appError';
import PingbackNotificationResource from '../NotificationsRoot/internal/PingbackNotificationResource';
import PingbackNotificationDismissedResource from '../NotificationsRoot/internal/PingbackNotificationDismissedResource';
import NotificationsRoot from '../NotificationsRoot';
import { coreStoreFactory as makeStore } from '../../../store';
import coreModule from '../../../../../kolibri/core/frontend/state/modules/core';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/utils/appError');
jest.mock('../NotificationsRoot/internal/PingbackNotificationResource', () => ({
  list: jest.fn(),
}));
jest.mock('../NotificationsRoot/internal/PingbackNotificationDismissedResource', () => ({
  create: jest.fn(),
}));

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
    PingbackNotificationResource.list.mockReset();
    PingbackNotificationDismissedResource.create.mockReset();
    PingbackNotificationResource.list.mockResolvedValue([]);
    PingbackNotificationDismissedResource.create.mockResolvedValue({});
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
      PingbackNotificationResource.list.mockResolvedValue([{ id: 2 }]);
      const { wrapper } = makeWrapper({ isAdmin: true, isSuperuser: true });

      await PingbackNotificationResource.list.mock.results[0].value;
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'UpdateNotification' }).exists()).toBeTruthy();
    });

    it('fetches notifications with list for admin users', async () => {
      const { wrapper } = makeWrapper({ isAdmin: true, isSuperuser: true });

      await PingbackNotificationResource.list.mock.results[0].value;
      await wrapper.vm.$nextTick();

      expect(PingbackNotificationResource.list).toHaveBeenCalledTimes(1);
    });

    it('creates a dismissed notification when dismissing the update modal', async () => {
      const { wrapper } = makeWrapper({ isAdmin: true, currentUserId: 'test-user' });
      wrapper.vm.notifications = [{ id: 1 }];

      await wrapper.vm.dismissUpdateModal();

      expect(PingbackNotificationDismissedResource.create).toHaveBeenCalledWith({
        user: 'test-user',
        notification: 1,
      });
      expect(wrapper.vm.notifications).toEqual([]);
    });

    it('notification modal should not be rendered if notifications do not exist', async () => {
      const { wrapper } = makeWrapper({ kind: [UserKinds.ADMIN] });

      wrapper.vm.notifications = [];
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent({ name: 'UpdateNotification' }).exists()).toBeFalsy();
    });
  });
});
