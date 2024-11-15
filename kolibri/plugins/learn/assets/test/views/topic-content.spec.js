import { shallowMount, createLocalVue } from '@vue/test-utils';
import flushPromises from 'flush-promises';
// eslint-disable-next-line import/named
import useChannels, { useChannelsMock } from 'kolibri-common/composables/useChannels';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import makeStore from '../makeStore';
import TopicsContentPage from '../../src/views/TopicsContentPage';
/* eslint-disable import/named */
import useDownloadRequests, {
  useDownloadRequestsMock,
} from '../../src/composables/useDownloadRequests';
import useCoreLearn, { useCoreLearnMock } from '../../src/composables/useCoreLearn';
/* eslint-enable import/named */

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('../../src/composables/useDownloadRequests');
jest.mock('kolibri-common/composables/useChannels');
jest.mock('../../src/composables/useCoreLearn');
jest.mock('../../src/composables/useDevices');

const CONTENT_ID = 'content-id';
const CHANNEL_ID = 'channel-id';

const localVue = createLocalVue();

// see `makeWrapper` for `params`
async function makeAuthWrapper(params) {
  return await makeWrapper({ ...params, isUserLoggedIn: true });
}

// see `makeWrapper` for `params`
async function makeAuthWrapperWithRemoteContent(params) {
  return await makeAuthWrapper({
    ...params,
    propsData: {
      deviceId: 'remote-device-id', // non-null device ID means that the content is remote
      ...params?.propsData,
    },
  });
}

async function makeWrapper({
  propsData = {},
  isContentAdminImported = false,
  isUserLoggedIn = false,
} = {}) {
  const store = makeStore();
  ContentNodeResource.fetchCollection.mockResolvedValue([]);
  ContentNodeResource.fetchModel.mockResolvedValue({
    id: CONTENT_ID,
    admin_imported: isContentAdminImported,
    channel_id: CHANNEL_ID,
  });

  const wrapper = shallowMount(TopicsContentPage, {
    propsData: {
      id: CONTENT_ID,
      ...propsData,
    },
    data: () => ({ isUserLoggedIn }),
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
  await flushPromises();
  return wrapper;
}

function assertBookmarkButtonIsDisplayed(wrapper) {
  expect(
    wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showbookmark'),
  ).toBeTruthy();
}

function assertBookmarkButtonIsNotDisplayed(wrapper) {
  expect(
    wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showbookmark'),
  ).toBeFalsy();
}

function assertDownloadButtonIsDisplayed(wrapper) {
  expect(
    wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showdownloadbutton'),
  ).toBeTruthy();
}

function assertDownloadButtonIsNotDisplayed(wrapper) {
  expect(
    wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showdownloadbutton'),
  ).toBeFalsy();
}

describe('TopicsContentPage', () => {
  beforeEach(() => {
    // reset back to defaults
    useChannels.mockImplementation(() =>
      useChannelsMock({
        channelsMap: {
          [CHANNEL_ID]: {
            id: CHANNEL_ID,
            name: 'test channel',
            root: 'test root',
            thumbnail: 'test thumbnail',
          },
        },
      }),
    );
  });
  afterEach(() => {
    // reset back to defaults
    useDownloadRequests.mockImplementation(() => useDownloadRequestsMock());
    useChannels.mockImplementation(() => useChannelsMock());
  });

  it('smoke test', async () => {
    const wrapper = await makeWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('shows the Learning Activity Bar', async () => {
    const wrapper = await makeWrapper();
    expect(wrapper.find('[data-test="learningActivityBar"]').exists()).toBeTruthy();
  });

  it('shows the Content Page', async () => {
    const wrapper = await makeWrapper();
    expect(wrapper.find('[data-test="contentPage"]').exists()).toBeTruthy();
  });

  describe(`remote download and bookmark`, () => {
    describe(`when a user is not logged in`, () => {
      it(`instructs 'LearningActivityBar' to not show the bookmark button`, async () => {
        const wrapper = await makeWrapper();
        assertBookmarkButtonIsNotDisplayed(wrapper);
      });

      it(`instructs 'LearningActivityBar' to not show the download button`, async () => {
        const wrapper = await makeWrapper();
        assertDownloadButtonIsNotDisplayed(wrapper);
      });
    });

    describe(`when a user is logged in`, () => {
      describe(`when content is not remote`, () => {
        let wrapper;
        beforeEach(async () => {
          wrapper = await makeAuthWrapper();
        });

        it(`instructs 'LearningActivityBar' to show the bookmark button`, () => {
          assertBookmarkButtonIsDisplayed(wrapper);
        });

        it(`instructs 'LearningActivityBar' to not show the download button`, () => {
          assertDownloadButtonIsNotDisplayed(wrapper);
        });
      });

      describe(`for remote content that was imported by an admin`, () => {
        let wrapper;
        beforeEach(async () => {
          wrapper = await makeAuthWrapperWithRemoteContent({
            isContentAdminImported: true,
          });
        });

        it(`instructs 'LearningActivityBar' to show the bookmark button`, () => {
          assertBookmarkButtonIsDisplayed(wrapper);
        });

        it(`instructs 'LearningActivityBar' to not show the download button`, () => {
          assertDownloadButtonIsNotDisplayed(wrapper);
        });
      });

      describe(`for remote content that was downloaded by a learner (and not imported by an admin)`, () => {
        let wrapper;
        beforeEach(async () => {
          useDownloadRequests.mockImplementation(() =>
            useDownloadRequestsMock({
              downloadRequestMap: {
                [CONTENT_ID]: {
                  id: CONTENT_ID,
                  status: 'COMPLETED',
                },
              },
            }),
          );
          wrapper = await makeAuthWrapperWithRemoteContent();
        });

        it(`instructs 'LearningActivityBar' to show the bookmark button`, () => {
          assertBookmarkButtonIsDisplayed(wrapper);
        });

        it(`instructs 'LearningActivityBar' to not show the download button`, () => {
          assertDownloadButtonIsNotDisplayed(wrapper);
        });
      });

      describe(`for remote content that is being downloaded by a learner (and not imported by an admin)`, () => {
        let wrapper;
        beforeEach(async () => {
          useDownloadRequests.mockImplementation(() =>
            useDownloadRequestsMock({
              downloadRequestMap: {
                [CONTENT_ID]: {
                  id: CONTENT_ID,
                  status: 'PENDING',
                },
              },
            }),
          );
          useCoreLearn.mockImplementation(() =>
            useCoreLearnMock({
              canAddDownloads: () => true,
            }),
          );
          wrapper = await makeAuthWrapperWithRemoteContent();
        });

        it(`instructs 'LearningActivityBar' to not show the bookmark button`, () => {
          assertBookmarkButtonIsNotDisplayed(wrapper);
        });

        it(`instructs 'LearningActivityBar' to show the download button as disabled`, () => {
          assertDownloadButtonIsDisplayed(wrapper);
          expect(
            wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('isdownloading'),
          ).toBeTruthy();
        });
      });

      describe(`for remote content that hasn't been downloaded by a learner or imported by an admin yet`, () => {
        let wrapper;
        beforeEach(async () => {
          wrapper = await makeAuthWrapperWithRemoteContent();
        });

        it(`instructs 'LearningActivityBar' to not show the bookmark button`, () => {
          assertBookmarkButtonIsNotDisplayed(wrapper);
        });

        it(`instructs 'LearningActivityBar' to show the download button`, () => {
          assertDownloadButtonIsDisplayed(wrapper);
        });

        it(`clicking the download button calls 'addDownloadRequest' with content in the payload`, async () => {
          const addDownloadRequest = jest.fn();
          useDownloadRequests.mockImplementation(() =>
            useDownloadRequestsMock({
              downloadRequestMap: {},
              addDownloadRequest,
            }),
          );
          wrapper = await makeAuthWrapperWithRemoteContent();
          wrapper.findComponent({ name: 'LearningActivityBar' }).vm.$emit('download');

          expect(addDownloadRequest).toHaveBeenCalledTimes(1);
          expect(addDownloadRequest).toHaveBeenCalledWith({
            admin_imported: false,
            id: CONTENT_ID,
            channel_id: CHANNEL_ID,
          });
        });
      });
    });
  });
});
