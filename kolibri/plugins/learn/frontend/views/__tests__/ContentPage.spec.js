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
          props: ['loading'],
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

  describe('when its content changes to another page', () => {
    const page = node({ id: virtualNodeId(ROOT_ID, PATH), root_id: ROOT_ID });

    it('restarts tracking with a session for the new page', async () => {
      const { updateProps } = await renderPage({ lessonId: 'lesson-1' });
      tracking.initContentSession.mockClear();

      await updateProps({ content: page });
      await flushPromises();

      expect(tracking.stopTrackingProgress).toHaveBeenCalled();
      expect(tracking.initContentSession).toHaveBeenCalledWith({
        node: page,
        lessonId: 'lesson-1',
      });
      expect(tracking.startTrackingProgress).toHaveBeenCalled();
    });

    it('keeps the same viewer mounted', async () => {
      const { updateProps } = await renderPage();
      const before = viewer;

      await updateProps({ content: page });
      await flushPromises();

      expect(viewer).toBe(before);
      expect(viewer._isDestroyed).toBe(false);
    });

    it("saves what the viewer reports only once the new page's session has started", async () => {
      const { updateProps } = await renderPage();
      let startSession;
      tracking.initContentSession.mockReturnValue(new Promise(resolve => (startSession = resolve)));

      await updateProps({ content: page });
      viewer.$emit('updateProgress', 0.4);
      viewer.$emit('updateProgress', 1);
      viewer.$emit('updateContentState', { scroll: 1 });
      await flushPromises();
      expect(tracking.updateContentSession).not.toHaveBeenCalled();

      startSession();
      await flushPromises();

      expect(tracking.updateContentSession).toHaveBeenCalledWith({ contentState: { scroll: 1 } });
      expect(tracking.updateContentSession).toHaveBeenCalledWith({ progress: 1 });
    });

    it("keeps the viewer loading from the page change until the new page's session has started", async () => {
      const { updateProps } = await renderPage();
      let startSession;
      tracking.initContentSession.mockReturnValue(new Promise(resolve => (startSession = resolve)));
      expect(viewer.loading).toBe(false);

      viewer.$emit('nowShowing', PATH);
      await updateProps({ content: page });
      await flushPromises();
      expect(viewer.loading).toBe(true);

      startSession();
      await flushPromises();

      expect(viewer.loading).toBe(false);
    });

    it('holds progress deltas until the new page session has started', async () => {
      const { updateProps } = await renderPage();
      let startSession;
      tracking.initContentSession.mockReturnValue(new Promise(resolve => (startSession = resolve)));

      await updateProps({ content: page });
      viewer.$emit('addProgress', 0.1);
      viewer.$emit('addProgress', 0.2);
      await flushPromises();
      expect(tracking.updateContentSession).not.toHaveBeenCalled();

      startSession();
      await flushPromises();

      expect(tracking.updateContentSession).toHaveBeenCalledWith({
        progressDelta: expect.closeTo(0.3),
      });
    });

    it('starts one session, for the latest page, when the page changes again mid-switch', async () => {
      const { updateProps } = await renderPage();
      const otherPage = node({ id: virtualNodeId(ROOT_ID, 'C/Other'), root_id: ROOT_ID });
      const starts = [];
      tracking.initContentSession.mockClear();
      tracking.initContentSession.mockImplementation(
        () => new Promise(resolve => starts.push(resolve)),
      );

      await updateProps({ content: page });
      await flushPromises();
      await updateProps({ content: otherPage });
      viewer.$emit('updateProgress', 0.5);
      starts[0]();
      await flushPromises();
      expect(tracking.updateContentSession).not.toHaveBeenCalled();

      starts[1]();
      await flushPromises();

      expect(tracking.initContentSession.mock.calls.map(([{ node }]) => node.id)).toEqual([
        page.id,
        otherPage.id,
      ]);
      expect(tracking.startTrackingProgress).toHaveBeenCalledTimes(1);
      expect(tracking.updateContentSession).toHaveBeenCalledWith({ progress: 0.5 });
    });
  });

  it('saves viewer progress straight away outside a page switch', async () => {
    await renderPage();

    viewer.$emit('updateProgress', 0.4);

    expect(tracking.updateContentSession).toHaveBeenCalledWith({ progress: 0.4 });
  });
});
