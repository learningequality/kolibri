import { mount } from '@vue/test-utils';
import navComponents from 'kolibri.utils.navComponents';
import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
import AppBar from '../../src/views/AppBar';
import logoutSideNavEntry from '../../src/views/LogoutSideNavEntry';
import { coreStoreFactory as makeStore } from '../../src/state/store';

jest.mock('kolibri.urls');

function createWrapper({ navShown = true, height = 20, title = 'test' } = {}) {
  return mount(AppBar, {
    propsData: {
      navShown,
      height,
      title,
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

describe('app bar component', () => {
  describe('drop down user menu', () => {
    it('should be hidden if userMenuDropdownIsOpen is false', () => {
      const wrapper = createWrapper();
      wrapper.setData({
        userMenuDropdownIsOpen: false,
      });
      expect(wrapper.find(CoreMenu).isVisible()).toBe(false);
    });
    it('should be shown if userMenuDropdownIsOpen is true', () => {
      const wrapper = createWrapper();
      wrapper.setData({
        userMenuDropdownIsOpen: true,
      });
      expect(wrapper.contains(CoreMenu)).toBe(true);
    });
    it('should show the language modal link if no components are added and user is not logged in', () => {
      expect(navComponents).toHaveLength(0);
      const wrapper = createWrapper();
      expect(wrapper.contains(CoreMenuOption)).toBe(true);
    });
    it('should show logout if no components are added and user is logged in', () => {
      expect(navComponents).toHaveLength(0);
      const wrapper = createWrapper();
      setUserKind(wrapper.vm.$store, UserKinds.LEARNER);
      expect(wrapper.contains(logoutSideNavEntry)).toBe(true);
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
        expect(wrapper.contains(component)).toBe(false);
      });
    });
    filterableUserKinds.forEach(kind => {
      afterEach(() => {
        // Clean up the registered component
        navComponents.pop();
      });
      it(`should show ${kind} component if added and user is ${kind}, and it is in the account section`, () => {
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
        expect(wrapper.contains(component)).toBe(true);
      });
    });
  });
});
