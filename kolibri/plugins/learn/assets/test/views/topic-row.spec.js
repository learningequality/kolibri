import { createLocalVue, shallowMount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import TopicRow from '../../src/views/TopicsPage/TopicRow';

const localVue = createLocalVue();
localVue.use(VueRouter);

const router = new VueRouter({
  routes: [
    {
      path: '/',
      name: 'TOPICS_TOPIC',
    },
  ],
});

describe('TopicRow', () => {
  it('displays a "more" button when the topic has more to show', () => {
    const wrapper = shallowMount(TopicRow, {
      propsData: {
        topic: {
          id: 'topic-id',
          title: 'topic-title',
          description: 'topic-description',
          showMore: true,
        },
      },
      router,
      localVue,
    });
    expect(wrapper.find('[data-test="more-button"]').exists()).toBe(true);
  });
});
