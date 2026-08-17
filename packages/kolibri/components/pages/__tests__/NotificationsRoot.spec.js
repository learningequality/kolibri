import { shallowMount } from '@vue/test-utils';
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { UserKinds } from 'kolibri/constants';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import { error } from 'kolibri/utils/appError';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import NotificationsRoot from '../NotificationsRoot';
import PingbackNotificationDismissedResource from '../NotificationsRoot/internal/PingbackNotificationDismissedResource';
import PingbackNotificationResource from '../NotificationsRoot/internal/PingbackNotificationResource';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/utils/appError');
jest.mock('../NotificationsRoot/internal/PingbackNotificationResource');
jest.mock('../NotificationsRoot/internal/PingbackNotificationDismissedResource');

function makeWrapper(useUserMockObj = null) {
  if (useUserMockObj) {
    useUser.mockImplementation(() => useUserMock(useUserMockObj));
  }
  const wrapper = shallowMount(NotificationsRoot, {
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

      // For an admin, created() fetches and overwrites `notifications` — let that
      // settle before seeding our own.
      await global.flushPromises();

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

  it('an admin dismissing a fetched notification posts the dismissal and drops it from the list', async () => {
    const NOTIFICATION = {
      id: 'notification-1',
      link_url: 'https://learningequality.org',
      i18n: {
        en: {
          title: 'Upgrade available',
          msg: 'A new version is available',
          link_text: 'Download',
        },
      },
    };
    useUser.mockImplementation(() => useUserMock({ isAdmin: true, currentUserId: 'user-1' }));
    PingbackNotificationResource.list.mockResolvedValue([NOTIFICATION]);

    render(NotificationsRoot);

    expect(await screen.findByText(NOTIFICATION.i18n.en.title)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: coreString('closeAction') }));

    expect(PingbackNotificationDismissedResource.create).toHaveBeenCalledWith({
      user: 'user-1',
      notification: NOTIFICATION.id,
    });
    expect(screen.queryByText(NOTIFICATION.i18n.en.title)).not.toBeInTheDocument();
  });
});
