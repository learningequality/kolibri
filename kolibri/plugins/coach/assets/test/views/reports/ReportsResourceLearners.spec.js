import { shallowMount, mount } from '@vue/test-utils';

import { STATUSES } from '../../../src/modules/classSummary/constants';
import ReportsResourceLearners from '../../../src/views/reports/ReportsResourceLearners';

const entries = [
  {
    id: 'd4b',
    name: 'learner1',
    username: 'learner1',
    groups: [{ id: 'dc2', name: 'group1' }, { id: '23s', name: 'group2' }],
    assignments: [{ id: 'dc2', name: 'group1' }, { id: '23s', name: 'group2' }],
    statusObj: {
      learner_id: 'd4b',
      content_id: 'a97',
      status: STATUSES.completed,
      last_activity: new Date('2019-05-04T07:00:00Z'),
      time_spent: 92.5,
    },
  },
  {
    id: 'a5d',
    name: 'learner2',
    username: 'learner2',
    groups: [{ id: '23s', name: 'group2' }],
    assignments: [{ id: '23s', name: 'group2' }],
    statusObj: {
      learner_id: 'a5d',
      content_id: 'a97',
      status: STATUSES.started,
      last_activity: new Date('2019-05-05T08:00:00Z'),
      time_spent: 17.14,
    },
  },
];

const initWrapper = propsData => {
  return mount(ReportsResourceLearners, {
    propsData,
  });
};

jest.mock('kolibri.utils.serverClock', () => {
  return {
    now: () => new Date('2019-05-05T11:00:00Z'),
  };
});

describe('ReportsResourceLearners', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(ReportsResourceLearners);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('renders all entries', () => {
    const wrapper = initWrapper({
      entries,
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it("doesn't render groups information when show groups set to false", () => {
    const wrapper = initWrapper({
      entries,
      showGroupsColumn: false,
    });

    expect(wrapper.html()).toMatchSnapshot();
  });
});
