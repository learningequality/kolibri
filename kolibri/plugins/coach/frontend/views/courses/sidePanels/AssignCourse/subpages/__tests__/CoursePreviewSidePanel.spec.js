/* global flushPromises */
import { reactive } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';
import { useRoute, useRouter } from 'vue-router/composables';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { PageNames } from '../../../../../../constants';
import CoursePreviewSidePanel from '../CoursePreviewSidePanel.vue';

const { backAction$, saveToBookmarks$ } = coreStrings;
const { selectCourseLabel$ } = coursesStrings;
const TEST_ROUTES = [
  { path: '/', name: PageNames.COURSES_ASSIGN_COURSE_DETAILS },
  { path: '/index', name: PageNames.COURSES_ASSIGN_INDEX },
];

jest.mock('vue-router/composables', () => ({ useRoute: jest.fn(), useRouter: jest.fn() }));
jest.mock('kolibri-common/apiResources/ContentNodeResource');

describe('CoursePreviewSidePanel', () => {
  let mockRoute;
  let push;

  beforeEach(() => {
    mockRoute = reactive({
      params: { courseId: 'course-1' },
      query: { previewTopicId: 'topic-B', previewContentId: undefined },
      name: PageNames.COURSES_ASSIGN_COURSE_DETAILS,
    });
    push = jest.fn();
    useRoute.mockReturnValue(mockRoute);
    useRouter.mockReturnValue({ push });
  });

  it('renders the topic once its fetch resolves', async () => {
    const topicTitle = 'Topic B';
    ContentNodeResource.fetchTree.mockResolvedValue({
      id: 'topic-B',
      title: topicTitle,
      parent: 'topic-A',
      children: { results: [] },
    });

    render(CoursePreviewSidePanel, { routes: TEST_ROUTES });
    await flushPromises();

    expect(screen.getByRole('heading', { name: topicTitle, level: 2 })).toBeInTheDocument();
  });

  it('does not render a bookmark button on resource cards', async () => {
    const resourceTitle = 'Resource 1';
    ContentNodeResource.fetchTree.mockResolvedValue({
      id: 'topic-B',
      title: 'Topic B',
      parent: 'topic-A',
      children: {
        results: [
          {
            id: 'resource-1',
            title: resourceTitle,
            is_leaf: true,
            learning_activities: [],
          },
        ],
      },
    });

    render(CoursePreviewSidePanel, { routes: TEST_ROUTES });
    await flushPromises();

    expect(screen.getByRole('heading', { name: resourceTitle, level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: saveToBookmarks$() })).not.toBeInTheDocument();
  });

  describe('breadcrumb "Courses" crumb', () => {
    it('links to the course picker when assigning a new course', async () => {
      ContentNodeResource.fetchTree.mockResolvedValue({
        id: 'topic-B',
        title: 'Topic B',
        parent: 'topic-A',
        children: { results: [] },
      });

      render(CoursePreviewSidePanel, { routes: TEST_ROUTES });
      await flushPromises();

      // KBreadcrumbs collapses non-last crumbs into an offscreen/dropdown clone whenever
      // it can't measure real widths (as in jsdom), so a role/visibility-based query would
      // miss it; check that the crumb resolves to the course-picker link.
      const matches = screen.getAllByText(selectCourseLabel$());
      const link = matches.map(el => el.closest('a')).find(Boolean);
      expect(link).toHaveAttribute('href', expect.stringContaining('/index'));
    });

    it('is omitted when previewing from an already-assigned course summary', async () => {
      mockRoute.params = { courseId: 'course-1', courseSessionId: 'session-1' };
      ContentNodeResource.fetchTree.mockResolvedValue({
        id: 'topic-B',
        title: 'Topic B',
        parent: 'topic-A',
        children: { results: [] },
      });

      render(CoursePreviewSidePanel, { routes: TEST_ROUTES });
      await flushPromises();

      expect(screen.queryAllByText(selectCourseLabel$())).toHaveLength(0);
    });
  });

  describe('goBack', () => {
    it('goes from a resource back to its topic', async () => {
      mockRoute.query = { previewTopicId: 'topic-B', previewContentId: 'resource-1' };
      ContentNodeResource.fetchTree.mockResolvedValue({
        id: 'topic-B',
        parent: 'topic-A',
        children: { results: [] },
      });
      ContentNodeResource.fetchModel.mockResolvedValue({ id: 'resource-1', ancestors: [] });

      render(CoursePreviewSidePanel, { routes: TEST_ROUTES });
      await flushPromises();

      await fireEvent.click(screen.getByRole('button', { name: backAction$() }));

      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            previewTopicId: 'topic-B',
            previewContentId: undefined,
          }),
        }),
      );
    });

    it('goes from a topic up to its parent topic', async () => {
      ContentNodeResource.fetchTree.mockResolvedValue({
        id: 'topic-B',
        parent: 'topic-A',
        children: { results: [] },
      });

      render(CoursePreviewSidePanel, { routes: TEST_ROUTES });
      await flushPromises();

      await fireEvent.click(screen.getByRole('button', { name: backAction$() }));

      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            previewTopicId: 'topic-A',
            previewContentId: undefined,
          }),
        }),
      );
    });

    it('exits preview when going back from the course root', async () => {
      mockRoute.query = { previewTopicId: 'course-1', previewContentId: undefined };
      ContentNodeResource.fetchTree.mockResolvedValue({
        id: 'course-1',
        parent: null,
        children: { results: [] },
      });

      render(CoursePreviewSidePanel, { routes: TEST_ROUTES });
      await flushPromises();

      await fireEvent.click(screen.getByRole('button', { name: backAction$() }));

      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({
          name: PageNames.COURSES_ASSIGN_COURSE_DETAILS,
          query: expect.objectContaining({
            previewTopicId: undefined,
            previewContentId: undefined,
          }),
        }),
      );
    });
  });

  it('hides the back button rather than navigating to a stale parent while the next topic is still loading', async () => {
    let resolveTopicC;
    const topicCFetch = new Promise(resolve => {
      resolveTopicC = resolve;
    });

    ContentNodeResource.fetchTree.mockImplementation(({ id }) => {
      if (id === 'topic-B') {
        return Promise.resolve({ id: 'topic-B', parent: 'topic-A', children: { results: [] } });
      }
      if (id === 'topic-C') {
        return topicCFetch;
      }
      throw new Error(`unexpected fetchTree id: ${id}`);
    });

    render(CoursePreviewSidePanel, { routes: TEST_ROUTES });
    // let the initial topic-B fetch resolve so topic.value is populated
    await flushPromises();

    // navigate deeper into topic-C; this starts a new (still-pending) fetch
    mockRoute.query = { ...mockRoute.query, previewTopicId: 'topic-C' };
    await flushPromises();

    // topic.value still holds topic-B's stale data while topic-C is in flight,
    // so the back button should be hidden rather than clickable
    expect(screen.queryByRole('button', { name: backAction$() })).not.toBeInTheDocument();

    // once the fetch resolves, the back button reappears
    resolveTopicC({ id: 'topic-C', parent: 'topic-B', children: { results: [] } });
    await flushPromises();

    expect(screen.getByRole('button', { name: backAction$() })).toBeInTheDocument();
  });

  it('hides the back button rather than navigating to a stale parent when the topic fetch fails', async () => {
    mockRoute.query = { previewTopicId: 'topic-C', previewContentId: undefined };
    mockRoute.params = { courseId: 'course-1' };
    ContentNodeResource.fetchTree.mockRejectedValue(new Error('network error'));

    render(CoursePreviewSidePanel, { routes: TEST_ROUTES });
    await flushPromises();

    expect(screen.queryByRole('button', { name: backAction$() })).not.toBeInTheDocument();
  });

  it('does not crash when previewContentId is already set before the topic fetch resolves', async () => {
    mockRoute.query = { previewTopicId: 'topic-B', previewContentId: 'resource-1' };
    ContentNodeResource.fetchModel.mockResolvedValue({ id: 'resource-1', ancestors: [] });

    let resolveTopicB;
    ContentNodeResource.fetchTree.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveTopicB = resolve;
        }),
    );

    render(CoursePreviewSidePanel, { routes: TEST_ROUTES });
    await flushPromises();

    resolveTopicB({ id: 'topic-B', parent: 'topic-A', children: { results: [] } });
    await flushPromises();
  });
});
