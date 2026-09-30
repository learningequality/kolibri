import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import LearningActivities from 'kolibri-constants/labels/LearningActivities';
import ManageSelectedResources from '../ManageSelectedResources.vue';
import { SelectionTarget } from '../../contants.js';

// Stub the icon so the test can assert on exactly what `kind` value the
// row passes down, without depending on real icon rendering.
jest.mock('kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue', () => ({
  name: 'LearningActivityIcon',
  props: ['kind'],
  render(h) {
    return h('span', {
      attrs: { 'data-testid': 'activity-icon', 'data-kind': JSON.stringify(this.kind) },
    });
  },
}));

const routes = [{ path: '/test', name: 'test' }];

function renderPage(selectedResourcesOverrides = []) {
  return render(ManageSelectedResources, {
    props: {
      selectedResources: [
        {
          id: 'resource-1',
          title: 'A resource',
          files: [],
          learning_activities: [],
          ...selectedResourcesOverrides,
        },
      ],
      target: SelectionTarget.LESSON,
      getResourceLink: () => ({ name: 'test' }),
    },
    routes,
  });
}

describe('ManageSelectedResources', () => {
  it('passes the full learning_activities array to LearningActivityIcon for a resource with more than one activity', () => {
    renderPage({ learning_activities: [LearningActivities.WATCH, LearningActivities.EXPLORE] });

    const icon = screen.getByTestId('activity-icon');
    expect(JSON.parse(icon.dataset.kind)).toEqual([
      LearningActivities.WATCH,
      LearningActivities.EXPLORE,
    ]);
  });

  it('passes a single-item array to LearningActivityIcon for a resource with one activity', () => {
    renderPage({ learning_activities: [LearningActivities.READ] });

    const icon = screen.getByTestId('activity-icon');
    expect(JSON.parse(icon.dataset.kind)).toEqual([LearningActivities.READ]);
  });
});
