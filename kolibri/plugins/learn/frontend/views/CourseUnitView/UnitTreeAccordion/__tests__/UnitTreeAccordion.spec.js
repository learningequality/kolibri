import { render, waitFor } from '@testing-library/vue';
import LearningActivities from 'kolibri-constants/labels/LearningActivities';
import Modalities from 'kolibri-constants/Modalities';
import UnitTreeAccordion from '../index.vue';

jest.mock('../../../../composables/useContentNodeProgress');
jest.mock('../../../../composables/useBookmarks');
jest.mock('../../useCourseContentProgressTracking');

const createResource = (id, overrides = {}) => ({
  id,
  title: `Resource ${id}`,
  parent: 'lesson-1',
  lft: 1,
  kind: 'video',
  content_id: `content-${id}`,
  duration: 100,
  available: true,
  learning_activities: [LearningActivities.WATCH],
  ...overrides,
});

const createLesson = (id, resources = []) => ({
  id,
  title: `Lesson ${id}`,
  modality: Modalities.LESSON,
  children: { results: resources },
});

const createUnitTree = (lessons = []) => ({
  id: 'unit-1',
  title: 'Unit 1',
  modality: Modalities.UNIT,
  options: {},
  children: { results: lessons },
});

function renderComponent(props = {}) {
  return render(UnitTreeAccordion, {
    props: {
      unitTree: createUnitTree([
        createLesson('lesson-1', [
          createResource('r1'),
          createResource('r2', { available: false }),
          createResource('r3'),
        ]),
      ]),
      currentLessonId: 'lesson-1',
      maxResourceLft: 999,
      ...props,
    },
  });
}

describe('UnitTreeAccordion', () => {
  describe('unavailable resources', () => {
    it('renders a missing-resource item with a warning icon for unavailable resources', async () => {
      const { container } = renderComponent();
      await waitFor(() => {
        expect(container.querySelector('.missing-resource')).not.toBeNull();
      });
      const missingItems = container.querySelectorAll('.missing-resource');
      expect(missingItems).toHaveLength(1);
      // Warning icon is present inside the missing resource item
      expect(missingItems[0].querySelector('svg')).not.toBeNull();
    });

    it('renders available resources as interactive tree items, not as missing', async () => {
      const { container } = renderComponent();
      await waitFor(() => {
        expect(container.querySelectorAll('.resource-item').length).toBeGreaterThan(0);
      });
      // 2 available resources render as normal tree items
      expect(container.querySelectorAll('.resource-item')).toHaveLength(2);
    });

    it('does not render an interactive tree item for the unavailable resource', async () => {
      const { container } = renderComponent();
      await waitFor(() => {
        expect(container.querySelectorAll('.resource-item').length).toBeGreaterThan(0);
      });
      // Total items in the resource list: 2 tree items + 1 missing item = 3
      const resourceList = container.querySelector('.resource-list');
      expect(resourceList.children).toHaveLength(3);
    });
  });
});
