import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import LearningActivities from 'kolibri-constants/labels/LearningActivities';
import LessonContentCard from '../index.vue';

// Stub the chip so the test can assert on exactly which `kind` values the
// card passes down, without depending on real translation strings or icons.
jest.mock('kolibri-common/components/ResourceDisplayAndSearch/LearningActivityChip.vue', () => ({
  name: 'LearningActivityChip',
  props: ['kind'],
  render(h) {
    return h('span', { attrs: { 'data-testid': 'activity-chip', 'data-kind': this.kind } });
  },
}));

const routes = [{ path: '/test', name: 'test' }];

function renderCard(contentOverrides = {}) {
  return render(LessonContentCard, {
    props: {
      content: {
        title: 'A resource',
        description: '',
        numCoachContents: 0,
        is_leaf: true,
        kind: 'video',
        thumbnail: null,
        learning_activities: [],
        ...contentOverrides,
      },
      link: { name: 'test' },
    },
    routes,
  });
}

describe('LessonContentCard', () => {
  it('renders one chip per learning activity for a resource with more than one', () => {
    renderCard({ learning_activities: [LearningActivities.WATCH, LearningActivities.EXPLORE] });

    const chips = screen.getAllByTestId('activity-chip');
    expect(chips).toHaveLength(2);
    expect(chips.map(chip => chip.dataset.kind)).toEqual([
      LearningActivities.WATCH,
      LearningActivities.EXPLORE,
    ]);
  });

  it('renders a single chip for a resource with one learning activity', () => {
    renderCard({ learning_activities: [LearningActivities.READ] });

    const chips = screen.getAllByTestId('activity-chip');
    expect(chips).toHaveLength(1);
    expect(chips[0].dataset.kind).toEqual(LearningActivities.READ);
  });

  it('renders no chip for a topic (non-leaf) node', () => {
    renderCard({ is_leaf: false, learning_activities: [LearningActivities.WATCH] });

    expect(screen.queryByTestId('activity-chip')).not.toBeInTheDocument();
  });
});
