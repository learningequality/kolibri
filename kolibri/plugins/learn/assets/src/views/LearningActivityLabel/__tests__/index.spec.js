import { shallowMount, mount } from '@vue/test-utils';

import { LearningActivities } from 'kolibri/constants';
import LearningActivityLabel from '../index';

jest.mock('kolibri/uiText/commonCoreStrings', () => {
  const translations = {
    all: 'All',
    watch: 'Watch',
    create: 'Create',
    read: 'Read',
    practice: 'Practice',
    reflect: 'Reflect',
    listen: 'Listen',
    explore: 'Explore',
  };
  return {
    coreStrings: {
      $tr: jest.fn(key => {
        return translations[key];
      }),
    },
  };
});

function makeWrapper(propsData) {
  return mount(LearningActivityLabel, { propsData });
}

function getLabel(wrapper) {
  return wrapper.find('[data-test="label"]');
}

describe(`LearningActivityLabel`, () => {
  it(`smoke test`, () => {
    const wrapper = shallowMount(LearningActivityLabel);
    expect(wrapper.exists()).toBe(true);
  });

  it.each(
    Object.values(LearningActivities).filter(activity => activity !== LearningActivities.TOPIC),
  )(`displays a correct label for '%s' activity`, activity => {
    const wrapper = makeWrapper({
      contentNode: {
        learning_activities: [activity],
      },
    });
    const activityToLabelMap = {
      [LearningActivities.CREATE]: 'Create',
      [LearningActivities.LISTEN]: 'Listen',
      [LearningActivities.REFLECT]: 'Reflect',
      [LearningActivities.PRACTICE]: 'Practice',
      [LearningActivities.READ]: 'Read',
      [LearningActivities.WATCH]: 'Watch',
      [LearningActivities.EXPLORE]: 'Explore',
    };
    expect(getLabel(wrapper).text()).toBe(activityToLabelMap[activity]);
  });

  it(`doesn't display a label for multiple activities`, () => {
    const wrapper = makeWrapper({
      contentNode: {
        learning_activities: [LearningActivities.WATCH, LearningActivities.EXPLORE],
      },
    });
    expect(getLabel(wrapper).text()).toBe('');
  });
});
