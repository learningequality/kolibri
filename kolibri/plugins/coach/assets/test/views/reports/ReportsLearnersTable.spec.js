import { shallowMount, mount, RouterLinkStub } from '@vue/test-utils';

import { STATUSES } from '../../../src/modules/classSummary/constants';
import ReportsLearnersTable from '../../../src/views/common/tables/ReportsLearnersTable';

const entries = [
  {
    id: 'd4b',
    name: 'learner1',
    username: 'learner1',
    groups: ['group1', 'group2'],
    assignments: [
      { id: 'dc2', name: 'group1' },
      { id: '23s', name: 'group2' },
    ],
    link: '#/2e3/reports/lessons/79b/exercises/a97/learners/d4b',
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
    groups: ['group2'],
    assignments: [{ id: '23s', name: 'group2' }],
    link: '#/2e3/reports/lessons/79b/exercises/a97/learners/a5d',
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
  return mount(ReportsLearnersTable, {
    propsData,
    stubs: {
      RouterLink: RouterLinkStub,
      transitionGroup: {
        name: 'transition-group',
        template: '<div><slot></slot></div>',
      },
    },
  });
};

const getCol = (row, colIndex) => {
  return row.findAll('td').at(colIndex);
};

jest.mock('kolibri/utils/serverClock', () => {
  return {
    now: () => new Date('2019-05-05T11:00:00Z'),
  };
});

describe('ReportsLearnersTable', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(ReportsLearnersTable);

    expect(wrapper.exists()).toBe(true);
  });

  it("doesn't render groups information when show groups set to false", () => {
    const wrapper = initWrapper({
      entries,
      showGroupsColumn: false,
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  describe('when an exercise has started', () => {
    let row;

    beforeAll(() => {
      const wrapper = initWrapper({
        entries: [
          {
            name: 'learner1',
            groups: [],
            link: '#/2e3/reports/lessons/79b/exercises/a97/learners/d4b',
            statusObj: {
              status: STATUSES.completed,
              last_activity: new Date('2019-05-05T08:13:22Z'),
              time_spent: 17.14,
            },
          },
        ],
      });

      row = wrapper.find('[data-test="entry"]');
    });

    it("renders learner's name as a link to an exercise", () => {
      const link = getCol(row, 0).find('[data-test="learner-link"]');

      expect(link.element).toBeTruthy();
      expect(link.props().to).toEqual('#/2e3/reports/lessons/79b/exercises/a97/learners/d4b');
    });

    it('renders time spent', () => {
      expect(getCol(row, 2).text()).not.toBe('—');
    });

    it('renders last activity time', () => {
      expect(getCol(row, 4).text()).not.toBe('—');
    });
  });

  describe('when an exercise has not yet started', () => {
    let row;

    beforeAll(() => {
      const wrapper = initWrapper({
        entries: [
          {
            name: 'learner1',
            groups: [],
            link: '#/2e3/reports/lessons/79b/exercises/a97/learners/d4b',
            statusObj: {
              status: STATUSES.notStarted,
              last_activity: new Date('2019-05-05T08:13:22Z'),
              time_spent: 17.14,
            },
          },
        ],
      });

      row = wrapper.find('[data-test="entry"]');
    });

    it("doesn't render learner's as a link", () => {
      expect(getCol(row, 0).find('[data-test="learner-link"]').element).toBeFalsy();
    });

    it("doesn't render time spent", () => {
      expect(getCol(row, 2).text()).toBe('—');
    });

    it("doesn't render last activity time", () => {
      expect(getCol(row, 4).text()).toBe('—');
    });
  });
});
