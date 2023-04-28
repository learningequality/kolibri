import times from 'lodash/times';
import { mount } from '@vue/test-utils';
import navComponents from 'kolibri.utils.navComponents';
import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import SideNav from '../../src/views/SideNav';
import logoutSideNavEntry from '../../src/views/LogoutSideNavEntry';
import LearnOnlyDeviceNotice from '../../src/views/LearnOnlyDeviceNotice';
import SyncStatusDisplay from '../../src/views/SyncStatusDisplay';
import { stubWindowLocation } from 'testUtils'; // eslint-disable-line

import { coreStoreFactory as makeStore } from '../../src/state/store';

jest.mock('kolibri.urls');

function createWrapper({ navShown = true, headerHeight = 20, width = 100 } = {}, data = {}) {
  return mount(SideNav, {
    propsData: {
      navShown,
      headerHeight,
      width,
    },
    data() {
      return { ...data };
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

const url = '/test/url';
const label = 'label1';
const label2 = 'label2';
const icon = 'library';
const role = UserKinds.LEARNER;

function createAndRegisterComponent(name, url, label, icon, role, priority, section) {
  const config = {
    name: name,
    url: url,
    label: label,
    icon: icon,
    role: role,
    priority: priority,
    section: section,
    bottomBar: true,
  };
  navComponents.register(config);
  return config;
}

function emptyNavComponents(n = 1) {
  times(n, () => {
    navComponents.pop();
  });
  expect(navComponents).toHaveLength(0);
}

describe('side nav component', () => {
  stubWindowLocation(beforeAll, afterAll);

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
        createAndRegisterComponent(`${otherKind}SideNavEntry`, url, label, icon, otherKind);
        expect(navComponents).toHaveLength(1);
        const wrapper = createWrapper();
        setUserKind(wrapper.vm.$store, kind);
        await wrapper.vm.$nextTick();
        if (shouldShow) {
          expect(wrapper.text()).toContain(label);
        } else {
          expect(wrapper.text()).not.toContain(label);
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
      createAndRegisterComponent(`${kind}SideNavEntry`, url, label, icon, kind, 10);
      createAndRegisterComponent(`${otherKind}SideNavEntry`, url, label2, icon, otherKind, 10);
      expect(navComponents).toHaveLength(2);
      const wrapper = createWrapper();
      setUserKind(wrapper.vm.$store, UserKinds.SUPERUSER);
      await wrapper.vm.$nextTick();
      const sideNavComponents = wrapper.findAll("[data-test='side-nav-component']");
      expect(sideNavComponents.exists()).toBeTruthy();
      expect(sideNavComponents.at(0).html()).toContain(label);
      expect(sideNavComponents.at(1).html()).toContain(label2);
    });
  });

  describe('and the priority flag', () => {
    afterEach(() => {
      emptyNavComponents(2);
    });

    it('should show higher priority component above lower priority component', () => {
      createAndRegisterComponent('1SideNavEntry', url, label, icon, role, 1);
      createAndRegisterComponent('2SideNavEntry', url, label2, icon, role, 10);
      expect(navComponents).toHaveLength(2);
      const wrapper = createWrapper();
      const sideNavComponents = wrapper.findAll("[data-test='side-nav-component']");
      expect(sideNavComponents.exists()).toBeTruthy();
      expect(sideNavComponents.at(0).html()).toContain(label);
      expect(sideNavComponents.at(1).html()).toContain(label2);
    });

    it('should show account section component below lower priority component', () => {
      createAndRegisterComponent('1SideNavEntry', url, label, icon, role, 1);
      createAndRegisterComponent(
        '2SideNavEntry',
        url,
        label2,
        icon,
        role,
        10,
        NavComponentSections.ACCOUNT
      );
      expect(navComponents).toHaveLength(2);
      const wrapper = createWrapper();
      const sideNavComponents = wrapper.findAll("[data-test='side-nav-component']");
      expect(sideNavComponents.exists()).toBeTruthy();
      expect(sideNavComponents.at(1).html()).toContain(label2);
      expect(sideNavComponents.at(0).html()).toContain(label);
    });

    it('should show component with priority above undefined priority component', () => {
      // Component 2 should be registered first
      createAndRegisterComponent('2SideNavEntry', url, label2, icon, role, 10);
      createAndRegisterComponent('1SideNavEntry', url, label, icon, role, undefined);
      expect(navComponents).toHaveLength(2);
      const wrapper = createWrapper();
      const sideNavComponents = wrapper.findAll("[data-test='side-nav-component']");
      expect(sideNavComponents.exists()).toBeTruthy();
      expect(sideNavComponents.at(0).html()).toContain(label2);
      expect(sideNavComponents.at(1).html()).toContain(label);
    });
  });

  describe('when on an SoUD or NOT', () => {
    describe('on an SoUD with learn-only device indicators', () => {
      let wrapper;
      beforeAll(() => {
        wrapper = createWrapper(undefined, { isLearnerOnlyImport: true });
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
      /* Note that Facilty & Coach plugins are hackily disabled in their kolibri_plugin
       * definitions - hence no tests to ensure they're hidden here when on SoUD */
      it('shows the Learn-only notice to non-Learners', async () => {
        const wrapper = createWrapper(undefined, { isLearnerOnlyImport: true });
        setUserKind(wrapper.vm.$store, UserKinds.COACH);
        await wrapper.vm.$nextTick();
        expect(wrapper.findComponent(LearnOnlyDeviceNotice).exists()).toBe(true);
        setUserKind(wrapper.vm.$store, UserKinds.ADMIN);
        await wrapper.vm.$nextTick();
        expect(wrapper.findComponent(LearnOnlyDeviceNotice).exists()).toBe(true);
      });

      it('does not show learn-only notice to Learners or Guests', async () => {
        const wrapper = createWrapper(undefined, { isLearnerOnlyImport: true });
        setUserKind(wrapper.vm.$store, UserKinds.LEARNER);
        await wrapper.vm.$nextTick();
        expect(wrapper.findComponent(LearnOnlyDeviceNotice).exists()).toBe(false);
        setUserKind(wrapper.vm.$store, UserKinds.ANONYMOUS);
        await wrapper.vm.$nextTick();
        expect(wrapper.findComponent(LearnOnlyDeviceNotice).exists()).toBe(false);
      });
    });
    describe('NOT on a SoUD', () => {
      let wrapper;
      beforeEach(async () => {
        wrapper = createWrapper(undefined, { isLearnerOnlyImport: false });
      });

      it('shows no notice', () => {
        expect(wrapper.findComponent(LearnOnlyDeviceNotice).exists()).toBe(false);
      });
    });
  });
});
