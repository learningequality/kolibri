import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import LearningActivities from 'kolibri-constants/labels/LearningActivities';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import LessonContentCard from '../index.vue';

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

    expect(screen.getByText(coreString(LearningActivities.WATCH))).toBeInTheDocument();
    expect(screen.getByText(coreString(LearningActivities.EXPLORE))).toBeInTheDocument();
  });

  it('renders a single chip for a resource with one learning activity', () => {
    renderCard({ learning_activities: [LearningActivities.READ] });

    expect(screen.getByText(coreString(LearningActivities.READ))).toBeInTheDocument();
    expect(screen.queryByText(coreString(LearningActivities.WATCH))).not.toBeInTheDocument();
  });

  it('renders no chip for a topic (non-leaf) node', () => {
    renderCard({ is_leaf: false, learning_activities: [LearningActivities.WATCH] });

    expect(screen.queryByText(coreString(LearningActivities.WATCH))).not.toBeInTheDocument();
  });
});
