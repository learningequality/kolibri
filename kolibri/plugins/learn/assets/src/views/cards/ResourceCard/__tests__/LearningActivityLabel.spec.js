import { shallowMount, mount } from '@vue/test-utils';

import { LearningActivities } from 'kolibri.coreVue.vuex.constants';
import LearningActivityLabel from '../LearningActivityLabel';

function makeWrapper(propsData) {
  return mount(LearningActivityLabel, { propsData });
}

function getLabel(wrapper) {
  return wrapper.find('[data-test="label"]');
}

function getDuration(wrapper) {
  return wrapper.find('[data-test="duration"]');
}

describe(`LearningActivityLabel`, () => {
  it(`smoke test`, () => {
    const wrapper = shallowMount(LearningActivityLabel);
    expect(wrapper.exists()).toBe(true);
  });

  it.each(
    Object.values(LearningActivities).filter(activity => activity !== LearningActivities.TOPIC)
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

  it.each([LearningActivities.LISTEN, LearningActivities.WATCH])(
    `displays time duration for '%s' activity`,
    activity => {
      const wrapper = makeWrapper({
        contentNode: {
          duration: 322,
          learning_activities: [activity],
        },
      });
      expect(getDuration(wrapper).text()).toBe('5 minutes');
    }
  );

  it.each([
    LearningActivities.CREATE,
    LearningActivities.REFLECT,
    LearningActivities.PRACTICE,
    LearningActivities.EXPLORE,
  ])(
    `displays 'Short activity' as duration for '%s' activity
    when estimated time is less than 30 minutes`,
    activity => {
      const wrapper = makeWrapper({
        contentNode: {
          duration: 322,
          learning_activities: [activity],
        },
      });
      expect(getDuration(wrapper).text()).toBe('Short activity');
    }
  );

  it.each([
    LearningActivities.CREATE,
    LearningActivities.REFLECT,
    LearningActivities.PRACTICE,
    LearningActivities.EXPLORE,
  ])(
    `displays 'Long activity' as duration for '%s' activity
    when estimated time is more than 30 minutes`,
    activity => {
      const wrapper = makeWrapper({
        contentNode: {
          duration: 1800 + 322,
          learning_activities: [activity],
        },
      });
      expect(getDuration(wrapper).text()).toBe('Long activity');
    }
  );

  it(`displays 'Short activity' as duration for multiple activities
    when estimated time is less than 30 minutes`, () => {
    const wrapper = makeWrapper({
      contentNode: {
        duration: 322,
        learning_activities: [LearningActivities.WATCH, LearningActivities.EXPLORE],
      },
    });
    expect(getDuration(wrapper).text()).toBe('Short activity');
  });

  it(`displays 'Long activity' as duration for multiple activities
    when estimated time is more than 30 minutes`, () => {
    const wrapper = makeWrapper({
      contentNode: {
        duration: 1800 + 322,
        learning_activities: [LearningActivities.WATCH, LearningActivities.EXPLORE],
      },
    });
    expect(getDuration(wrapper).text()).toBe('Long activity');
  });

  it(`displays 'Reference' and no time duration for 'read' activity`, () => {
    const wrapper = makeWrapper({
      contentNode: {
        duration: 322,
        learning_activities: [LearningActivities.READ],
      },
    });
    expect(getDuration(wrapper).text()).toBe('Reference');
  });
});
