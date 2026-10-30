import { ref } from 'vue';
import { render } from '@testing-library/vue';
import flushPromises from 'flush-promises';
import { virtualNodeId } from 'kolibri/utils/virtualNodeId';
import router from 'kolibri/router';
import makeStore from '../../__tests__/utils/makeStore';
import useProgressTracking from '../../composables/useProgressTracking';
// eslint-disable-next-line import-x/named
import useContentLink, { useContentLinkMock } from '../../composables/useContentLink';
import ContentPage from '../ContentPage';

jest.mock('kolibri/router', () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }));
jest.mock('../../composables/useProgressTracking', () => jest.fn());
jest.mock('../../composables/useContentLink');

const ROOT_ID = '0011223344556677889900aabbccddee';
const PATH = 'C/Albert_Einstein';

let tracking;
let viewer;

function node(overrides = {}) {
  return {
    id: ROOT_ID,
    content_id: 'content-id',
    channel_id: 'channel-id',
    kind: 'zim',
    title: 'A ZIM',
    ancestors: [],
    ...overrides,
  };
}

async function renderPage({ content = node(), routeId = content.id, lessonId = null } = {}) {
  const result = render(
    ContentPage,
    {
      props: { content, lessonId },
      store: makeStore(),
      routes: [{ path: '/:id', name: 'TOPICS_CONTENT' }],
      // eslint-disable-next-line kolibri/tests-no-stubs
      stubs: {
        ContentViewer: {
          name: 'ContentViewer',
          template: '<div></div>',
          created() {
            viewer = this;
          },
        },
      },
    },
    (vue, store, vueRouter) => {
      vueRouter.push(`/${routeId}`);
    },
  );
  await flushPromises();
  return result;
}

describe('ContentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    viewer = null;
    tracking = {
      initContentSession: jest.fn(() => Promise.resolve()),
      updateContentSession: jest.fn(() => Promise.resolve()),
      startTrackingProgress: jest.fn(),
      stopTrackingProgress: jest.fn(() => Promise.resolve()),
    };
    useProgressTracking.mockImplementation(() => ({
      progress: ref(0),
      time_spent: ref(0),
      extra_fields: ref({}),
      pastattempts: ref([]),
      complete: ref(false),
      context: ref({}),
      totalattempts: ref(0),
      ...tracking,
    }));
    useContentLink.mockImplementation(() =>
      useContentLinkMock({
        genContentLinkKeepCurrentBackLink: id => ({ name: 'TOPICS_CONTENT', params: { id } }),
      }),
    );
  });

  it('starts a session for its content when it is created', async () => {
    const content = node();
    await renderPage({ content, lessonId: 'lesson-1' });

    expect(tracking.initContentSession).toHaveBeenCalledWith(
      expect.objectContaining({ node: content, lessonId: 'lesson-1' }),
    );
    expect(tracking.stopTrackingProgress).not.toHaveBeenCalled();
  });

  it('goes back in history when the viewer asks to go back', async () => {
    await renderPage();

    viewer.$emit('goBack');

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  describe('when the viewer reports the page it is showing', () => {
    it('replaces the root with the page it lands on', async () => {
      const { emitted } = await renderPage();
      const pageId = virtualNodeId(ROOT_ID, PATH);

      viewer.$emit('nowShowing', PATH);

      expect(router.replace).toHaveBeenCalledWith({
        name: 'TOPICS_CONTENT',
        params: { id: pageId },
      });
      expect(router.push).not.toHaveBeenCalled();
      expect(emitted().navigateInPlace).toEqual([[pageId]]);
    });

    it('pushes each page navigated to after landing, so back/forward move between them', async () => {
      const { updateProps } = await renderPage();
      viewer.$emit('nowShowing', 'C/Main_Page');
      await updateProps({
        content: node({
          id: virtualNodeId(ROOT_ID, 'C/Main_Page'),
          root_id: ROOT_ID,
          virtual: true,
        }),
      });

      viewer.$emit('nowShowing', PATH);

      expect(router.push).toHaveBeenCalledWith({
        name: 'TOPICS_CONTENT',
        params: { id: virtualNodeId(ROOT_ID, PATH) },
      });
    });

    it('replaces the root with its page when the root is reopened mid-session, so back is not trapped', async () => {
      const { updateProps } = await renderPage();
      viewer.$emit('nowShowing', 'C/Main_Page');
      await updateProps({
        content: node({ id: virtualNodeId(ROOT_ID, PATH), root_id: ROOT_ID, virtual: true }),
      });
      router.replace.mockClear();
      await updateProps({ content: node() });

      viewer.$emit('nowShowing', 'C/Main_Page');

      expect(router.replace).toHaveBeenCalledWith({
        name: 'TOPICS_CONTENT',
        params: { id: virtualNodeId(ROOT_ID, 'C/Main_Page') },
      });
      expect(router.push).not.toHaveBeenCalled();
    });

    it('does not route when the route already shows the page', async () => {
      const { emitted } = await renderPage({ routeId: virtualNodeId(ROOT_ID, PATH) });

      viewer.$emit('nowShowing', PATH);

      expect(router.push).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
      expect(emitted().navigateInPlace).toBeUndefined();
    });

    it("identifies a sub-page's sibling pages by the root they share", async () => {
      await renderPage({
        content: node({ id: virtualNodeId(ROOT_ID, 'C/Old'), root_id: ROOT_ID }),
      });

      viewer.$emit('nowShowing', PATH);

      expect(router.replace).toHaveBeenCalledWith({
        name: 'TOPICS_CONTENT',
        params: { id: virtualNodeId(ROOT_ID, PATH) },
      });
    });
  });
});
