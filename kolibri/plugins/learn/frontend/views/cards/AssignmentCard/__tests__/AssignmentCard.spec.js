import { mount, RouterLinkStub } from '@vue/test-utils';
import AssignmentCard from '../index.vue';

// --- Course test data ---
const baseCourse = {
  id: '395b68e7be06485cbe65ce159dac6859',
  title: 'Test Course 1',
};

// --- Lesson test data ---
const baseLesson = {
  id: '395b68e7be06485cbe65ce159dac6859',
  title: 'Test Lesson 1',
  progress: {
    resource_progress: 0,
    total_resources: 10,
  },
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
        progress: {
          ...baseLesson.progress,
          ...(lessonOverrides.progress || {}),
        },
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

    it('shows the course pill with icon and label', () => {
      wrapper = makeCourseWrapper();
      const pill = wrapper.find('.course-pill');
      expect(pill.exists()).toBe(true);

      const icon = pill.findComponent({ name: 'KIcon' });
      expect(icon.exists()).toBe(true);
      expect(icon.props().icon).toEqual('course');

      const label = pill.find('.pill-label');
      expect(label.exists()).toBe(true);
      expect(label.text()).toEqual('Course');
    });

    it('shows the right link', () => {
      wrapper = makeCourseWrapper();
      const routerLink = wrapper.findComponent(RouterLinkStub);
      expect(routerLink.props().to).toEqual({ path: '/course' });
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
        wrapper = makeLessonWrapper({ progress: { resource_progress: 10, total_resources: 0 } });
        expect(wrapper.findComponent({ name: 'KLabeledIcon' }).exists()).toBe(false);
        assertProgressEquals(wrapper, '');
      });

      it('shows no label when the lesson has not been started', () => {
        wrapper = makeLessonWrapper({ progress: { resource_progress: 0 } });
        expect(wrapper.findComponent({ name: 'KLabeledIcon' }).exists()).toBe(false);
        assertProgressEquals(wrapper, '');
      });

      it('shows a "In progress" label if still in progress', () => {
        wrapper = makeLessonWrapper({ progress: { resource_progress: 1 } });
        assertProgressEquals(wrapper, 'In progress');
        assertKIconIs(wrapper, 'inProgress');
      });

      it('shows a "Completed" label if all resources are complete', () => {
        wrapper = makeLessonWrapper({ progress: { resource_progress: 10 } });
        assertProgressEquals(wrapper, 'Completed');
        assertKIconIs(wrapper, 'mastered');
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
