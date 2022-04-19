import { shallowMount } from '@vue/test-utils';
import TopicRow from '../../src/views/TopicsPage/TopicRow';

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
    });
    expect(wrapper.find('[data-test="more-button"]').exists()).toBe(true);
  });
});
