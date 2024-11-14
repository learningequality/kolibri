import { mount } from '@vue/test-utils';
import { UserKinds } from 'kolibri/constants';
import useNav, { useNavMock } from 'kolibri/composables/useNav'; // eslint-disable-line
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import SideNav from '../SideNav';
// eslint-disable-next-line import/named
// eslint-disable-next-line import/named
import LearnOnlyDeviceNotice from '../LearnOnlyDeviceNotice';
import SyncStatusDisplay from '../../../../SyncStatusDisplay';
import { stubWindowLocation } from 'testUtils'; // eslint-disable-line

jest.mock('kolibri/urls');
jest.mock('kolibri/composables/useNav');
jest.mock('kolibri/composables/useUser');

function createWrapper({ navShown = true, headerHeight = 20, width = 100 } = {}) {
  return mount(SideNav, {
    propsData: {
      navShown,
      headerHeight,
      width,
    },
    stubs: ['SyncStatusDisplay', 'TotalPoints'],
  });
}

function setUserKind(userKind, isLearnerOnlyImport = false) {
  const mockOverrides = { isLearnerOnlyImport, isUserLoggedIn: true, isLearner: false };
  if (userKind == UserKinds.CAN_MANAGE_CONTENT) {
    mockOverrides.canManageContent = true;
    mockOverrides.isLearner = true;
  } else if (userKind == UserKinds.COACH) {
    mockOverrides.isCoach = true;
  } else if (userKind == UserKinds.ADMIN) {
    mockOverrides.isAdmin = true;
  } else if (userKind == UserKinds.LEARNER) {
    mockOverrides.isLearner = true;
  } else if (userKind == UserKinds.SUPERUSER) {
    mockOverrides.isSuperuser = true;
  } else if (userKind == UserKinds.ANONYMOUS) {
    mockOverrides.isUserLoggedIn = false;
  }
  useUser.mockImplementation(() => useUserMock(mockOverrides));
}

const url = '/test/url';
const label = 'label1';
const label2 = 'label2';
const icon = 'library';

describe('side nav component', () => {
  stubWindowLocation(beforeAll, afterAll);
  beforeEach(() => {
    useNav.mockImplementation(() => useNavMock());
    useUser.mockImplementation(() => useUserMock());
  });

  it('should be hidden if navShown is false', () => {
    const wrapper = createWrapper({ navShown: false });
    expect(wrapper.find('.side-nav').element).not.toBeVisible();
  });
  it('should show nothing if no items are added and user is not logged in', () => {
    const wrapper = createWrapper();
    expect(wrapper.find('a.ui-menu-option:not(.is-divider)').element).toBeFalsy();
  });
  it('should show logout if no items are added and user is logged in', async () => {
    setUserKind(UserKinds.LEARNER);
    const wrapper = createWrapper();
    expect(wrapper.text()).toContain('Sign out');
  });

  describe('SideNav items are shown/hidden depending on role', () => {
    const testCases = [
      [UserKinds.ADMIN, UserKinds.ADMIN, true],
      [UserKinds.ADMIN, UserKinds.CAN_MANAGE_CONTENT, false],
      [UserKinds.ADMIN, UserKinds.COACH, true],
      [UserKinds.ADMIN, UserKinds.LEARNER, true],
      [UserKinds.ANONYMOUS, UserKinds.ADMIN, false],
      [UserKinds.ANONYMOUS, UserKinds.ANONYMOUS, true],
      [UserKinds.ANONYMOUS, UserKinds.CAN_MANAGE_CONTENT, false],
      [UserKinds.ANONYMOUS, UserKinds.COACH, false],
      [UserKinds.ANONYMOUS, UserKinds.LEARNER, false],
      [UserKinds.CAN_MANAGE_CONTENT, UserKinds.CAN_MANAGE_CONTENT, true],
      [UserKinds.COACH, UserKinds.ADMIN, false],
      [UserKinds.COACH, UserKinds.CAN_MANAGE_CONTENT, false],
      [UserKinds.COACH, UserKinds.COACH, true],
      [UserKinds.COACH, UserKinds.LEARNER, true],
      [UserKinds.LEARNER, UserKinds.ADMIN, false],
      [UserKinds.LEARNER, UserKinds.CAN_MANAGE_CONTENT, false],
      [UserKinds.LEARNER, UserKinds.COACH, false],
      [UserKinds.LEARNER, UserKinds.LEARNER, true],
      [UserKinds.SUPERUSER, UserKinds.ADMIN, true],
      [UserKinds.SUPERUSER, UserKinds.COACH, true],
      [UserKinds.SUPERUSER, UserKinds.LEARNER, true],
      [UserKinds.SUPERUSER, UserKinds.SUPERUSER, true],
    ];

    it.each(testCases)(
      'if user is %s, then %s item should show (%s)',
      async (kind, otherKind, shouldShow) => {
        useNav.mockImplementation(() =>
          useNavMock({
            navItems: [
              {
                url: url,
                label: label,
                icon: icon,
                role: otherKind,
              },
            ],
          }),
        );
        setUserKind(kind);
        const wrapper = createWrapper();
        if (shouldShow) {
          expect(wrapper.text()).toContain(label);
        } else {
          expect(wrapper.text()).not.toContain(label);
        }
      },
    );
  });

  describe('with multiple items', () => {
    // All user kinds that can be copresented in the side nav.
    const testCases = [
      [UserKinds.LEARNER, UserKinds.COACH],
      [UserKinds.LEARNER, UserKinds.ADMIN],
      [UserKinds.LEARNER, UserKinds.CAN_MANAGE_CONTENT],
      [UserKinds.COACH, UserKinds.ADMIN],
      [UserKinds.COACH, UserKinds.CAN_MANAGE_CONTENT],
      [UserKinds.ADMIN, UserKinds.CAN_MANAGE_CONTENT],
    ];
    it.each(testCases)('%s item should above %s item', async (kind, otherKind) => {
      useNav.mockImplementation(() =>
        useNavMock({
          navItems: [
            {
              url: url,
              label: label,
              icon: icon,
              role: kind,
            },
            {
              url: url,
              label: label2,
              icon: icon,
              role: otherKind,
            },
          ],
        }),
      );
      setUserKind(UserKinds.SUPERUSER);
      const wrapper = createWrapper();
      const sideNavComponents = wrapper.findAll("[data-test='side-nav-item']");
      expect(sideNavComponents.exists()).toBeTruthy();
      expect(sideNavComponents.at(0).html()).toContain(label);
      expect(sideNavComponents.at(1).html()).toContain(label2);
    });
  });

  describe('when on an SoUD or NOT', () => {
    describe('on an SoUD with learn-only device indicators', () => {
      describe('showing the SyncStatusDisplay', () => {
        it.each([UserKinds.COACH, UserKinds.ADMIN, UserKinds.LEARNER])(
          'does show the SyncStatusDisplay to %s',
          async kind => {
            setUserKind(kind, true);
            const wrapper = createWrapper();
            expect(wrapper.findComponent(SyncStatusDisplay).exists()).toBe(true);
          },
        );
        it('does not show the SyncStatusDisplay to guest users', async () => {
          setUserKind(UserKinds.ANONYMOUS);
          const wrapper = createWrapper();
          expect(wrapper.findComponent(SyncStatusDisplay).exists()).toBe(false);
        });
      });
      /* Note that Facilty & Coach plugins are hackily disabled in their kolibri_plugin
       * definitions - hence no tests to ensure they're hidden here when on SoUD */
      it('shows the Learn-only notice to coaches', async () => {
        setUserKind(UserKinds.COACH, true);
        const wrapper = createWrapper();
        expect(wrapper.findComponent(LearnOnlyDeviceNotice).exists()).toBe(true);
      });
      it('shows the Learn-only notice to admins', async () => {
        setUserKind(UserKinds.ADMIN, true);
        const wrapper = createWrapper();
        expect(wrapper.findComponent(LearnOnlyDeviceNotice).exists()).toBe(true);
      });

      it('does not show learn-only notice to Learners', async () => {
        setUserKind(UserKinds.LEARNER, true);
        const wrapper = createWrapper();
        expect(wrapper.findComponent(LearnOnlyDeviceNotice).exists()).toBe(false);
      });
      it('does not show learn-only notice to Guests', async () => {
        setUserKind(UserKinds.ANONYMOUS, true);
        const wrapper = createWrapper();
        expect(wrapper.findComponent(LearnOnlyDeviceNotice).exists()).toBe(false);
      });
    });
    describe('NOT on a SoUD', () => {
      let wrapper;
      beforeEach(async () => {
        wrapper = createWrapper(undefined, { isLearnerOnlyImport: false });
      });
      it('does not show the SyncStatusDisplay', async () => {
        expect(wrapper.findComponent(SyncStatusDisplay).exists()).toBe(false);
      });
      it('shows no notice', () => {
        expect(wrapper.findComponent(LearnOnlyDeviceNotice).exists()).toBe(false);
      });
    });
  });
});
