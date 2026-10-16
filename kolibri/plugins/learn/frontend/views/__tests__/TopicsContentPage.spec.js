import { shallowMount, createLocalVue } from '@vue/test-utils';
import { render, screen } from '@testing-library/vue';
import flushPromises from 'flush-promises';
import VueRouter from 'vue-router';
import client from 'kolibri/client';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import Modalities from 'kolibri-constants/Modalities';
// eslint-disable-next-line import-x/named
import useChannels, { useChannelsMock } from 'kolibri-common/composables/useChannels';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { virtualNodeId } from 'kolibri/utils/virtualNodeId';
import makeStore from '../../__tests__/utils/makeStore';
import TopicsContentPage from '../TopicsContentPage';
/* eslint-disable import-x/named */
import useDownloadRequests, {
  useDownloadRequestsMock,
} from '../../composables/useDownloadRequests';
import useCoreLearn, { useCoreLearnMock } from '../../composables/useCoreLearn';
import useContentLink, { useContentLinkMock } from '../../composables/useContentLink';
/* eslint-enable import-x/named */
import { setCurrentDevice } from '../../composables/useDevices';
import { PageNames } from '../../constants';

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('../../composables/useDownloadRequests');
jest.mock('kolibri-common/composables/useChannels');
jest.mock('../../composables/useCoreLearn');
jest.mock('../../composables/useContentLink');
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
  content = {},
} = {}) {
  const store = makeStore();
  ContentNodeResource.list.mockResolvedValue([]);
  ContentNodeResource.retrieve.mockResolvedValue({
    id: CONTENT_ID,
    admin_imported: isContentAdminImported,
    channel_id: CHANNEL_ID,
    ...content,
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

  describe('for a virtual page', () => {
    const page = { virtual: true, root_id: 'zim-root' };
    const activityBar = wrapper => wrapper.findComponent({ name: 'LearningActivityBar' });

    afterEach(() => {
      useContentLink.mockImplementation(() => useContentLinkMock());
    });

    it(`instructs 'LearningActivityBar' to not show the download button`, async () => {
      const wrapper = await makeAuthWrapperWithRemoteContent({ content: page });
      assertDownloadButtonIsNotDisplayed(wrapper);
    });

    it(`instructs 'LearningActivityBar' to not show the resource list outside a lesson`, async () => {
      const wrapper = await makeWrapper({ content: page });
      expect(activityBar(wrapper).attributes('showresourcelist')).toBeFalsy();
    });

    it(`instructs 'LearningActivityBar' to show the lesson's resource list`, async () => {
      useContentLink.mockImplementation(() =>
        useContentLinkMock({ back: { params: { lessonId: 'lesson-id' } } }),
      );
      const wrapper = await makeAuthWrapper({ content: page });
      expect(activityBar(wrapper).attributes('showresourcelist')).toBeTruthy();
    });
  });

  it(`instructs 'LearningActivityBar' to show the resource list for a real node`, async () => {
    const wrapper = await makeWrapper();
    expect(
      wrapper.findComponent({ name: 'LearningActivityBar' }).attributes('showresourcelist'),
    ).toBeTruthy();
  });
});

describe('TopicsContentPage same-root keep-alive', () => {
  const ROOT_ID = '0011223344556677889900aabbccddee';
  const ROOT_PAGE_ID = virtualNodeId(ROOT_ID, 'C/Index');
  const OTHER_PAGE_ID = virtualNodeId(ROOT_ID, 'C/Other');
  const UNRELATED_ID = 'ffffffffffffffffffffffffffffffff';

  beforeEach(() => {
    useChannels.mockImplementation(() =>
      useChannelsMock({
        channelsMap: {
          [CHANNEL_ID]: {
            id: CHANNEL_ID,
            name: 'test channel',
            root: ROOT_ID,
            thumbnail: '',
          },
        },
      }),
    );
  });

  afterEach(() => {
    useChannels.mockImplementation(() => useChannelsMock());
  });

  function mountAtRootPage() {
    ContentNodeResource.retrieve.mockResolvedValue({
      id: ROOT_PAGE_ID,
      root_id: ROOT_ID,
      virtual: true,
      channel_id: CHANNEL_ID,
    });
    const store = makeStore();
    return shallowMount(TopicsContentPage, {
      propsData: { id: ROOT_PAGE_ID },
      store,
      localVue,
      stubs: {
        LearningActivityBar: { name: 'LearningActivityBar', template: '<div></div>' },
        ContentPage: { name: 'ContentPage', template: '<div data-testid="contentPage"></div>' },
      },
    });
  }

  it('refreshes content without a loading teardown when the viewer navigates to another sub-page', async () => {
    const wrapper = mountAtRootPage();
    await flushPromises();

    const elementBefore = wrapper.find('[data-testid="contentPage"]').element;
    const callCountAfterMount = ContentNodeResource.retrieve.mock.calls.length;

    ContentNodeResource.retrieve.mockResolvedValue({
      id: OTHER_PAGE_ID,
      root_id: ROOT_ID,
      virtual: true,
      channel_id: CHANNEL_ID,
    });
    wrapper.findComponent({ name: 'ContentPage' }).vm.$emit('navigateInPlace', OTHER_PAGE_ID);
    await wrapper.setProps({ id: OTHER_PAGE_ID });
    expect(wrapper.vm.loading).toBe(false);
    await flushPromises();

    expect(ContentNodeResource.retrieve.mock.calls.length).toBeGreaterThan(callCountAfterMount);
    expect(wrapper.find('[data-testid="contentPage"]').element).toBe(elementBefore);
  });

  it('keeps the viewer alive when going back to a page it has already shown', async () => {
    const wrapper = mountAtRootPage();
    await flushPromises();
    const elementBefore = wrapper.find('[data-testid="contentPage"]').element;
    ContentNodeResource.retrieve.mockResolvedValue({
      id: OTHER_PAGE_ID,
      root_id: ROOT_ID,
      virtual: true,
      channel_id: CHANNEL_ID,
    });
    wrapper.findComponent({ name: 'ContentPage' }).vm.$emit('navigateInPlace', OTHER_PAGE_ID);
    await wrapper.setProps({ id: OTHER_PAGE_ID });
    await flushPromises();

    ContentNodeResource.retrieve.mockResolvedValue({
      id: ROOT_PAGE_ID,
      root_id: ROOT_ID,
      virtual: true,
      channel_id: CHANNEL_ID,
    });
    await wrapper.setProps({ id: ROOT_PAGE_ID });
    expect(wrapper.vm.loading).toBe(false);
    await flushPromises();

    expect(wrapper.find('[data-testid="contentPage"]').element).toBe(elementBefore);
  });

  it('sends a learner to the library when a sub-page of a gone remote device fails to load', async () => {
    ContentNodeResource.retrieve.mockResolvedValue({
      id: ROOT_PAGE_ID,
      root_id: ROOT_ID,
      virtual: true,
      channel_id: CHANNEL_ID,
    });
    const router = new VueRouter();
    const replace = jest.spyOn(router, 'replace').mockImplementation(() => {});
    const wrapper = shallowMount(TopicsContentPage, {
      propsData: { id: ROOT_PAGE_ID, deviceId: 'remote-device-id' },
      store: makeStore(),
      localVue,
      router,
      stubs: {
        LearningActivityBar: { name: 'LearningActivityBar', template: '<div></div>' },
        ContentPage: { name: 'ContentPage', template: '<div data-testid="contentPage"></div>' },
      },
    });
    await flushPromises();

    setCurrentDevice.mockRejectedValueOnce({ response: { status: 410 } });
    await wrapper.setProps({ id: OTHER_PAGE_ID });
    await flushPromises();

    expect(replace).toHaveBeenCalledWith({ name: PageNames.LIBRARY });
  });

  it('keeps the viewer alive when it moves from the ZIM root to one of its pages', async () => {
    ContentNodeResource.retrieve.mockResolvedValue({ id: ROOT_ID, channel_id: CHANNEL_ID });
    const wrapper = shallowMount(TopicsContentPage, {
      propsData: { id: ROOT_ID },
      store: makeStore(),
      localVue,
      stubs: {
        LearningActivityBar: { name: 'LearningActivityBar', template: '<div></div>' },
        ContentPage: { name: 'ContentPage', template: '<div data-testid="contentPage"></div>' },
      },
    });
    await flushPromises();
    const elementBefore = wrapper.find('[data-testid="contentPage"]').element;

    ContentNodeResource.retrieve.mockResolvedValue({
      id: ROOT_PAGE_ID,
      root_id: ROOT_ID,
      virtual: true,
      channel_id: CHANNEL_ID,
    });
    wrapper.findComponent({ name: 'ContentPage' }).vm.$emit('navigateInPlace', ROOT_PAGE_ID);
    await wrapper.setProps({ id: ROOT_PAGE_ID });
    expect(wrapper.vm.loading).toBe(false);
    await flushPromises();

    expect(wrapper.vm.content.id).toBe(ROOT_PAGE_ID);
    expect(wrapper.find('[data-testid="contentPage"]').element).toBe(elementBefore);
  });

  it('reloads the viewer when the route returns to its content before the page it moved to loads', async () => {
    const wrapper = mountAtRootPage();
    await flushPromises();
    const elementBefore = wrapper.find('[data-testid="contentPage"]').element;
    ContentNodeResource.retrieve.mockReturnValueOnce(new Promise(() => {}));
    wrapper.findComponent({ name: 'ContentPage' }).vm.$emit('navigateInPlace', OTHER_PAGE_ID);
    await wrapper.setProps({ id: OTHER_PAGE_ID });

    await wrapper.setProps({ id: ROOT_PAGE_ID });
    await flushPromises();

    expect(wrapper.find('[data-testid="contentPage"]').element).not.toBe(elementBefore);
  });

  it('takes the viewer down while loading a resource it has not shown, e.g. the next lesson resource', async () => {
    const wrapper = mountAtRootPage();
    await flushPromises();

    const elementBefore = wrapper.find('[data-testid="contentPage"]').element;

    ContentNodeResource.retrieve.mockResolvedValue({
      id: UNRELATED_ID,
      channel_id: CHANNEL_ID,
    });
    await wrapper.setProps({ id: UNRELATED_ID });
    expect(wrapper.find('[data-testid="contentPage"]').exists()).toBe(false);
    await flushPromises();

    expect(wrapper.find('[data-testid="contentPage"]').element).not.toBe(elementBefore);
  });
});
