import { mount, RouterLinkStub } from '@vue/test-utils';
import LessonCard from '../index';

const baseProgress = {
  resource_progress: 0,
  total_resources: 10,
};

function makeWrapper() {
  const wrapper = mount(LessonCard, {
    stubs: {
      RouterLink: RouterLinkStub,
    },
    propsData: {
      lesson: {
        id: '395b68e7be06485cbe65ce159dac6859',
        title: 'Test Lesson 1',
        progress: {
          ...baseProgress,
        },
      },
      collectionTitle: 'Test Classroom 1',
      to: { path: '/lesson' },
    },
  });
  return { wrapper };
}

describe('LessonCard', () => {
  let wrapper;

  const setProgress = newProgress => {
    wrapper.setData({ progress: { ...baseProgress, ...newProgress } });
    return wrapper.vm.$nextTick();
  };

  describe('basic labels', () => {
    it('shows the classroom name', () => {
      wrapper = makeWrapper().wrapper;
      expect(wrapper.find('[data-test="collectionTitle"]').text()).toEqual('Test Classroom 1');
    });

    it('shows the lesson title', () => {
      wrapper = makeWrapper().wrapper;
      expect(wrapper.find('.title').text()).toEqual('Test Lesson 1');
    });
  });

  describe('links to lesson playlist', () => {
    it('it shows the right link', () => {
      wrapper = makeWrapper().wrapper;
      const routerLink = wrapper.findComponent(RouterLinkStub);
      expect(routerLink.props().to).toEqual({ path: '/lesson' });
    });
  });

  describe('progress section', () => {
    const assertProgressEquals = expected => {
      expect(wrapper.find('.progress').text()).toEqual(expected);
    };

    const assertKIconIs = expected => {
      expect(wrapper.findComponent({ name: 'KLabeledIcon' }).props().icon).toEqual(expected);
    };

    it('shows no label if there are no resources', async () => {
      wrapper = makeWrapper().wrapper;
      await setProgress({ resource_progress: 10, total_resources: 0 });
      expect(wrapper.findComponent({ name: 'KLabeledIcon' }).exists()).toBe(false);
      assertProgressEquals('');
    });

    it('shows no label when the quiz has not been started', async () => {
      wrapper = makeWrapper().wrapper;
      await setProgress({ resource_progress: 0 });
      expect(wrapper.findComponent({ name: 'KLabeledIcon' }).exists()).toBe(false);
      assertProgressEquals('');
    });

    it('shows a "In progress" label if still in progress', async () => {
      wrapper = makeWrapper().wrapper;
      await setProgress({ resource_progress: 1 });
      assertProgressEquals('In progress');
      assertKIconIs('inProgress');
    });

    it('shows a "Completed" label if the all the resources are complete', async () => {
      wrapper = makeWrapper().wrapper;
      await setProgress({ resource_progress: 10 });
      assertProgressEquals('Completed');
      assertKIconIs('mastered');
    });
  });
});
