import { mount, RouterLinkStub } from '@vue/test-utils';
import QuizCard from '../QuizCard';

const baseProgress = {
  started: false,
  closed: false,
  answer_count: 0,
  score: null,
};

function makeWrapper() {
  const wrapper = mount(QuizCard, {
    stubs: {
      RouterLink: RouterLinkStub,
    },
    propsData: {
      classroom: {
        name: 'Test Classroom 1',
      },
      quiz: {
        id: '395b68e7be06485cbe65ce159dac6859',
        title: 'Test Quiz 1',
        active: true,
        question_count: 10,
        progress: {
          ...baseProgress,
        },
      },
    },
  });
  return { wrapper };
}

describe('QuizCard', () => {
  let wrapper;

  const setProgress = newProgress => {
    wrapper.setData({ progress: { ...baseProgress, ...newProgress } });
    return wrapper.vm.$nextTick();
  };

  describe('basic labels', () => {
    it('shows the classroom name', () => {
      wrapper = makeWrapper().wrapper;
      expect(wrapper.find('.classroom-name').text()).toEqual('Test Classroom 1');
    });

    it('shows the quiz title', () => {
      wrapper = makeWrapper().wrapper;
      expect(wrapper.find('.assignment-name').text()).toEqual('Test Quiz 1');
    });
  });

  describe('links to exam report or viewer', () => {
    it('shows the quiz viewer if the quiz is still in progress', async () => {
      wrapper = makeWrapper().wrapper;
      await setProgress({ started: true });
      const routerLink = wrapper.findComponent(RouterLinkStub);
      expect(routerLink.props().to).toEqual({
        name: 'EXAM_VIEWER',
        params: {
          examId: '395b68e7be06485cbe65ce159dac6859',
          questionNumber: 0,
        },
      });
    });

    it('shows the quiz report if the quiz is submitted', async () => {
      wrapper = makeWrapper().wrapper;
      await setProgress({ started: true, closed: true });
      const routerLink = wrapper.findComponent(RouterLinkStub);
      expect(routerLink.props().to).toEqual({
        name: 'EXAM_REPORT_VIEWER',
        params: {
          examId: '395b68e7be06485cbe65ce159dac6859',
          questionNumber: 0,
          questionInteraction: 0,
        },
      });
    });
  });

  describe('progress section', () => {
    const assertProgressEquals = expected => {
      expect(wrapper.find('.progress').text()).toEqual(expected);
    };

    const assertKIconIs = expected => {
      expect(wrapper.findComponent({ name: 'KLabeledIcon' }).props().icon).toEqual(expected);
    };

    it('shows no label when the quiz has not been started', async () => {
      wrapper = makeWrapper().wrapper;
      await setProgress({ started: false });
      expect(wrapper.findComponent({ name: 'KLabeledIcon' }).exists()).toBe(false);
      assertProgressEquals('');
    });

    it('shows a "N questions left" label if still in progress', async () => {
      wrapper = makeWrapper().wrapper;
      await setProgress({ started: true, answer_count: 5 });
      // N = quiz.question_count - quiz.progress.answer_count
      assertProgressEquals('5 questions left');
      assertKIconIs('inProgress');
    });

    it('shows a "Score P%" label if the quiz is submitted or closed', async () => {
      wrapper = makeWrapper().wrapper;
      await setProgress({ started: true, answer_count: 10, closed: true, score: 7 });
      // P = 7/10 = 70%
      assertProgressEquals('Score: 70%');
      assertKIconIs('mastered');
    });
  });
});
