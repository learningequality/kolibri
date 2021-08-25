import { mount } from '@vue/test-utils';
import navComponents from 'kolibri.utils.navComponents';
import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
import AppBar from '../../src/views/AppBar';
import logoutSideNavEntry from '../../src/views/LogoutSideNavEntry';
import { coreStoreFactory as makeStore } from '../../src/state/store';
import LearnOnlyDeviceNotice from '../../src/views/LearnOnlyDeviceNotice';
import SyncStatusDisplay from '../../src/views/SyncStatusDisplay';

jest.mock('kolibri.urls');

function createWrapper({ navShown = true, height = 20, title = 'test' } = {}, data) {
  let store = makeStore();

  return mount(AppBar, {
    propsData: {
      navShown,
      height,
      title,
    },
    data() {
      return { ...data };
    },
    store,
  });
}

function setUserKind(store, userKind) {
  let canManageContent = false;
  if (userKind == UserKinds.CAN_MANAGE_CONTENT) {
    userKind = UserKinds.LEARNER;
    canManageContent = true;
  }
  store.commit('CORE_SET_SESSION', {
    id: 'test',
    username: 'test',
    full_name: 'testing test',
    user_id: 'test_id',
    facility_id: 'a real school',
    kind: [userKind],
    can_manage_content: canManageContent,
  });
}

const filterableUserKinds = [
  UserKinds.ANONYMOUS,
  UserKinds.LEARNER,
  UserKinds.COACH,
  UserKinds.ADMIN,
  UserKinds.CAN_MANAGE_CONTENT,
  UserKinds.SUPERUSER,
];

describe('app bar component', () => {
  describe('drop down user menu', () => {
    it('should be hidden if userMenuDropdownIsOpen is false', async () => {
      const wrapper = createWrapper(undefined, { userMenuDropdownIsOpen: false });
      expect(wrapper.findComponent(CoreMenu).element).not.toBeVisible();
    });
    it('should be shown if userMenuDropdownIsOpen is true', async () => {
      const wrapper = createWrapper(undefined, { userMenuDropdownIsOpen: true });
      expect(wrapper.findComponent(CoreMenu).element).toBeTruthy();
    });
    it('should show the language modal link if no components are added and user is not logged in', () => {
      expect(navComponents).toHaveLength(0);
      const wrapper = createWrapper();
      expect(wrapper.findComponent(CoreMenuOption).element).toBeTruthy();
    });
    it('should show logout if no components are added and user is logged in', async () => {
      expect(navComponents).toHaveLength(0);
      const wrapper = createWrapper(undefined, {});
      setUserKind(wrapper.vm.$store, UserKinds.LEARNER);
      await wrapper.vm.$nextTick();
      expect(wrapper.findComponent(logoutSideNavEntry).element).toBeTruthy();
    });

    describe('SoUD sync status and learn-only device indicators', () => {
      describe('on an SoUD', () => {
        let wrapper;
        beforeAll(() => {
          wrapper = createWrapper(undefined, { isSubsetOfUsersDevice: true });
        });
        describe('showing the SyncStatusDisplay', () => {
          it('shows the SyncStatusDisplay to Learners', async () => {
            setUserKind(wrapper.vm.$store, UserKinds.LEARNER);
            await wrapper.vm.$nextTick();
            expect(wrapper.findComponent(SyncStatusDisplay).exists()).toBe(true);
          });

          it.each([UserKinds.COACH, UserKinds.ADMIN, UserKinds.ANONYMOUS])(
            'does not show the SyncStatusDisplay to %s',
            async kind => {
              setUserKind(wrapper.vm.$store, kind);
              await wrapper.vm.$nextTick();
              expect(wrapper.findComponent(SyncStatusDisplay).exists()).toBe(false);
            }
          );
        });

        describe('showing the LearnOnlyDeviceNotice', () => {
          it.each([UserKinds.LEARNER, UserKinds.ANONYMOUS])(
            'hides the notice from %s',
            async kind => {
              setUserKind(wrapper.vm.$store, kind);
              await wrapper.vm.$nextTick();
              expect(wrapper.findComponent(LearnOnlyDeviceNotice).exists()).toBe(false);
            }
          );

          it.each([UserKinds.ADMIN, UserKinds.COACH])('shows the notice to %s', async kind => {
            setUserKind(wrapper.vm.$store, kind);
            await wrapper.vm.$nextTick();
            expect(wrapper.findComponent(LearnOnlyDeviceNotice).exists()).toBe(true);
          });
        });
      });
      describe('not on a SoUD', () => {
        let wrapper;
        beforeEach(() => {
          wrapper = createWrapper(undefined, { isSubsetOfUsersDevice: false });
        });

        it('no indicator is shown', () => {
          expect(wrapper.find('[data-test="syncStatusInDropdown"]').exists()).toBe(false);
        });

        it('no notice is shown', () => {
          expect(wrapper.find('[data-test="learnOnlyNotice"]').exists()).toBe(false);
        });
      });
    });

    describe('only non-account components are added', () => {
      afterEach(() => {
        navComponents.pop();
      });
      it('should show the language modal link if user is not logged in', () => {
        expect(navComponents).toHaveLength(0);
        const component = {
          name: 'testSideNavEntry',
          render() {
            return '';
          },
        };
        navComponents.register(component);
        const wrapper = createWrapper();
        expect(wrapper.findComponent(component).element).toBeFalsy();
      });

      it.each(filterableUserKinds)(
        'if the user is a %s, then the associated SideNav component should show if it is added, and it is in the account section',
        async kind => {
          const component = {
            name: `${kind}SideNavEntry`,
            render() {
              return '';
            },
            role: kind,
            section: NavComponentSections.ACCOUNT,
          };
          navComponents.register(component);
          expect(navComponents).toHaveLength(1);
          const wrapper = createWrapper();
          setUserKind(wrapper.vm.$store, kind);
          await wrapper.vm.$nextTick();
          expect(wrapper.findComponent(component).element).toBeTruthy();
        }
      );
    });
  });
});
