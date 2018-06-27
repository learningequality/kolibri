import { mount } from '@vue/test-utils';
import navComponents from 'kolibri.utils.navComponents';
import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import appBar from '../../src/views/app-bar';
import coreStore from 'kolibri.coreVue.vuex.store';
import coreMenu from 'kolibri.coreVue.components.coreMenu';
import coreMenuOption from 'kolibri.coreVue.components.coreMenuOption';
import logoutSideNavEntry from '../../src/views/logout-side-nav-entry';
jest.mock('kolibri.urls');

function createWrapper({ navShown = true, height = 20, title = 'test' } = {}) {
  return mount(appBar, {
    propsData: {
      navShown,
      height,
      title,
    },
    store: coreStore.factory(),
  });
}

function setUserKind(userKind) {
  let canManageContent = false;
  if (userKind == UserKinds.CAN_MANAGE_CONTENT) {
    userKind = UserKinds.LEARNER;
    canManageContent = true;
  }
  corestore.commit('CORE_SET_SESSION', {
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
      expect(wrapper.find(coreMenu).isVisible()).toBe(false);
    });
    it('should be shown if userMenuDropdownIsOpen is true', () => {
      const wrapper = createWrapper();
      wrapper.setData({
        userMenuDropdownIsOpen: true,
      });
      expect(wrapper.contains(coreMenu)).toBe(true);
    });
    it('should show the language modal link if no components are added and user is not logged in', () => {
      expect(navComponents).toHaveLength(0);
      const wrapper = createWrapper();
      expect(wrapper.html()).toMatchSnapshot();
      expect(wrapper.contains(coreMenuOption)).toBe(true);
    });
    it('should show logout if no components are added and user is logged in', () => {
      expect(navComponents).toHaveLength(0);
      const wrapper = createWrapper();
      setUserKind(UserKinds.LEARNER);
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
        setUserKind(kind);
        expect(wrapper.contains(component)).toBe(true);
      });
    });
  });
});
