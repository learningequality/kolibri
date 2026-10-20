import { render, screen } from '@testing-library/vue';
import Modalities from 'kolibri-constants/Modalities';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import CourseContentViewer from '../CourseContentViewer.vue';

jest.mock('kolibri/composables/useUser');
jest.mock('../useCourseContentProgressTracking');

const { nextResourceLabel$, previousResourceLabel$, footerNavigationAccessibleLabel$ } =
  coursesStrings;

// Mirrors the real ContentViewer's prop contract (a single `contentNode` object) so
// this stub fails the same way the real component would if the wrong props are passed.
const ContentViewerStub = {
  name: 'ContentViewer',
  template: '<div data-testid="content-viewer">{{ contentNode && contentNode.title }}</div>',
  props: ['contentNode'],
};

const QuizRendererStub = {
  name: 'QuizRenderer',
  template: '<div data-testid="quiz-renderer"><slot name="sidePanelFooter" /></div>',
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

  describe('up-next footer in a survey/quiz', () => {
    const surveyContentNode = {
      id: 'q1',
      title: 'Survey 1',
      modality: Modalities.SURVEY,
      assessmentmetadata: { assessment_item_ids: ['item-1'], randomize: false },
    };

    function renderWithFooter(props) {
      return render(CourseContentViewer, {
        props: { contentNode: surveyContentNode, ...props },
        // eslint-disable-next-line kolibri/tests-no-stubs
        stubs: { QuizRenderer: QuizRendererStub },
      });
    }

    it('names the footer button "Next resource: <title>" when a next resource is available', () => {
      renderWithFooter({ nextResource: { title: 'Next item' } });

      expect(screen.getByRole('button')).toHaveAccessibleName(
        footerNavigationAccessibleLabel$({ label: nextResourceLabel$(), title: 'Next item' }),
      );
    });

    it('names the footer button "Previous resource: <title>" when there is no next resource', () => {
      renderWithFooter({ previousResource: { title: 'Previous item' } });

      expect(screen.getByRole('button')).toHaveAccessibleName(
        footerNavigationAccessibleLabel$({
          label: previousResourceLabel$(),
          title: 'Previous item',
        }),
      );
    });
  });
});
