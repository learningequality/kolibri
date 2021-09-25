import VueRouter from 'vue-router';
import { mount, createLocalVue } from '@vue/test-utils';
import LearnIndex from '../../src/views/LearnIndex';
import makeStore from '../makeStore';

LearnIndex.methods.getDemographicInfo = function() {};

const localVue = createLocalVue();
localVue.use(VueRouter);

const router = new VueRouter({
  routes: [
    { path: '/home', name: 'HOME' },
    { path: '/library', name: 'LIBRARY' },
    { path: '/classes', name: 'ALL_CLASSES' },
  ],
});

function makeWrapper(options) {
  return mount(LearnIndex, {
    ...options,
    stubs: {
      breadcrumbs: true,
      contentUnavailablePage: true,
      CoreBase: {
        name: 'CoreBase',
        props: ['showSubNav'],
        template: `
          <div>
            <slot></slot>
            <slot name="sub-nav"></slot>
          </div>
        `,
      },
      topicsPage: true,
      TotalPoints: true,
    },
    localVue,
    router,
  });
}

function getElements(wrapper) {
  return {
    // hrefs need to match the routes in the mock router above
    homeLink: () => wrapper.find('[href="#/home"]'),
    classesLink: () => wrapper.find('[href="#/classes"]'),
    libraryLink: () => wrapper.find('[href="#/library"]'),
    tabLinks: () => wrapper.findAllComponents({ name: 'NavbarLink' }),
    CoreBase: () => wrapper.findComponent({ name: 'CoreBase' }),
  };
}

describe('learn plugin index page', () => {
  let store;

  const setSessionUserKind = kind => {
    store.state.core.session.kind = [kind];
    store.state.core.session.user_id = 'test';
  };
  const setMemberships = memberships => {
    store.state.memberships = memberships;
  };
  const setPageName = pageName => {
    store.state.pageName = pageName;
  };
  const setCanAccessUnassignedContent = canAccess => {
    store.state.canAccessUnassignedContentSetting = canAccess;
  };

  beforeEach(() => {
    store = makeStore();
  });

  it('there are no tabs if showing content unavailable page', () => {
    setPageName('CONTENT_UNAVAILABLE');
    const wrapper = makeWrapper({ store });
    const { CoreBase } = getElements(wrapper);
    expect(CoreBase().props().showSubNav).toEqual(false);
  });

  describe('when allowed to access unassigned content', () => {
    beforeEach(() => {
      setCanAccessUnassignedContent(true);
    });

    it('the home and channels links are always available to everybody', () => {
      setSessionUserKind('anonymous');
      setMemberships([]);
      const wrapper = makeWrapper({ store });
      const { tabLinks, homeLink, libraryLink } = getElements(wrapper);
      expect(tabLinks().length).toEqual(2);
      expect(homeLink().element.tagName).toBe('A');
      expect(libraryLink().element.tagName).toBe('A');
    });

    it('the classes tab is available if user is logged in and has memberships', () => {
      // should work for any user 'kind' except for 'anonymous'
      setSessionUserKind('learner');
      setMemberships([{ id: 'membership_1' }]);
      const wrapper = makeWrapper({ store });
      const { classesLink, tabLinks } = getElements(wrapper);
      expect(tabLinks().length).toEqual(4);
      expect(classesLink().element.tagName).toBe('A');
    });

    it('the classes tab and bookmarks tabs are not available if user is not logged in', () => {
      // in current implementation, anonymous user implies empty memberships
      setSessionUserKind('anonymous');
      setMemberships([]);
      const wrapper = makeWrapper({ store });
      const { classesLink, tabLinks } = getElements(wrapper);
      expect(tabLinks().length).toEqual(2);
      expect(!classesLink().exists()).toEqual(true);
    });

    it('the classes tab is not available if user has no memberships/classes', () => {
      setSessionUserKind('learner');
      setMemberships([]);
      const wrapper = makeWrapper({ store });
      const { classesLink, tabLinks } = getElements(wrapper);
      expect(tabLinks().length).toEqual(3);
      expect(!classesLink().exists()).toEqual(true);
    });
  });

  describe('when not allowed to access unassigned content', () => {
    beforeEach(() => {
      setCanAccessUnassignedContent(false);
    });

    it('only the home tab is available when not signed-in', () => {
      setSessionUserKind('anonymous');
      setMemberships([]);
      const wrapper = makeWrapper({ store });
      const { tabLinks, homeLink } = getElements(wrapper);
      expect(tabLinks().length).toEqual(1);
      expect(homeLink().element.tagName).toBe('A');
    });

    it('the home and classes tab is available if signed in', () => {
      // should work for any user 'kind' except for 'anonymous'
      setSessionUserKind('learner');
      setMemberships([{ id: 'membership_1' }]);
      const wrapper = makeWrapper({ store });
      const { tabLinks, homeLink, classesLink } = getElements(wrapper);
      expect(tabLinks().length).toEqual(2);
      expect(homeLink().element.tagName).toBe('A');
      expect(classesLink().element.tagName).toBe('A');
    });
  });
});
