import { render, screen } from '@testing-library/vue';
import CourseContentViewer from '../CourseContentViewer.vue';

jest.mock('kolibri/composables/useUser');
jest.mock('../useCourseContentProgressTracking');

// Mirrors the real ContentViewer's prop contract (a single `contentNode` object) so
// this stub fails the same way the real component would if the wrong props are passed.
const ContentViewerStub = {
  name: 'ContentViewer',
  template: '<div data-testid="content-viewer">{{ contentNode && contentNode.title }}</div>',
  props: ['contentNode'],
};

describe('CourseContentViewer', () => {
  it('passes the contentNode prop through to ContentViewer', () => {
    const contentNode = {
      id: 'r1',
      title: 'Resource 1',
      kind: 'video',
      files: [{ id: 'f1', extension: 'mp4', preset: 'high_res_video' }],
      options: {},
      duration: 100,
    };

    render(CourseContentViewer, {
      props: { contentNode },
      // eslint-disable-next-line kolibri/tests-no-stubs
      stubs: { ContentViewer: ContentViewerStub },
    });

    expect(screen.getByTestId('content-viewer')).toHaveTextContent('Resource 1');
  });
});
