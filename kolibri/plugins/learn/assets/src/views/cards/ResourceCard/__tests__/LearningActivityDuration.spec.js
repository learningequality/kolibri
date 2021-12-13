import { shallowMount, mount } from '@vue/test-utils';

import { LearningActivities } from 'kolibri.coreVue.vuex.constants';
import LearningActivityDuration from '../LearningActivityDuration';

function makeWrapper(propsData) {
  return mount(LearningActivityDuration, { propsData });
}

describe(`LearningActivityDuration`, () => {
  it(`smoke test`, () => {
    const wrapper = shallowMount(LearningActivityDuration);
    expect(wrapper.exists()).toBe(true);
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
      expect(wrapper.text()).toBe('5 minutes');
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
      expect(wrapper.text()).toBe('Short activity');
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
      expect(wrapper.text()).toBe('Long activity');
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
    expect(wrapper.text()).toBe('Short activity');
  });

  it(`displays 'Long activity' as duration for multiple activities
    when estimated time is more than 30 minutes`, () => {
    const wrapper = makeWrapper({
      contentNode: {
        duration: 1800 + 322,
        learning_activities: [LearningActivities.WATCH, LearningActivities.EXPLORE],
      },
    });
    expect(wrapper.text()).toBe('Long activity');
  });

  it(`displays 'Reference' and no time duration for 'read' activity`, () => {
    const wrapper = makeWrapper({
      contentNode: {
        duration: 322,
        learning_activities: [LearningActivities.READ],
      },
    });
    expect(wrapper.text()).toBe('Reference');
  });
});
