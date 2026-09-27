import { render, screen } from '@testing-library/vue';
import TopicsMobileHeader from '../TopicsPage/TopicsMobileHeader';

describe('TopicsMobileHeader', () => {
  it('renders a heading when the topic is null', () => {
    render(TopicsMobileHeader, { props: { topic: null } });

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
