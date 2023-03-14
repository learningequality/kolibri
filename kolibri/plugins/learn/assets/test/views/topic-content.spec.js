import { shallowMount, createLocalVue } from '@vue/test-utils';
import makeStore from '../makeStore';
import TopicsContentPage from '../../src/views/TopicsContentPage';
/* eslint-disable import/named */
import useDownloadRequests, {
  useDownloadRequestsMock,
} from '../../src/composables/useDownloadRequests';
/* eslint-enable import/named */

jest.mock('kolibri.urls');
jest.mock('../../src/composables/useDownloadRequests');

jest.mock('plugin_data', () => {
  return {
    __esModule: true,
    default: {
      channels: [],
    },
  };
});

const CONTENT_ID = 'content-id';

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
    id: CONTENT_ID,
    coach_content: 0,
    admin_imported: false,
  },
};

store.getters = {
  isAdmin() {
    return false;
  },
};

function makeWrapper({ propsData, isUserLoggedIn = false, isContentAdminImported = false } = {}) {
  store.getters = {
    isUserLoggedIn,
  };
  store.state.topicsTree.content.admin_imported = isContentAdminImported;

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
  afterEach(() => {
    // reset back to defaults
    useDownloadRequests.mockImplementation(() => useDownloadRequestsMock());
  });

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
      it(`instructs 'LearningActivityBar' to not show the bookmark button`, () => {
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
          },
          isUserLoggedIn: false,
        });

        expect(
          wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showbookmark')
        ).toBeFalsy();
      });
    });

    describe(`when a user is logged in`, () => {
      it(`instructs 'LearningActivityBar' to show the bookmark button when content is not remote`, async () => {
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
            deviceId: null, // null device ID means that the content is not remote
          },
          isUserLoggedIn: true,
        });

        expect(
          wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showbookmark')
        ).toBeTruthy();
      });

      it(`instructs 'LearningActivityBar' to show the bookmark button for remote content that has been downloaded by a learner`, () => {
        useDownloadRequests.mockImplementation(() =>
          useDownloadRequestsMock({
            isDownloadedByLearner: () => true,
          })
        );
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
            deviceId: 'remote-device-id', // non-null device ID means that the content is not remote
          },
          isUserLoggedIn: true,
        });

        expect(
          wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showbookmark')
        ).toBeTruthy();
      });

      it(`instructs 'LearningActivityBar' to show the bookmark button for remote content that has been imported by an admin`, () => {
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
            deviceId: 'remote-device-id', // non-null device ID means that the content is not remote
          },
          isUserLoggedIn: true,
          isContentAdminImported: true,
        });

        expect(
          wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showbookmark')
        ).toBeTruthy();
      });

      it(`instructs 'LearningActivityBar' to not show the bookmark button for remote content that hasn't been downloaded by a learner or imported by an admin yet`, () => {
        useDownloadRequests.mockImplementation(() =>
          useDownloadRequestsMock({
            isDownloadedByLearner: () => false,
            isDownloadingByLearner: () => false,
          })
        );
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
            deviceId: 'remote-device-id', // non-null device ID means that the content is not remote
          },
          isUserLoggedIn: true,
          isContentAdminImported: false,
        });

        expect(
          wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showbookmark')
        ).toBeFalsy();
      });

      it(`instructs 'LearningActivityBar' to not show the bookmark button for remote content that is being downloaded by a learner`, () => {
        useDownloadRequests.mockImplementation(() =>
          useDownloadRequestsMock({
            isDownloadedByLearner: () => false,
            isDownloadingByLearner: () => false,
          })
        );
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
            deviceId: 'remote-device-id', // non-null device ID means that the content is not remote
          },
          isUserLoggedIn: true,
          isContentAdminImported: false,
        });

        expect(
          wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showbookmark')
        ).toBeFalsy();
      });
    });
  });

  describe(`remote download`, () => {
    describe(`when a user is not logged in`, () => {
      it(`instructs 'LearningActivityBar' to not show the download button`, () => {
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
          },
          isUserLoggedIn: false,
        });

        expect(
          wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showdownloadbutton')
        ).toBeFalsy();
      });
    });

    describe(`when a user is logged in`, () => {
      it(`instructs 'LearningActivityBar' to not show the download button when content is not remote`, () => {
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
            deviceId: null, // null device ID means that the content is not remote
          },
          isUserLoggedIn: true,
        });

        expect(
          wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showdownloadbutton')
        ).toBeFalsy();
      });

      it(`instructs 'LearningActivityBar' to not show the download button for remote content that has been imported by an admin`, () => {
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
            deviceId: 'remote-device-id', // non-null device ID means that the content is not remote
          },
          isUserLoggedIn: true,
          isContentAdminImported: true,
        });

        expect(
          wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showdownloadbutton')
        ).toBeFalsy();
      });

      it(`instructs 'LearningActivityBar' to not show the download button for remote content that has been downloaded by a learner already`, () => {
        useDownloadRequests.mockImplementation(() =>
          useDownloadRequestsMock({
            isDownloadedByLearner: () => true,
            isDownloadingByLearner: () => false,
          })
        );
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
            deviceId: 'remote-device-id', // non-null device ID means that the content is not remote
          },
          isUserLoggedIn: true,
          isContentAdminImported: false,
        });

        expect(
          wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showdownloadbutton')
        ).toBeFalsy();
      });

      it(`instructs 'LearningActivityBar' to not show the download button for remote content that is being downloaded by a learner`, () => {
        useDownloadRequests.mockImplementation(() =>
          useDownloadRequestsMock({
            isDownloadedByLearner: () => false,
            isDownloadingByLearner: () => true,
          })
        );
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
            deviceId: 'remote-device-id', // non-null device ID means that the content is not remote
          },
          isUserLoggedIn: true,
          isContentAdminImported: false,
        });

        expect(
          wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showdownloadbutton')
        ).toBeFalsy();
      });

      it(`instructs 'LearningActivityBar' to show the download button for remote content that hasn't been downloaded by a learner or imported by an admin yet`, () => {
        useDownloadRequests.mockImplementation(() =>
          useDownloadRequestsMock({
            isDownloadedByLearner: () => false,
            isDownloadingByLearner: () => false,
          })
        );
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
            deviceId: 'remote-device-id', // non-null device ID means that the content is not remote
          },
          isUserLoggedIn: true,
          isContentAdminImported: false,
        });

        expect(
          wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showdownloadbutton')
        ).toBeTruthy();
      });

      it(`clicking the download button calls 'addDownloadRequest' with content in the payload`, () => {
        const addDownloadRequest = jest.fn();
        useDownloadRequests.mockImplementation(() =>
          useDownloadRequestsMock({
            downloadRequestMap: { downloads: {} },
            addDownloadRequest,
          })
        );
        const wrapper = makeWrapper({
          propsData: {
            loading: false,
            deviceId: 'remote-device-id', // non-null device ID means that the content is not remote
          },
          isUserLoggedIn: true,
          isContentAdminImported: false,
        });
        wrapper.findComponent({ name: 'LearningActivityBar' }).vm.$emit('download');
        expect(addDownloadRequest).toHaveBeenCalledTimes(1);
        expect(addDownloadRequest).toHaveBeenCalledWith({
          admin_imported: false,
          coach_content: 0,
          id: 'content-id',
        });
      });
    });
  });
});
