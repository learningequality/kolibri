import { render } from '@testing-library/vue';
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

// KIcon is rendered role="presentation" (it's decorative; the chip's accessible
// content is its label), and the chip has no other ARIA role or label - the `.chip`
// class is the only reliable anchor to each rendered chip, real DOM order included.
function getChipTexts(container) {
  return Array.from(container.querySelectorAll('.chip')).map(chip => chip.textContent.trim());
}

describe('LessonContentCard', () => {
  it('renders one chip per learning activity, in order, for a resource with more than one', () => {
    const { container } = renderCard({
      learning_activities: [LearningActivities.WATCH, LearningActivities.EXPLORE],
    });

    expect(getChipTexts(container)).toEqual([
      coreString(LearningActivities.WATCH),
      coreString(LearningActivities.EXPLORE),
    ]);
  });

  it('renders exactly one chip for a resource with one learning activity', () => {
    const { container } = renderCard({ learning_activities: [LearningActivities.READ] });

    expect(getChipTexts(container)).toEqual([coreString(LearningActivities.READ)]);
  });

  it('renders no chip for a topic (non-leaf) node', () => {
    const { container } = renderCard({
      is_leaf: false,
      learning_activities: [LearningActivities.WATCH],
    });

    expect(container.querySelectorAll('.chip')).toHaveLength(0);
  });
});
