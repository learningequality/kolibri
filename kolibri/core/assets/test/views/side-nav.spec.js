import { mount } from '@vue/test-utils';
import navComponents from 'kolibri.utils.navComponents';
import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import SideNav from '../../src/views/SideNav';
import logoutSideNavEntry from '../../src/views/LogoutSideNavEntry';
import { coreStoreFactory as makeStore } from '../../src/state/store';

jest.mock('kolibri.urls');

function createWrapper({ navShown = true, headerHeight = 20, width = 100 } = {}) {
  return mount(SideNav, {
    propsData: {
      navShown,
      headerHeight,
      width,
    },
    store: makeStore(),
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

describe('side nav component', () => {
  it('should be hidden if navShown is false', () => {
    const wrapper = createWrapper({ navShown: false });
    expect(wrapper.find('.side-nav').isVisible()).toBe(false);
  });
  it('should show nothing if no components are added and user is not logged in', () => {
    expect(navComponents).toHaveLength(0);
    const wrapper = createWrapper();
    expect(wrapper.contains('a.ui-menu-option:not(.is-divider)')).toBe(false);
  });
  it('should show logout if no components are added and user is logged in', async () => {
    expect(navComponents).toHaveLength(0);
    const wrapper = createWrapper();
    setUserKind(wrapper.vm.$store, UserKinds.LEARNER);
    await wrapper.vm.$nextTick();
    expect(wrapper.contains(logoutSideNavEntry)).toBe(true);
  });

  describe('SideNav components are shown/hidden depending on role', () => {
    afterEach(() => {
      // Clean up the registered component
      navComponents.pop();
    });
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
      'if user is %s, then %s component should show (%s)',
      async (kind, otherKind, shouldShow) => {
        const component = {
          name: `${otherKind}SideNavEntry`,
          render() {
            return '';
          },
          role: otherKind,
        };
        navComponents.register(component);
        expect(navComponents).toHaveLength(1);
        const wrapper = createWrapper();
        setUserKind(wrapper.vm.$store, kind);
        await wrapper.vm.$nextTick();
        expect(wrapper.contains(component)).toBe(shouldShow);
      }
    );
  });

  describe('with multiple components', () => {
    afterEach(() => {
      // Clean up the registered components
      navComponents.pop();
      navComponents.pop();
    });
    // All user kinds that can be copresented in the side nav.
    const testCases = [
      [UserKinds.LEARNER, UserKinds.COACH],
      [UserKinds.LEARNER, UserKinds.ADMIN],
      [UserKinds.LEARNER, UserKinds.CAN_MANAGE_CONTENT],
      [UserKinds.COACH, UserKinds.ADMIN],
      [UserKinds.COACH, UserKinds.CAN_MANAGE_CONTENT],
      [UserKinds.ADMIN, UserKinds.CAN_MANAGE_CONTENT],
    ];
    it.each(testCases)('%s component should above %s component', async (kind, otherKind) => {
      const component1 = {
        name: `${kind}SideNavEntry`,
        render() {
          return '';
        },
        role: kind,
      };
      const component2 = {
        name: `${otherKind}SideNavEntry`,
        render() {
          return '';
        },
        role: otherKind,
      };
      navComponents.register(component2);
      navComponents.register(component1);
      expect(navComponents).toHaveLength(2);
      const wrapper = createWrapper();
      setUserKind(wrapper.vm.$store, UserKinds.SUPERUSER);
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.menuOptions[0]).toBe(component1);
      expect(wrapper.vm.menuOptions[1]).toBe(component2);
    })
  });
  describe('and the priority flag', () => {
    afterEach(() => {
      // Clean up the registered components
      navComponents.pop();
      navComponents.pop();
    });
    it('should show higher priority component above lower priority component', () => {
      const component1 = {
        name: '1SideNavEntry',
        render() {
          return '';
        },
        priority: 1,
      };
      const component2 = {
        name: '2SideNavEntry',
        render() {
          return '';
        },
        priority: 10,
      };
      navComponents.register(component2);
      navComponents.register(component1);
      expect(navComponents).toHaveLength(2);
      const wrapper = createWrapper();
      expect(wrapper.vm.menuOptions[0]).toBe(component1);
      expect(wrapper.vm.menuOptions[1]).toBe(component2);
    });
    it('should show account section component below lower priority component', () => {
      const component1 = {
        name: '1SideNavEntry',
        render() {
          return '';
        },
        priority: 1,
        section: NavComponentSections.ACCOUNT,
      };
      const component2 = {
        name: '2SideNavEntry',
        render() {
          return '';
        },
        priority: 10,
      };
      navComponents.register(component2);
      navComponents.register(component1);
      expect(navComponents).toHaveLength(2);
      const wrapper = createWrapper();
      expect(wrapper.vm.menuOptions[2]).toBe(component1);
      expect(wrapper.vm.menuOptions[0]).toBe(component2);
    });
    it('should show component with priority above undefined priority component', () => {
      const component1 = {
        name: '1SideNavEntry',
        render() {
          return '';
        },
      };
      const component2 = {
        name: '2SideNavEntry',
        render() {
          return '';
        },
        priority: 10,
      };
      navComponents.register(component2);
      navComponents.register(component1);
      expect(navComponents).toHaveLength(2);
      const wrapper = createWrapper();
      expect(wrapper.vm.menuOptions[1]).toBe(component1);
      expect(wrapper.vm.menuOptions[0]).toBe(component2);
    });
  });
});
