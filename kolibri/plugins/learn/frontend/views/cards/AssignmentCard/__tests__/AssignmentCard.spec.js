import { mount, RouterLinkStub } from '@vue/test-utils';
/* eslint-disable import-x/named */
import useContentNodeProgress, {
  useContentNodeProgressMock,
} from '../../../../composables/useContentNodeProgress';
/* eslint-enable import-x/named */
import AssignmentCard from '../index.vue';

jest.mock('../../../../composables/useContentNodeProgress');

// --- Course test data ---
const baseCourse = {
  id: '395b68e7be06485cbe65ce159dac6859',
  title: 'Test Course 1',
};

const makeResource = (contentId, progress = 0) => ({
  contentnode_id: contentId,
  progress,
  contentnode: { content_id: contentId },
});

// --- Lesson test data ---
const baseLesson = {
  id: '395b68e7be06485cbe65ce159dac6859',
  title: 'Test Lesson 1',
  resources: [],
};

// --- Quiz test data ---
const baseQuiz = {
  id: '395b68e7be06485cbe65ce159dac6859',
  title: 'Test Quiz 1',
  active: true,
  question_count: 10,
  progress: {
    started: false,
    closed: false,
    answer_count: 0,
    score: null,
  },
};

function makeCourseWrapper(propsOverrides = {}) {
  return mount(AssignmentCard, {
    stubs: {
      RouterLink: RouterLinkStub,
    },
    propsData: {
      course: baseCourse,
      to: { path: '/course' },
      collectionTitle: 'Test Classroom 1',
      ...propsOverrides,
    },
  });
}

function makeLessonWrapper(lessonOverrides = {}) {
  return mount(AssignmentCard, {
    stubs: {
      RouterLink: RouterLinkStub,
    },
    propsData: {
      lesson: {
        ...baseLesson,
        ...lessonOverrides,
      },
      collectionTitle: 'Test Classroom 1',
      to: { path: '/lesson' },
    },
  });
}

function makeQuizWrapper(quizOverrides = {}) {
  return mount(AssignmentCard, {
    stubs: {
      RouterLink: RouterLinkStub,
    },
    propsData: {
      quiz: {
        ...baseQuiz,
        ...quizOverrides,
        progress: {
          ...baseQuiz.progress,
          ...(quizOverrides.progress || {}),
        },
      },
      to: { path: '/quiz' },
      collectionTitle: 'Test Classroom 1',
    },
  });
}

describe('AssignmentCard', () => {
  beforeEach(() => {
    useContentNodeProgress.mockImplementation(() => useContentNodeProgressMock());
  });

  describe('when rendering a course', () => {
    let wrapper;

    it('shows the classroom name when collectionTitle is provided', () => {
      wrapper = makeCourseWrapper();
      expect(wrapper.find('.collection-title').text()).toEqual('Test Classroom 1');
    });

    it('does not show the classroom name when collectionTitle is empty', () => {
      wrapper = makeCourseWrapper({ collectionTitle: '' });
      expect(wrapper.find('.collection-title').exists()).toBe(false);
    });

    it('shows the course title', () => {
      wrapper = makeCourseWrapper();
      expect(wrapper.findComponent({ name: 'KCard' }).props().title).toEqual('Test Course 1');
    });

    it('shows the course label with icon and label', () => {
      wrapper = makeCourseWrapper();
      const label = wrapper.find('.course-label');
      expect(label.exists()).toBe(true);

      const icon = label.findComponent({ name: 'KIcon' });
      expect(icon.exists()).toBe(true);
      expect(icon.props().icon).toEqual('course');

      const text = label.find('.label-text');
      expect(text.exists()).toBe(true);
      expect(text.text()).toEqual('Course');
    });

    it('shows the right link', () => {
      wrapper = makeCourseWrapper();
      const routerLink = wrapper.findComponent(RouterLinkStub);
      expect(routerLink.props().to).toEqual({ path: '/course' });
    });

    it('does not show counts when unit_count and lesson_count are absent', () => {
      wrapper = makeCourseWrapper();
      expect(wrapper.find('.course-counts').exists()).toBe(false);
    });

    it('shows unit and resource counts when both are provided', () => {
      wrapper = makeCourseWrapper({
        course: { ...baseCourse, unit_count: 3, lesson_count: 12 },
      });
      expect(wrapper.find('.course-counts').text()).toEqual('3 units · 12 lessons');
    });

    it('shows only unit count when lesson_count is 0', () => {
      wrapper = makeCourseWrapper({
        course: { ...baseCourse, unit_count: 1, lesson_count: 0 },
      });
      expect(wrapper.find('.course-counts').text()).toEqual('1 unit');
    });

    it('shows only resource count when unit_count is 0', () => {
      wrapper = makeCourseWrapper({
        course: { ...baseCourse, unit_count: 0, lesson_count: 5 },
      });
      expect(wrapper.find('.course-counts').text()).toEqual('5 lessons');
    });
  });

  describe('when rendering a lesson', () => {
    let wrapper;

    it('shows the classroom name', () => {
      wrapper = makeLessonWrapper();
      expect(wrapper.find('.collection-title').text()).toEqual('Test Classroom 1');
    });

    it('shows the lesson title', () => {
      wrapper = makeLessonWrapper();
      expect(wrapper.findComponent({ name: 'KCard' }).props().title).toEqual('Test Lesson 1');
    });

    it('shows the right link', () => {
      wrapper = makeLessonWrapper();
      const routerLink = wrapper.findComponent(RouterLinkStub);
      expect(routerLink.props().to).toEqual({ path: '/lesson' });
    });

    describe('progress section', () => {
      const assertProgressEquals = (w, expected) => {
        expect(w.find('.progress-section').text()).toEqual(expected);
      };

      const assertKIconIs = (w, expected) => {
        expect(w.findComponent({ name: 'KLabeledIcon' }).props().icon).toEqual(expected);
      };

      it('shows no label if there are no resources', () => {
        wrapper = makeLessonWrapper({ resources: [] });
        expect(wrapper.findComponent({ name: 'KLabeledIcon' }).exists()).toBe(false);
        assertProgressEquals(wrapper, '');
      });

      it('shows no label when the lesson has not been started', () => {
        // resources exist but none have progress in the map (all default to 0)
        wrapper = makeLessonWrapper({
          resources: [makeResource('content1'), makeResource('content2')],
        });
        expect(wrapper.findComponent({ name: 'KLabeledIcon' }).exists()).toBe(false);
        assertProgressEquals(wrapper, '');
      });

      it('shows a "In progress" label if still in progress', () => {
        useContentNodeProgress.mockImplementation(() =>
          useContentNodeProgressMock({
            contentNodeProgressMap: { content1: 0.5, content2: 0 },
          }),
        );
        wrapper = makeLessonWrapper({
          resources: [makeResource('content1'), makeResource('content2')],
        });
        assertProgressEquals(wrapper, 'In progress');
        assertKIconIs(wrapper, 'inProgress');
      });

      it('shows a "Completed" label if all resources are complete', () => {
        useContentNodeProgress.mockImplementation(() =>
          useContentNodeProgressMock({
            contentNodeProgressMap: { content1: 1, content2: 1 },
          }),
        );
        wrapper = makeLessonWrapper({
          resources: [makeResource('content1'), makeResource('content2')],
        });
        assertProgressEquals(wrapper, 'Completed');
        assertKIconIs(wrapper, 'mastered');
      });

      it('uses API-provided resource progress as fallback when not in the map', () => {
        // resource.progress from API is used when contentNodeProgressMap has no entry
        wrapper = makeLessonWrapper({
          resources: [makeResource('content1', 0.5), makeResource('content2', 0)],
        });
        assertProgressEquals(wrapper, 'In progress');
        assertKIconIs(wrapper, 'inProgress');
      });

      it('uses the higher of API progress and map progress', () => {
        // contentNodeProgressMap has a higher value than the stale API data
        useContentNodeProgress.mockImplementation(() =>
          useContentNodeProgressMock({
            contentNodeProgressMap: { content1: 1 },
          }),
        );
        wrapper = makeLessonWrapper({
          resources: [makeResource('content1', 0.5), makeResource('content2', 0)],
        });
        // content1: max(1, 0.5)=1, content2: max(0, 0)=0 → sum=1, total=2 → 1-2=-1 → in progress
        assertProgressEquals(wrapper, 'In progress');
        assertKIconIs(wrapper, 'inProgress');
      });
    });
  });

  describe('when rendering a quiz', () => {
    let wrapper;

    it('shows the classroom name', () => {
      wrapper = makeQuizWrapper();
      expect(wrapper.find('.collection-title').text()).toEqual('Test Classroom 1');
    });

    it('shows the quiz title', () => {
      wrapper = makeQuizWrapper();
      expect(wrapper.findComponent({ name: 'KCard' }).props().title).toEqual('Test Quiz 1');
    });

    it('shows the right link', () => {
      wrapper = makeQuizWrapper();
      const routerLink = wrapper.findComponent(RouterLinkStub);
      expect(routerLink.props().to).toEqual({ path: '/quiz' });
    });

    describe('progress section', () => {
      const assertProgressEquals = (w, expected) => {
        expect(w.find('.progress-section').text()).toEqual(expected);
      };

      const assertKIconIs = (w, expected) => {
        expect(w.findComponent({ name: 'KLabeledIcon' }).props().icon).toEqual(expected);
      };

      it('shows no label when the quiz has not been started', () => {
        wrapper = makeQuizWrapper({ progress: { started: false } });
        expect(wrapper.findComponent({ name: 'KLabeledIcon' }).exists()).toBe(false);
        assertProgressEquals(wrapper, '');
      });

      it('shows a "N questions left" label if still in progress', () => {
        wrapper = makeQuizWrapper({ progress: { started: true, answer_count: 5 } });
        // N = quiz.question_count - quiz.progress.answer_count
        assertProgressEquals(wrapper, '5 questions left');
        assertKIconIs(wrapper, 'inProgress');
      });

      it('shows a "Score P%" label if the quiz is submitted or closed', () => {
        wrapper = makeQuizWrapper({
          progress: { started: true, answer_count: 10, closed: true, score: 7 },
        });
        // P = 7/10 = 70%
        assertProgressEquals(wrapper, 'Score: 70%');
        assertKIconIs(wrapper, 'mastered');
      });
    });
  });
});
