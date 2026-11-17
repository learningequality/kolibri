import { computed } from 'vue';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import Modalities from 'kolibri-constants/Modalities';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import CourseContentViewer from '../CourseContentViewer.vue';
import {
  injectCourseContentProgress,
  // eslint-disable-next-line import-x/named
  injectCourseContentProgressMock,
} from '../useCourseContentProgressTracking';

jest.mock('kolibri/composables/useUser');
jest.mock('../useCourseContentProgressTracking');
jest.mock('kolibri/client');
jest.mock('kolibri/urls');

const {
  nextResourceLabel$,
  previousResourceLabel$,
  footerNavigationAccessibleLabel$,
  submitTestAction$,
} = coursesStrings;

const NEXT_ITEM_TITLE = 'Next item';
const PREVIOUS_ITEM_TITLE = 'Previous item';

// Mirrors the real ContentViewer's prop contract (a single `contentNode` object) so
// this stub fails the same way the real component would if the wrong props are passed.
const ContentViewerStub = {
  name: 'ContentViewer',
  template: '<div data-testid="content-viewer">{{ contentNode && contentNode.title }}</div>',
  props: ['contentNode'],
  methods: {
    checkAnswer() {
      return null;
    },
  },
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

    beforeEach(() => {
      urls.__echoUrls();
      const currentTry = { attemptlogs: [], complete: true, end_timestamp: new Date() };
      client.mockImplementation(({ url }) =>
        Promise.resolve({ data: url.includes('diff') ? currentTry : [currentTry] }),
      );
    });

    function renderWithFooter(props) {
      return render(CourseContentViewer, {
        props: { contentNode: surveyContentNode, ...props },
      });
    }

    it('names the footer button "Next resource: <title>" when a next resource is available', async () => {
      renderWithFooter({ nextResource: { title: NEXT_ITEM_TITLE } });

      const expectedName = footerNavigationAccessibleLabel$({
        label: nextResourceLabel$(),
        title: NEXT_ITEM_TITLE,
      });
      expect(await screen.findByRole('button', { name: expectedName })).toBeInTheDocument();
    });

    it('names the footer button "Previous resource: <title>" when there is no next resource', async () => {
      renderWithFooter({ previousResource: { title: PREVIOUS_ITEM_TITLE } });

      const expectedName = footerNavigationAccessibleLabel$({
        label: previousResourceLabel$(),
        title: PREVIOUS_ITEM_TITLE,
      });
      expect(await screen.findByRole('button', { name: expectedName })).toBeInTheDocument();
    });
  });

  it('reports a refused save on a pre/post test', async () => {
    injectCourseContentProgress.mockImplementationOnce(() =>
      injectCourseContentProgressMock({
        mastery_criterion: computed(() => ({
          type: 'pre_post_test',
          version: 'A',
          test_type: 'pre',
        })),
        updateContentSession: jest.fn().mockRejectedValue({ response: { status: 403 } }),
      }),
    );
    const unit = {
      id: 'u1',
      title: 'Unit 1',
      options: {
        completion_criteria: { threshold: { pre_post_test: { version_a_item_ids: ['item-1'] } } },
      },
    };
    const { emitted } = render(CourseContentViewer, {
      props: { contentNode: unit },
      // eslint-disable-next-line kolibri/tests-no-stubs
      stubs: { ContentViewer: ContentViewerStub },
    });

    await fireEvent.click(screen.getByRole('button', { name: submitTestAction$() }));
    await fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: submitTestAction$() }),
    );

    await waitFor(() => expect(emitted().saveRejected).toHaveLength(1));
  });
});
