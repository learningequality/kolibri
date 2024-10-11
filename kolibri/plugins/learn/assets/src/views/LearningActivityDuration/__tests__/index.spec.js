import { shallowMount, mount } from '@vue/test-utils';
import CompletionCriteria from 'kolibri-constants/CompletionCriteria';

import LearningActivityDuration from '../index';

jest.mock('kolibri/uiText/commonCoreStrings', () => {
  const translations = {
    readReference: 'Reference',
    shortActivity: 'Short activity',
    longActivity: 'Long activity',
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
  return mount(LearningActivityDuration, { propsData });
}

describe(`LearningActivityDuration`, () => {
  it(`smoke test`, () => {
    const wrapper = shallowMount(LearningActivityDuration);
    expect(wrapper.exists()).toBe(true);
  });

  it('displays time duration for exact time for audio/video resources', () => {
    const wrapper = makeWrapper({
      contentNode: {
        duration: 322,
        kind: 'audio',
        options: {
          completion_criteria: {
            model: CompletionCriteria.TIME,
          },
        },
      },
    });
    expect(wrapper.text()).toBe('5 minutes');
  });

  it('displays time duration as a short or long activity for non-audio/video resources with an exact time set', () => {
    const wrapper = makeWrapper({
      contentNode: {
        duration: 300,
        kind: 'document',
        options: {
          completion_criteria: {
            model: CompletionCriteria.TIME,
          },
        },
      },
    });
    expect(wrapper.text()).toBe('Short activity');
  });

  it(`displays 'Short activity' as duration for approximate time
    when estimated time is less than 30 minutes`, () => {
    const wrapper = makeWrapper({
      contentNode: {
        duration: 322,
        options: {
          completion_criteria: {
            model: CompletionCriteria.APPROX_TIME,
          },
        },
      },
    });
    expect(wrapper.text()).toBe('Short activity');
  });

  it(`displays 'Long activity' as duration for approximate time
    when estimated time is more than 30 minutes`, () => {
    const wrapper = makeWrapper({
      contentNode: {
        duration: 1800 + 322,
        options: {
          completion_criteria: {
            model: CompletionCriteria.APPROX_TIME,
          },
        },
      },
    });
    expect(wrapper.text()).toBe('Long activity');
  });

  it(`displays 'Reference' and no time duration for reference`, () => {
    const wrapper = makeWrapper({
      contentNode: {
        duration: 322,
        options: {
          completion_criteria: {
            model: CompletionCriteria.REFERENCE,
          },
        },
      },
    });
    expect(wrapper.text()).toBe('Reference');
  });
});
