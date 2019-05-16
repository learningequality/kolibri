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

const filterableUserKinds = [
  UserKinds.ANONYMOUS,
  UserKinds.LEARNER,
  UserKinds.COACH,
  UserKinds.ADMIN,
  UserKinds.CAN_MANAGE_CONTENT,
  UserKinds.SUPERUSER,
];

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
  it('should show logout if no components are added and user is logged in', () => {
    expect(navComponents).toHaveLength(0);
    const wrapper = createWrapper();
    setUserKind(wrapper.vm.$store, UserKinds.LEARNER);
    expect(wrapper.contains(logoutSideNavEntry)).toBe(true);
  });
  filterableUserKinds.forEach(kind => {
    afterEach(() => {
      // Clean up the registered component
      navComponents.pop();
    });
    it(`should show ${kind} component if added and user is ${kind}`, () => {
      const component = {
        name: `${kind}SideNavEntry`,
        render() {
          return '';
        },
        role: kind,
      };
      navComponents.register(component);
      expect(navComponents).toHaveLength(1);
      const wrapper = createWrapper();
      setUserKind(wrapper.vm.$store, kind);
      expect(wrapper.contains(component)).toBe(true);
    });
  });
  // These UserKinds have monotonically escalating privileges.
  const escalatingPrivileges = [
    UserKinds.LEARNER,
    UserKinds.COACH,
    UserKinds.ADMIN,
    UserKinds.SUPERUSER,
  ];
  escalatingPrivileges.forEach(kind => {
    // This is slightly duplicative of the tests above, but not harmful.
    escalatingPrivileges.slice(0, escalatingPrivileges.indexOf(kind)).forEach(otherKind => {
      afterEach(() => {
        // Clean up the registered component
        navComponents.pop();
      });
      it(`should show ${otherKind} component if added and user is ${kind}`, () => {
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
        expect(wrapper.contains(component)).toBe(true);
      });
    });
  });
  filterableUserKinds.forEach(kind => {
    filterableUserKinds.slice(filterableUserKinds.indexOf(kind) + 1, -1).forEach(otherKind => {
      afterEach(() => {
        // Clean up the registered component
        navComponents.pop();
      });
      it(`should not show ${otherKind} component if added and user is ${kind}`, () => {
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
        expect(wrapper.contains(component)).toBe(false);
      });
    });
  });
  describe('with multiple components', () => {
    // All user kinds that can be copresented in the side nav.
    const userKinds = [
      UserKinds.LEARNER,
      UserKinds.COACH,
      UserKinds.ADMIN,
      UserKinds.CAN_MANAGE_CONTENT,
      UserKinds.SUPERUSER,
    ];
    userKinds.forEach(kind => {
      userKinds.slice(userKinds.indexOf(kind) + 1, -1).forEach(otherKind => {
        afterEach(() => {
          // Clean up the registered components
          navComponents.pop();
          navComponents.pop();
        });
        it(`should show ${otherKind} component below ${kind} component`, () => {
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
          expect(wrapper.vm.menuOptions[0]).toBe(component1);
          expect(wrapper.vm.menuOptions[1]).toBe(component2);
        });
      });
    });
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
