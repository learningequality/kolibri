import Vue from 'vue';
import { render } from '@testing-library/vue';
import '@testing-library/jest-dom';
import LearningActivities from 'kolibri-constants/labels/LearningActivities';
import ManageSelectedResources from '../ManageSelectedResources.vue';
import { SelectionTarget } from '../../contants.js';

// Stub only the design system's leaf KIcon (registered globally by KThemePlugin), so
// LearningActivityIcon's own array-vs-single-activity icon logic still runs for real -
// a test that mocked LearningActivityIcon itself would still pass if that logic broke.
Vue.component('KIcon', {
  props: ['icon'],
  render(h) {
    return h('span', { attrs: { 'data-icon': this.icon } });
  },
});

const routes = [{ path: '/test', name: 'test' }];

function renderPage(selectedResourceOverrides = {}) {
  return render(ManageSelectedResources, {
    props: {
      selectedResources: [
        {
          id: 'resource-1',
          title: 'A resource',
          files: [],
          learning_activities: [],
          ...selectedResourceOverrides,
        },
      ],
      target: SelectionTarget.LESSON,
      getResourceLink: () => ({ name: 'test' }),
    },
    routes,
  });
}

describe('ManageSelectedResources', () => {
  it('shows the "all activities" icon for a resource with more than one learning activity', () => {
    const { container } = renderPage({
      learning_activities: [LearningActivities.WATCH, LearningActivities.EXPLORE],
    });

    expect(container.querySelector('.icon-style').dataset.icon).toEqual('allActivities');
  });

  it('shows the single activity icon for a resource with one learning activity', () => {
    const { container } = renderPage({ learning_activities: [LearningActivities.WATCH] });

    expect(container.querySelector('.icon-style').dataset.icon).toEqual('watchSolid');
  });
});
