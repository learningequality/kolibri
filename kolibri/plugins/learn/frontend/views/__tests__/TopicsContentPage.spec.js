import { shallowMount, createLocalVue } from '@vue/test-utils';
import { fireEvent, render, screen } from '@testing-library/vue';
import flushPromises from 'flush-promises';
import client from 'kolibri/client';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { crossComponentTranslator } from 'kolibri/utils/i18n';
import Modalities from 'kolibri-constants/Modalities';
import { ContentErrorConstants } from 'kolibri/constants';
import AddDeviceForm from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/AddDeviceForm';
// eslint-disable-next-line import-x/named
import useChannels, { useChannelsMock } from 'kolibri-common/composables/useChannels';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import makeStore from '../../__tests__/utils/makeStore';
import TopicsContentPage from '../TopicsContentPage';
import { learnStrings } from '../commonLearnStrings';
/* eslint-disable import-x/named */
import useDownloadRequests, {
  useDownloadRequestsMock,
} from '../../composables/useDownloadRequests';
import useCoreLearn, { useCoreLearnMock } from '../../composables/useCoreLearn';
/* eslint-enable import-x/named */

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('../../composables/useDownloadRequests');
jest.mock('kolibri-common/composables/useChannels');
jest.mock('../../composables/useCoreLearn');
jest.mock('../../composables/useDevices');
jest.mock('vue-router/composables', () => ({
  useRoute: jest.fn(() => ({ params: {}, query: {}, name: null })),
  useRouter: jest.fn(() => ({ push: jest.fn(), currentRoute: {} })),
}));
jest.mock('kolibri-common/utils/samePageCheckGenerator', () => jest.fn(() => () => true));

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
  ContentNodeResource.list.mockResolvedValue([]);
  ContentNodeResource.retrieve.mockResolvedValue({
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
    expect(wrapper.find('[data-testid="learningActivityBar"]').exists()).toBeTruthy();
  });

  it('shows the Content Page', async () => {
    const wrapper = await makeWrapper();
    expect(wrapper.find('[data-testid="contentPage"]').exists()).toBeTruthy();
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

  describe('with the information side panel open', () => {
    const RESOURCE = {
      id: CONTENT_ID,
      content_id: 'content-content-id',
      channel_id: CHANNEL_ID,
      kind: 'document',
      title: 'Resource title',
      ancestors: [],
      parent: 'root',
      files: [],
      options: {},
      assessmentmetadata: null,
    };
    const FAIL_TO_LOAD = 'Fail to load';
    const FINISH = 'Finish';
    const ContentViewer = {
      template: `
        <div>
          <button @click="$emit('error', { error: '${ContentErrorConstants.LOADING_ERROR}' })">
            ${FAIL_TO_LOAD}
          </button>
          <button @click="$emit('finished')">${FINISH}</button>
        </div>
      `,
    };

    afterEach(() => {
      client.__reset();
    });

    async function renderRemoteContentWithInfoPanel() {
      ContentNodeResource.retrieve.mockResolvedValue(RESOURCE);
      render(TopicsContentPage, {
        props: { id: CONTENT_ID, deviceId: 'remote-device-id' },
        store: makeStore(),
        routes: [],
        // eslint-disable-next-line kolibri/tests-no-stubs
        stubs: { ContentViewer },
      });
      await flushPromises();
      await fireEvent.click(
        await screen.findByRole('button', { name: coreStrings.viewInformation$() }),
      );
      await flushPromises();
      expect(screen.getByRole('dialog', { name: RESOURCE.title })).toBeInTheDocument();
    }

    it('closes the panel when the remote content fails to load', async () => {
      await renderRemoteContentWithInfoPanel();
      await fireEvent.click(screen.getByRole('button', { name: FAIL_TO_LOAD }));
      await flushPromises();
      expect(screen.queryByRole('dialog', { name: RESOURCE.title })).not.toBeInTheDocument();
      expect(
        screen.getByRole('dialog', {
          name: crossComponentTranslator(AddDeviceForm).$tr('errorCouldNotConnect'),
        }),
      ).toBeInTheDocument();
    });

    it('closes the panel when the completion modal opens', async () => {
      client.__setPayload({ complete: true, progress: 0.5, extra_fields: {} });
      await renderRemoteContentWithInfoPanel();
      await fireEvent.click(screen.getByRole('button', { name: FINISH }));
      await flushPromises();
      expect(screen.queryByRole('dialog', { name: RESOURCE.title })).not.toBeInTheDocument();
      expect(
        screen.getByRole('dialog', { name: learnStrings.resourceCompletedLabel$() }),
      ).toBeInTheDocument();
    });
  });

  describe('page title', () => {
    const RESOURCE_TITLE = 'Resource title';
    const CHANNEL_TITLE = 'Channel title';
    const resource = {
      id: CONTENT_ID,
      content_id: 'content-content-id',
      channel_id: CHANNEL_ID,
      kind: 'document',
      title: RESOURCE_TITLE,
      ancestors: [{ id: 'root', title: CHANNEL_TITLE }],
      parent: 'root',
      files: [],
      options: {},
      assessmentmetadata: null,
    };

    const practiceQuiz = {
      ...resource,
      kind: 'exercise',
      options: { modality: Modalities.QUIZ },
      assessmentmetadata: {
        assessment_item_ids: ['item-1', 'item-2'],
        mastery_model: { type: 'pre_post_test' },
      },
    };

    async function renderPage(content) {
      ContentNodeResource.retrieve.mockResolvedValue(content);
      render(TopicsContentPage, { props: { id: CONTENT_ID }, store: makeStore(), routes: [] });
      await flushPromises();
    }

    beforeEach(() => {
      document.title = '';
    });

    it('titles a resource with its title and channel, under one hidden h1', async () => {
      await renderPage(resource);
      expect(document.title).toBe(
        `${RESOURCE_TITLE} - ${CHANNEL_TITLE} - ${coreStrings.kolibriLabel$()}`,
      );
      const headings = screen.getAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(`${RESOURCE_TITLE} - ${CHANNEL_TITLE}`);
      expect(headings[0]).toHaveClass('visuallyhidden');
    });

    it("leaves a practice quiz's question heading as its only h1", async () => {
      await renderPage(practiceQuiz);
      const headings = screen.getAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
      expect(headings[0]).not.toHaveClass('visuallyhidden');
    });

    it("gives a guest's mastered practice quiz one hidden h1", async () => {
      client.__setPayload({ complete: true, progress: 1, pastattempts: [], extra_fields: {} });
      await renderPage(practiceQuiz);
      const headings = screen.getAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(RESOURCE_TITLE);
      expect(headings[0]).toHaveClass('visuallyhidden');
    });
  });
});
