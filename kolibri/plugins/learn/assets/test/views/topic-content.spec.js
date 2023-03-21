import { shallowMount, createLocalVue } from '@vue/test-utils';
import makeStore from '../makeStore';
import TopicsContentPage from '../../src/views/TopicsContentPage';

jest.mock('kolibri.urls');

jest.mock('plugin_data', () => {
  return {
    __esModule: true,
    default: {
      channels: [],
    },
  };
});

const localVue = createLocalVue();

const store = makeStore();
store.state.core = {
  blockDoubleClicks: true,
  logging: {
    summary: {
      progress: 0,
    },
  },
};
store.state.topicsTree = {
  content: {
    coach_content: 0,
  },
};

store.getters = {
  isAdmin() {
    return false;
  },
};

function makeWrapper({ propsData } = {}) {
  return shallowMount(TopicsContentPage, {
    propsData,
    store,
    localVue,
    stubs: {
      LearningActivityBar: {
        name: 'LearningActivityBar',
        propsData: {
          resourceTitle: 'Test Title',
          loading: false,
        },
        template: '<div></div>',
      },
      ContentPage: {
        name: 'ContentPage',
        template: '<div><slot></slot></div>',
      },
    },
  });
}

describe('TopicsContentPage', () => {
  const wrapper = makeWrapper({
    propsData: {
      content: { id: 'test' },
      loading: false,
    },
  });
  it('smoke test', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('shows the Learning Activity Bar', () => {
    expect(wrapper.find('[data-test="learningActivityBar"]').exists()).toBeTruthy();
  });

  it('shows the Content Page', () => {
    expect(wrapper.find('[data-test="contentPage"]').exists()).toBeTruthy();
  });

  describe(`bookmark`, () => {
    describe(`when a user is not logged in`, () => {
      it(`the bookmark button is not displayed`, () => {});
    });

    describe(`when a user is logged in`, () => {
      it(`the bookmark button is displayed when content is not remote`, () => {});
      it(
        `the bookmark button is displayed for remote content that has been downloaded by a learner`
      );
      it(`the bookmark button is displayed for remote content that has been imported by an admin`);
      it(`the bookmark button is not displayed for remote content that hasn't been downloaded by a learner or imported by an admin yet`, () => {});
    });
  });

  describe(`remote download`, () => {
    describe(`when a user is not logged in`, () => {
      it(`the download button is not displayed`, () => {});
    });

    describe(`when a user is logged in`, () => {
      it(`the download button is not displayed when content is not remote`, () => {});
      it(`the download button is not displayed for remote content that has been downloaded by a learner`, () => {});
      it(`the download button is not displayed for remote content that has been imported by an admin`, () => {});
      it(`the download button is displayed for remote content that hasn't been downloaded by a learner or imported by an admin yet`, () => {});
      describe('clicking the download button', () => {
        // TODO
      });
    });
  });
});
