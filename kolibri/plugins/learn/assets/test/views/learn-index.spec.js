import VueRouter from 'vue-router';
import { mount, createLocalVue } from '@vue/test-utils';
import LearnIndex from '../../src/views/LearnIndex';
import makeStore from '../makeStore';
// eslint-disable-next-line import/named
import useCoreLearn, { useCoreLearnMock } from '../../src/composables/useCoreLearn';

jest.mock('../../src/composables/useCoreLearn');

jest.mock('plugin_data', () => {
  return {
    __esModule: true,
    default: {
      accessibilityLabels: [],
      categories: [],
      gradeLevels: [],
      languages: [],
      channels: [],
      learnerNeeds: [],
    },
  };
});

const localVue = createLocalVue();
localVue.use(VueRouter);

const router = new VueRouter({
  routes: [
    { path: '/home', name: 'HOME' },
    { path: '/library', name: 'LIBRARY' },
    { path: '/bookmarks', name: 'BOOKMARKS' },
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
    bookmarksLink: () => wrapper.find('[href="#/bookmarks"]'),
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
    useCoreLearn.mockImplementation(() =>
      useCoreLearnMock({ inClasses: Boolean(memberships.length) })
    );
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
      const { tabLinks, libraryLink } = getElements(wrapper);
      expect(tabLinks().length).toEqual(1);
      expect(libraryLink().element.tagName).toBe('A');
    });

    it('the bookmarks tabs are not available if user is not logged in', () => {
      setSessionUserKind('anonymous');
      setMemberships([]);
      const wrapper = makeWrapper({ store });
      const { bookmarksLink, tabLinks } = getElements(wrapper);
      expect(tabLinks().length).toEqual(1);
      expect(!bookmarksLink().exists()).toEqual(true);
    });
  });

  describe('when not allowed to access unassigned content', () => {
    beforeEach(() => {
      setCanAccessUnassignedContent(false);
    });

    it('no tab is available when not signed-in', () => {
      setSessionUserKind('anonymous');
      setMemberships([]);
      const wrapper = makeWrapper({ store });
      const { tabLinks } = getElements(wrapper);
      expect(tabLinks().length).toEqual(0);
    });

    it('the home tab is available if signed in', () => {
      // should work for any user 'kind' except for 'anonymous'
      setSessionUserKind('learner');
      setMemberships([{ id: 'membership_1' }]);
      const wrapper = makeWrapper({ store });
      const { tabLinks, homeLink } = getElements(wrapper);
      expect(tabLinks().length).toEqual(1);
      expect(homeLink().element.tagName).toBe('A');
    });
  });
});
