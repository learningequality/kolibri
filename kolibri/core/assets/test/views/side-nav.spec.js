import times from 'lodash/times';
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

function createAndRegisterComponent(name, options = {}) {
  const component = {
    name,
    render() {
      return '';
    },
    ...options,
  };
  navComponents.register(component);
  return component;
}

function emptyNavComponents(n = 1) {
  times(n, () => {
    navComponents.pop();
  });
  expect(navComponents).toHaveLength(0);
}

describe('side nav component', () => {
  it('should be hidden if navShown is false', () => {
    const wrapper = createWrapper({ navShown: false });
    expect(wrapper.find('.side-nav').element).not.toBeVisible();
  });
  it('should show nothing if no components are added and user is not logged in', () => {
    expect(navComponents).toHaveLength(0);
    const wrapper = createWrapper();
    expect(wrapper.find('a.ui-menu-option:not(.is-divider)').element).toBeFalsy();
  });
  it('should show logout if no components are added and user is logged in', async () => {
    expect(navComponents).toHaveLength(0);
    const wrapper = createWrapper();
    setUserKind(wrapper.vm.$store, UserKinds.LEARNER);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(logoutSideNavEntry).element).toBeTruthy();
  });

  describe('SideNav components are shown/hidden depending on role', () => {
    afterEach(() => {
      emptyNavComponents(1);
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
        const component = createAndRegisterComponent(`${otherKind}SideNavEntry`, {
          role: otherKind,
        });
        expect(navComponents).toHaveLength(1);
        const wrapper = createWrapper();
        setUserKind(wrapper.vm.$store, kind);
        await wrapper.vm.$nextTick();
        if (shouldShow) {
          expect(wrapper.findComponent(component).element).toBeTruthy();
        } else {
          expect(wrapper.findComponent(component).element).toBeFalsy();
        }
      }
    );
  });

  describe('with multiple components', () => {
    afterEach(() => {
      emptyNavComponents(2);
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
      const component1 = createAndRegisterComponent(`${kind}SideNavEntry`, { role: kind });
      const component2 = createAndRegisterComponent(`${otherKind}SideNavEntry`, {
        role: otherKind,
      });
      expect(navComponents).toHaveLength(2);
      const wrapper = createWrapper();
      setUserKind(wrapper.vm.$store, UserKinds.SUPERUSER);
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.menuOptions[0]).toBe(component1);
      expect(wrapper.vm.menuOptions[1]).toBe(component2);
    });
  });

  describe('and the priority flag', () => {
    afterEach(() => {
      emptyNavComponents(2);
    });

    it('should show higher priority component above lower priority component', () => {
      const component1 = createAndRegisterComponent('1SideNavEntry', { priority: 1 });
      const component2 = createAndRegisterComponent('2SideNavEntry', { priority: 10 });
      expect(navComponents).toHaveLength(2);
      const wrapper = createWrapper();
      expect(wrapper.vm.menuOptions[0]).toBe(component1);
      expect(wrapper.vm.menuOptions[1]).toBe(component2);
    });

    it('should show account section component below lower priority component', () => {
      const component1 = createAndRegisterComponent('1SideNavEntry', {
        priority: 1,
        section: NavComponentSections.ACCOUNT,
      });
      const component2 = createAndRegisterComponent('2SideNavEntry', { priority: 10 });
      expect(navComponents).toHaveLength(2);
      const wrapper = createWrapper();
      expect(wrapper.vm.menuOptions[2]).toBe(component1);
      expect(wrapper.vm.menuOptions[0]).toBe(component2);
    });

    it('should show component with priority above undefined priority component', () => {
      // Component 2 should be registered first
      const component2 = createAndRegisterComponent('2SideNavEntry', { priority: 10 });
      const component1 = createAndRegisterComponent('1SideNavEntry');
      expect(navComponents).toHaveLength(2);
      const wrapper = createWrapper();
      expect(wrapper.vm.menuOptions[1]).toBe(component1);
      expect(wrapper.vm.menuOptions[0]).toBe(component2);
    });
  });
});
